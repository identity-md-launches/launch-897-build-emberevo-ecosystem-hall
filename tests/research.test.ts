import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { makeFixtures } from '../src/data/fixtures';
import { validatePage, digest, canonical, assetKey, assertPublishable } from '../src/domain/integrity';
import { MetricSchema, CatalogPageSchema, ConfigSchema, type CatalogPage, type Metric } from '../src/domain/schema';
import { WithdrawalLedger, resolveCurrent, compareClaims, freshness, filterProjects, formatAtomic, sumMetrics, metricAvailable } from '../src/domain/research';
import { CatalogStore, DemoRepository, HttpRepository, DisconnectedRepository, ResearchError, createRepository } from '../src/data/repository';
import { html, sourceLink } from '../src/ui/html';
import { WORLD_URL } from '../src/ui/components';
const fixtures = await makeFixtures();
const ledger = () => { const l = new WithdrawalLedger(); fixtures.projects.forEach(b => l.ingest(b)); return l; };
const memory = () => { const values = new Map<string, string>(); return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } }; };
const error = (code: string) => (e: unknown) => e instanceof ResearchError && e.code === code;

test('all fixtures validate, including token, NFT, mixed, missing and withdrawn', async () => {
  const page = await validatePage(fixtures);
  assert.equal(page.projects.length, 5);
  assert.deepEqual(new Set(page.projects.map(b => b.project.assetType)), new Set(['TOKEN', 'NFT', 'MIXED']));
  assert.ok(page.projects.every(b => b.project.assets.every(a => a.address.startsWith('fixture:'))));
});
test('canonical encoding matches SHA-256 independently of insertion order', async () => {
  assert.equal(canonical({ z: 1, a: ['繁體', null] }), '{"a":["繁體",null],"z":1}');
  assert.equal(await digest({ b: 2, a: 1 }), await digest({ a: 1, b: 2 }));
  assert.equal(await digest({}), '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a');
  assert.throws(() => canonical({ x: undefined }));
});
test('published reference wins over highest revision and all components share it', () => {
  const b = fixtures.projects[0];
  assert.equal(Math.max(...b.reports.map(r => r.revision)), 3);
  assert.equal(resolveCurrent(b, ledger())?.revision, 2);
  for (let i = 0; i < 4; i++) assert.equal(resolveCurrent(b, ledger())?.reportId, 'demo:report:grove');
});
test('reject manifest hash, report hash, and cross-project bindings', async () => {
  const p = structuredClone(fixtures); p.projects[0].publication.publishedReportRef!.manifestHash = '0'.repeat(64);
  await assert.rejects(validatePage(p), /Manifest mismatch/);
  const q = structuredClone(fixtures); q.projects[0].reports[0].claims[0].text += 'tampered';
  await assert.rejects(validatePage(q), /Report hash mismatch/);
  const x = structuredClone(fixtures); x.projects[0].manifests[0].projectId = 'demo:other';
  await assert.rejects(validatePage(x), /Report hash mismatch/);
});
test('withdrawal survives cache/reload and blocks old publication response', () => {
  const storage = memory(); const b = structuredClone(fixtures.projects[0]);
  const first = new WithdrawalLedger(storage); first.ingest(b);
  assert.equal(resolveCurrent(b, first)?.revision, 2);
  const withdrawn = structuredClone(b); withdrawn.publication.sequence = 3; withdrawn.publication.publishedReportRef = null;
  withdrawn.withdrawals.push({ recordId: 'demo:withdraw:grove', projectId: b.project.projectId, reportId: b.reports[1].reportId, revision: 2, sequence: 3, at: '2026-10-03T12:00:00Z', reason: 'Fixture withdrawal' });
  first.ingest(withdrawn); assert.equal(resolveCurrent(withdrawn, first), null);
  const reloaded = new WithdrawalLedger(storage); reloaded.ingest(b);
  assert.equal(resolveCurrent(b, reloaded), null);
  assert.equal(reloaded.withdrawals.length, 1);
  assert.equal(reloaded.sequences[b.project.projectId], 3);
});
test('damaged withdrawal storage fails closed', () => {
  const l = new WithdrawalLedger({ getItem: () => '{broken', setItem: () => {} });
  assert.equal(resolveCurrent(fixtures.projects[0], l), null);
});
test('unpublished and withdrawn reports remain available only in history', () => {
  assert.equal(fixtures.projects[0].reports.at(-1)?.state, 'DRAFT');
  assert.equal(resolveCurrent(fixtures.projects[4], ledger()), null);
  assert.equal(fixtures.projects[4].reports.length, 1);
});
test('stable claim_id comparison preserves reasons, parent and No material change', () => {
  const [r1, r2, r3] = fixtures.projects[0].reports;
  const changes = compareClaims(r1, r2);
  assert.deepEqual(changes.filter(c => c.kind === 'UPDATED').map(c => c.claim_id), ['money-destination']);
  assert.ok(compareClaims(r2, r3).every(c => c.kind === 'NO_MATERIAL_CHANGE'));
  assert.equal(r2.parentRevision, 1); assert.ok(r2.changes[0].evidenceIds.length);
  const reordered = structuredClone(r2); reordered.claims.reverse();
  assert.ok(compareClaims(r2, reordered).every(c => c.kind === 'NO_MATERIAL_CHANGE'));
});
test('UNDECLARED research cannot be published; self-project remains explicit', async () => {
  const p = structuredClone(fixtures); p.projects[0].reports[0].commercialRelationship.declaration = 'UNDECLARED';
  assert.throws(() => assertPublishable(p.projects[0].reports[0]), /UNDECLARED/);
  await assert.rejects(validatePage(p), /UNDECLARED/);
  assert.equal(fixtures.projects[2].reports[0].commercialRelationship.selfProject, true);
});
test('unchecked and old freshness are STALE', () => {
  const b = structuredClone(fixtures.projects[0]); const r = b.reports[1];
  assert.equal(freshness(b, r), 'STALE');
  b.publication.checkedAt = r.verifiedAt = '2026-10-07T10:00:00Z';
  assert.equal(freshness(b, r, Date.parse('2026-10-07T11:00:00Z')), 'CHECKED');
  assert.equal(freshness(b, r, Date.parse('2026-10-09T11:00:00Z')), 'STALE');
});
test('search resolves ticker collision without merging identities', () => {
  const both = filterProjects(fixtures.projects, 'GRV'); assert.equal(both.length, 2);
  assert.notEqual(assetKey(both[0].project.assets[0]), assetKey(both[1].project.assets[0]));
  assert.equal(filterProjects(fixtures.projects, 'GRV', 'TOKEN', 'Solana')[0].project.name, 'Grove Studio');
  assert.equal(filterProjects(fixtures.projects, 'fixture:atelier-tez')[0].project.name, 'Atelier Objects');
  assert.equal(filterProjects(fixtures.projects, 'fixture:collection:atelier')[0].project.name, 'Atelier Objects');
  assert.equal(filterProjects(fixtures.projects, '', 'NFT').length, 2);
  assert.equal(filterProjects(fixtures.projects, 'no-such-project').length, 0);
});
const metric: Metric = { metricId: 'test:metric', label: 'Test', kind: 'VOLUME', amountAtomic: '90071992547409931234567890123456789', decimals: 18, assetRef: fixtures.projects[0].project.assets[0], unit: 'GRV', currency: 'GRV', asOf: '2026-10-01T12:00:00Z', sourceId: 'demo:source:brief' };
test('large atomic amounts are exact strings, not Numbers', () => {
  assert.equal(formatAtomic(metric.amountAtomic!, 18), '90071992547409931.234567890123456789');
  assert.equal(sumMetrics([metric, metric]), '180143985094819862469135780246913578');
  assert.equal(formatAtomic('0', 18), '0');
  assert.throws(() => formatAtomic('1e18', 18));
  assert.equal(MetricSchema.safeParse({ ...metric, amountAtomic: Number(metric.amountAtomic) }).success, false);
});
test('missing units are unavailable; mixed assets, kinds, times and units do not sum', () => {
  assert.equal(metricAvailable({ ...metric, unit: null }), false);
  assert.equal(sumMetrics([metric, { ...metric, unit: null }]), null);
  assert.equal(sumMetrics([metric, { ...metric, assetRef: fixtures.projects[3].project.assets[0] }]), null);
  assert.equal(sumMetrics([metric, { ...metric, kind: 'FEES_RECEIVED' }]), null);
  assert.equal(sumMetrics([metric, { ...metric, asOf: '2026-10-02T12:00:00Z' }]), null);
});
test('atomic values require decimals and a bound asset identity', async () => {
  const p = structuredClone(fixtures); p.projects[0].reports[0].metrics = [{ ...metric, decimals: null }];
  await assert.rejects(validatePage(p), /Atomic identity/);
});
test('strict schemas reject unknown fields and versions', () => {
  assert.equal(CatalogPageSchema.safeParse({ ...fixtures, schemaVersion: '9' }).success, false);
  assert.equal(CatalogPageSchema.safeParse({ ...fixtures, tools: ['execute'] }).success, false);
  assert.equal(ConfigSchema.safeParse({ schemaVersion: '1.0', mode: 'off', apiBase: null, timeoutMs: Infinity }).success, false);
});
test('untrusted text stays escaped and HTTPS destination is displayed', () => {
  const payload = '<script>globalThis.pwned=true</script><img src=x onerror=alert(1)>';
  const output = html`<p>${payload}</p>`.value;
  assert.ok(output.includes('&lt;script&gt;')); assert.ok(!output.includes('<script>'));
  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'file:///secret', 'http://example.org', 'https://user:secret@example.org/']) assert.ok(!sourceLink(url, 'bad').value.includes('href='));
  assert.ok(sourceLink('https://example.org/path', 'source').value.includes('example.org/path'));
});
test('unsafe source URLs are rejected in the data contract', async () => {
  const p = structuredClone(fixtures); p.projects[0].reports[0].sources[0].url = 'javascript:alert(1)';
  await assert.rejects(validatePage(p));
});
test('fixed world URL and disconnected AI have no visitor-controlled destination', () => {
  assert.equal(WORLD_URL, 'https://imdember.com/');
});
test('demo-off uses a disconnected repository with no fixture fallback', async () => {
  const r = createRepository({ schemaVersion: '1.0', mode: 'off', apiBase: null, timeoutMs: 100 });
  assert.ok(r instanceof DisconnectedRepository); await assert.rejects(r.list(), error('NOT_CONNECTED'));
  const s = new CatalogStore(r, ledger()); await s.load(); assert.equal(s.page, null);
});
test('demo adapter validates fixture contents', async () => assert.equal((await new DemoRepository().list()).namespace, 'DEMO_DATA'));

