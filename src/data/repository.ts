import { ConfigSchema, type CatalogPage, type Config } from '../domain/schema';
import { validatePage } from '../domain/integrity';
import { WithdrawalLedger } from '../domain/research';

export type ErrorCode = 'NOT_CONNECTED' | 'MISSING_CONFIG' | 'NOT_FOUND' | 'RATE_LIMITED' | 'TIMEOUT' | 'INVALID_DATA' | 'NETWORK_ERROR' | 'CANCELLED' | 'HTTP_ERROR';
export class ResearchError extends Error {
  constructor(public code: ErrorCode, public detail = '') { super(code); }
}
export interface ResearchRepository {
  list(cursor?: string | null, signal?: AbortSignal): Promise<CatalogPage>;
}
export class DisconnectedRepository implements ResearchRepository {
  async list(): Promise<CatalogPage> { throw new ResearchError('NOT_CONNECTED'); }
}
export class DemoRepository implements ResearchRepository {
  async list(_cursor?: string | null, signal?: AbortSignal): Promise<CatalogPage> {
    if (signal?.aborted) throw new ResearchError('CANCELLED');
    // Lazy import ensures demo-off never loads or falls back to fixtures.
    const { makeFixtures } = await import('./fixtures');
    return validatePage(await makeFixtures());
  }
}
export class HttpRepository implements ResearchRepository {
  constructor(private apiBase: string | null, private timeoutMs = 5000, private fetcher: typeof fetch = fetch) {}
  async list(cursor?: string | null, signal?: AbortSignal): Promise<CatalogPage> {
    if (!this.apiBase) throw new ResearchError('MISSING_CONFIG');
    let url: URL;
    try {
      url = new URL(this.apiBase);
      if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) || url.username || url.password || url.search || url.hash) throw new Error();
      url.pathname = url.pathname.replace(/\/$/, '') + '/v1/catalog';
      url.searchParams.set('limit', '50');
      if (cursor) {
        if (!/^[a-zA-Z0-9_-]{1,200}$/.test(cursor)) throw new Error();
        url.searchParams.set('cursor', cursor);
      }
    } catch { throw new ResearchError('INVALID_DATA', 'Deployment configuration'); }
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (signal?.aborted) cancel();
    signal?.addEventListener('abort', cancel, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.timeoutMs);
    try {
      const request = this.fetcher; // Native browser fetch must not receive this repository as its receiver.
      const response = await request(url, { method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal, headers: { Accept: 'application/json' } });
      if (response.status === 404) throw new ResearchError('NOT_FOUND');
      if (response.status === 429) throw new ResearchError('RATE_LIMITED');
      if (!response.ok) throw new ResearchError('HTTP_ERROR', String(response.status));
      let page: CatalogPage;
      try { page = await validatePage(await response.json()); }
      catch { if (controller.signal.aborted) throw new Error('aborted'); throw new ResearchError('INVALID_DATA'); }
      if (page.namespace !== 'RESEARCH_DATA') throw new ResearchError('INVALID_DATA', 'Demo isolation');
      return page;
    } catch (e) {
      if (timedOut) throw new ResearchError('TIMEOUT');
      if (signal?.aborted) throw new ResearchError('CANCELLED');
      if (e instanceof ResearchError) throw e;
      throw new ResearchError('NETWORK_ERROR');
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
}
export function createRepository(config: Config): ResearchRepository {
  if (config.mode === 'demo') return new DemoRepository();
  if (config.mode === 'http') return new HttpRepository(config.apiBase, config.timeoutMs);
  return new DisconnectedRepository();
}
export async function loadConfig(): Promise<Config> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetch(new URL('./config.json', document.baseURI), { credentials: 'omit', cache: 'no-store', signal: controller.signal });
    if (!r.ok) throw new ResearchError('MISSING_CONFIG');
    return ConfigSchema.parse(await r.json());
  } catch (e) { if (e instanceof ResearchError) throw e; throw new ResearchError(controller.signal.aborted ? 'TIMEOUT' : 'INVALID_DATA'); }
  finally { clearTimeout(timer); }
}
export class CatalogStore {
  page: CatalogPage | null = null;
  loading = false;
  error: ResearchError | null = null;
  private generation = 0;
  private controller?: AbortController;
  constructor(public repository: ResearchRepository, public ledger: WithdrawalLedger) {}
  async load(append = false): Promise<boolean> {
    const generation = ++this.generation;
    this.controller?.abort(); this.controller = new AbortController();
    const previous = append ? this.page : null;
    const cursor = previous?.nextCursor;
    this.loading = true; this.error = null;
    if (!append) this.page = null; // Never promote cached reports after an error or restart.
    try {
      const page = await this.repository.list(cursor, this.controller.signal);
      if (generation !== this.generation) return false;
      if (previous && (page.namespace !== previous.namespace || page.projects.some(b => previous.projects.some(p => p.project.projectId === b.project.projectId)))) throw new ResearchError('INVALID_DATA', 'Pagination identity collision');
      page.projects.forEach(b => this.ledger.ingest(b));
      this.page = previous ? { ...page, projects: [...previous.projects, ...page.projects] } : page;
      return true;
    } catch (e) {
      if (generation !== this.generation) return false;
      this.error = e instanceof ResearchError ? e : new ResearchError('INVALID_DATA');
      // Remove current data on failures, including pagination failures; fail closed.
      this.page = null;
      return false;
    } finally { if (generation === this.generation) this.loading = false; }
  }
  cancel() { this.generation++; this.controller?.abort(); this.page = null; this.loading = false; }
}
