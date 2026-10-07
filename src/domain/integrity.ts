import { CatalogPageSchema, type CatalogPage, type Bundle, type ReportRevision } from './schema';

// Canonical JSON v1: recursively sorted UTF-16 keys, JSON string escaping, no whitespace,
// no Unicode normalization. UTF-8 bytes, SHA-256, lowercase hex. Arrays retain order.
export function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical((value as Record<string, unknown>)[k])).join(',') + '}';
  throw new Error('Non-canonical value');
}
export async function digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(value));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
export function assetKey(a: Bundle['project']['assets'][number]): string {
  return JSON.stringify([a.chain, a.network, a.address, a.collection, a.tokenId]);
}
function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error('Duplicate ' + label);
}
export function assertPublishable(r: ReportRevision) {
  if (r.commercialRelationship.declaration === 'UNDECLARED') throw new Error('UNDECLARED');
  if (r.approval === 'NONE') throw new Error('Approval declaration missing');
}
export async function validatePage(raw: unknown): Promise<CatalogPage> {
  const page = CatalogPageSchema.parse(raw);
  unique(page.projects.map(b => b.project.projectId), 'projectId');
  for (const b of page.projects) {
    unique(b.project.assets.map(assetKey), 'asset identity');
    unique(b.project.assets.map(a => a.assetId), 'assetId');
    unique(b.reports.map(r => r.reportId + ':' + r.revision), 'revision');
    unique(b.manifests.map(m => m.reportId + ':' + m.revision), 'manifest');
    unique(b.withdrawals.map(w => w.recordId), 'withdrawal');
    const kinds = new Set(b.project.assets.map(a => a.kind));
    if ((b.project.assetType === 'MIXED' && kinds.size !== 2) || (b.project.assetType !== 'MIXED' && (kinds.size !== 1 || !kinds.has(b.project.assetType)))) throw new Error('Asset type mismatch');
    if (page.namespace === 'DEMO_DATA' && (!b.project.projectId.startsWith('demo:') || b.project.assets.some(a => !a.address.startsWith('fixture:') || !a.network.startsWith('fixture:')))) throw new Error('Demo namespace');
    for (const r of b.reports) {
      if (r.projectId !== b.project.projectId) throw new Error('Project binding mismatch');
      if (r.parentRevision !== null && (r.parentRevision >= r.revision || !b.reports.some(p => p.reportId === r.reportId && p.revision === r.parentRevision))) throw new Error('Missing parent');
      if (r.state === 'PUBLISHED') assertPublishable(r);
      unique(r.claims.map(c => c.claim_id), 'claim_id');
      unique(r.evidence.map(e => e.evidenceId), 'evidenceId');
      unique(r.sources.map(s => s.sourceId), 'sourceId');
      for (const s of r.sources) { const u = new URL(s.url); if (u.username || u.password) throw new Error('Source credentials'); }
      for (const c of [...r.claims, ...r.changes]) if (c.evidenceIds.some(id => !r.evidence.some(e => e.evidenceId === id))) throw new Error('Evidence reference');
      for (const e of r.evidence) if (!r.sources.some(s => s.sourceId === e.sourceId)) throw new Error('Source reference');
      for (const m of r.metrics) {
        if (m.amountAtomic !== null && (m.decimals === null || m.assetRef === null || m.decimals !== m.assetRef.decimals)) throw new Error('Atomic identity/decimals');
        if (m.assetRef && !b.project.assets.some(a => a.assetId === m.assetRef!.assetId && canonical(a) === canonical(m.assetRef))) throw new Error('Metric identity mismatch');
        if (m.sourceId !== null && !r.sources.some(s => s.sourceId === m.sourceId)) throw new Error('Metric source');
      }
      const manifest = b.manifests.find(m => m.reportId === r.reportId && m.revision === r.revision);
      if (!manifest || manifest.projectId !== r.projectId || manifest.reportHash !== await digest(r)) throw new Error('Report hash mismatch');
    }
    if (b.manifests.length !== b.reports.length) throw new Error('Orphan manifest');
    for (const w of b.withdrawals) if (w.projectId !== b.project.projectId || w.sequence > b.publication.sequence || !b.reports.some(r => r.reportId === w.reportId && r.revision === w.revision)) throw new Error('Withdrawal binding');
    const ref = b.publication.publishedReportRef;
    if (ref) {
      const m = b.manifests.find(m => m.reportId === ref.reportId && m.revision === ref.revision);
      const r = b.reports.find(r => r.reportId === ref.reportId && r.revision === ref.revision);
      if (!m || !r || r.state !== 'PUBLISHED' || await digest(m) !== ref.manifestHash) throw new Error('Manifest mismatch');
    }
  }
  // Validated content becomes immutable; edits require a new revision and hash.
  function freeze(value: unknown): void {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze); Object.freeze(value);
    }
  }
  freeze(page);
  return page;
}