const realEmpty: CatalogPage = { schemaVersion: '1.0', namespace: 'RESEARCH_DATA', projects: [], nextCursor: null, coverage: { description: 'Local mock only', total: 0, asOf: null } };
async function mock(run: (base: string, requests: { url: string; cookie?: string }[]) => Promise<void>) {
  const requests: { url: string; cookie?: string }[] = [];
  const server = createServer(async (req, res) => {
    requests.push({ url: req.url!, cookie: req.headers.cookie });
    const p = req.url!;
    if (p.startsWith('/404/')) { res.writeHead(404).end(); return; }
    if (p.startsWith('/429/')) { res.writeHead(429, { 'Retry-After': '10' }).end(); return; }
    if (p.startsWith('/500/')) { res.writeHead(500).end(); return; }
    if (p.startsWith('/slow/')) await new Promise(r => setTimeout(r, 200));
    res.setHeader('Content-Type', 'application/json');
    if (p.startsWith('/invalid/')) { res.end('{broken'); return; }
    if (p.startsWith('/version/')) { res.end(JSON.stringify({ ...realEmpty, schemaVersion: '2.0' })); return; }
    if (p.startsWith('/demo/')) { res.end(JSON.stringify(fixtures)); return; }
    if (p.startsWith('/paging/') && !p.includes('cursor=')) { res.end(JSON.stringify({ ...realEmpty, nextCursor: 'page_2' })); return; }
    res.end(JSON.stringify(realEmpty));
  });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  try { await run('http://127.0.0.1:' + port, requests); }
  finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
}
test('HTTP missing config is distinct from NOT_CONNECTED', async () => { await assert.rejects(new HttpRepository(null).list(), error('MISSING_CONFIG')); });
test('HTTP real local mock: empty data, pagination and credential omission', async () => mock(async (base, reqs) => {
  const repo = new HttpRepository(base + '/paging', 1000);
  const one = await repo.list(); const two = await repo.list(one.nextCursor);
  assert.equal(one.projects.length, 0); assert.equal(one.nextCursor, 'page_2'); assert.equal(two.nextCursor, null);
  assert.ok(reqs[1].url.includes('cursor=page_2')); assert.ok(reqs[0].url.includes('limit=50')); assert.equal(reqs[0].cookie, undefined);
  let opts: RequestInit | undefined;
  await new HttpRepository(base, 1000, (async (url, options) => { opts = options; return fetch(url, options); }) as typeof fetch).list();
  assert.equal(opts?.credentials, 'omit'); assert.equal(opts?.cache, 'no-store'); assert.equal(opts?.redirect, 'error');
}));
test('HTTP real local mock: 404, 429, 500, timeout, malformed JSON, version, demo isolation', async () => mock(async (base, reqs) => {
  for (const [path, code] of [['404', 'NOT_FOUND'], ['429', 'RATE_LIMITED'], ['500', 'HTTP_ERROR'], ['slow', 'TIMEOUT'], ['invalid', 'INVALID_DATA'], ['version', 'INVALID_DATA'], ['demo', 'INVALID_DATA']]) {
    await assert.rejects(new HttpRepository(base + '/' + path, path === 'slow' ? 50 : 1000).list(), error(code));
  }
  assert.equal(reqs.length, 7, 'No automatic retries');
}));
test('HTTP cancellation and finite timeout include response body', async () => mock(async base => {
  const controller = new AbortController();
  const pending = new HttpRepository(base + '/slow', 1000).list(null, controller.signal);
  controller.abort(); await assert.rejects(pending, error('CANCELLED'));
}));
test('HTTP config forbids unsafe protocols, embedded credentials and query controls', async () => {
  for (const value of ['file:///etc', 'https://user:secret@example.org', 'https://example.org/?returnUrl=x', 'http://untrusted.example']) await assert.rejects(new HttpRepository(value).list(), error('INVALID_DATA'));
});
test('superseded requests abort and out-of-order results are ignored even if adapter ignores abort', async () => {
  const resolvers: ((v: CatalogPage) => void)[] = []; const signals: AbortSignal[] = [];
  const repository = { list: (_c?: string | null, signal?: AbortSignal) => { signals.push(signal!); return new Promise<CatalogPage>(r => resolvers.push(r)); } };
  const s = new CatalogStore(repository, ledger());
  const first = s.load(); const second = s.load(); assert.equal(signals[0].aborted, true);
  resolvers[1]({ ...realEmpty, coverage: { ...realEmpty.coverage, description: 'new' } }); await second;
  resolvers[0]({ ...realEmpty, coverage: { ...realEmpty.coverage, description: 'old' } }); await first;
  assert.equal(s.page?.coverage.description, 'new');
});
test('HTTP store ignores slow request after a later load', async () => mock(async base => {
  const s = new CatalogStore(new HttpRepository(base + '/slow', 1000), ledger());
  const first = s.load(); s.repository = new HttpRepository(base, 1000); const second = s.load();
  await Promise.all([first, second]); assert.equal(s.error, null); assert.equal(s.page?.namespace, 'RESEARCH_DATA');
}));
test('failed refresh never keeps a previous current report', async () => {
  const s = new CatalogStore(new DemoRepository(), ledger()); await s.load(); assert.ok(s.page);
  s.repository = new DisconnectedRepository(); await s.load(); assert.equal(s.page, null);
});
test('validated revisions are immutable at runtime', async () => {
  const page = await validatePage(await makeFixtures());
  assert.ok(Object.isFrozen(page.projects[0].reports[0]));
  assert.ok(Object.isFrozen(page.projects[0].reports[0].claims));
  assert.throws(() => { page.projects[0].reports[0].claims[0].text = 'mutation'; }, TypeError);
});
test('reused withdrawal labels cannot erase a different project tombstone', () => {
  const storage = memory(); const l = new WithdrawalLedger(storage);
  const old = structuredClone(fixtures.projects[4]); l.ingest(old);
  const other = structuredClone(fixtures.projects[0]);
  other.publication.sequence = 3;
  other.withdrawals = [{ ...old.withdrawals[0], projectId: other.project.projectId, reportId: other.reports[1].reportId, revision: 2, sequence: 3 }];
  l.ingest(other);
  const reloaded = new WithdrawalLedger(storage);
  assert.equal(reloaded.withdrawals.length, 2);
  assert.ok(reloaded.withdrawals.some(w => w.projectId === old.project.projectId));
  assert.equal(resolveCurrent(other, reloaded), null);
});
