import { z } from 'zod';
import { WithdrawalSchema, type Bundle, type Withdrawal, type ReportRevision, type Metric, type Status } from './schema';
import { assetKey, canonical } from './integrity';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const LedgerSchema = z.strictObject({ withdrawals: z.array(WithdrawalSchema), sequences: z.record(z.string(), z.number().int().nonnegative()) });
export class WithdrawalLedger {
  withdrawals: Withdrawal[] = [];
  sequences: Record<string, number> = {};
  damaged = false;
  constructor(private storage?: StorageLike, private key = 'emberevo:withdrawals:v1:demo') {
    try { const cached = storage?.getItem(key); if (cached) Object.assign(this, LedgerSchema.parse(JSON.parse(cached))); }
    catch { this.damaged = true; }
  }
  ingest(b: Bundle) {
    const key = (w: Withdrawal) => JSON.stringify([w.projectId, w.reportId, w.revision, w.recordId]);
    const map = new Map(this.withdrawals.map(w => [key(w), w]));
    b.withdrawals.forEach(w => map.set(key(w), w));
    this.withdrawals = [...map.values()];
    this.sequences[b.project.projectId] = Math.max(this.sequences[b.project.projectId] ?? 0, b.publication.sequence);
    try { this.storage?.setItem(this.key, JSON.stringify({ withdrawals: this.withdrawals, sequences: this.sequences })); }
    catch { this.damaged = true; }
  }
  blocks(b: Bundle, r: ReportRevision) {
    return this.damaged || b.publication.sequence < (this.sequences[b.project.projectId] ?? 0) || this.withdrawals.some(w => w.projectId === r.projectId && w.reportId === r.reportId && w.revision === r.revision);
  }
}
export function resolveCurrent(b: Bundle, ledger: WithdrawalLedger): ReportRevision | null {
  const ref = b.publication.publishedReportRef;
  if (!ref) return null;
  const report = b.reports.find(r => r.reportId === ref.reportId && r.revision === ref.revision && r.state === 'PUBLISHED');
  return report && !ledger.blocks(b, report) ? report : null;
}
export function freshness(b: Bundle, r: ReportRevision | null, now = Date.now()): 'STALE' | 'CHECKED' {
  const dates = [b.publication.checkedAt, r?.verifiedAt];
  return dates.every(t => t && now - Date.parse(t) >= 0 && now - Date.parse(t) < 86400000) ? 'CHECKED' : 'STALE';
}
export function projectStatus(b: Bundle, ledger: WithdrawalLedger): Status {
  const r = resolveCurrent(b, ledger);
  if (r) return freshness(b, r) === 'STALE' ? 'NEEDS_RECHECK' : 'CURRENT';
  if (ledger.withdrawals.some(w => w.projectId === b.project.projectId)) return 'RETRACTED';
  return 'MISSING';
}
export function compareClaims(before: ReportRevision, after: ReportRevision) {
  const ids = new Set([...before.claims, ...after.claims].map(c => c.claim_id));
  return [...ids].map(claim_id => {
    const from = before.claims.find(c => c.claim_id === claim_id) ?? null;
    const to = after.claims.find(c => c.claim_id === claim_id) ?? null;
    return { claim_id, from, to, kind: !from ? 'ADDED' : !to ? 'REMOVED' : canonical(from) === canonical(to) ? 'NO_MATERIAL_CHANGE' : 'UPDATED' };
  });
}
export function metricAvailable(m: Metric): boolean {
  return m.amountAtomic !== null && m.decimals !== null && m.assetRef !== null && m.decimals === m.assetRef.decimals && m.unit !== null && m.currency !== null && m.asOf !== null && m.sourceId !== null;
}
export function formatAtomic(amount: string, decimals: number): string {
  if (!/^(0|[1-9][0-9]*)$/.test(amount) || !Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error('Invalid atomic value');
  const padded = amount.padStart(decimals + 1, '0');
  if (!decimals) return padded;
  const fraction = padded.slice(-decimals).replace(/0+$/, '');
  return padded.slice(0, -decimals) + (fraction ? '.' + fraction : '');
}
export function sumMetrics(metrics: Metric[]): string | null {
  if (!metrics.length || metrics.some(m => !metricAvailable(m))) return null;
  const a = metrics[0];
  if (metrics.some(m => assetKey(m.assetRef!) !== assetKey(a.assetRef!) || m.unit !== a.unit || m.currency !== a.currency || m.decimals !== a.decimals || m.kind !== a.kind || m.asOf !== a.asOf)) return null;
  return metrics.reduce((sum, m) => sum + BigInt(m.amountAtomic!), 0n).toString();
}
export function filterProjects(bundles: Bundle[], query: string, kind = 'ALL', network = 'ALL') {
  const q = query.trim().toLocaleLowerCase();
  return bundles.filter(b => (kind === 'ALL' || b.project.assetType === kind) && (network === 'ALL' || b.project.assets.some(a => a.chain === network || a.network === network)) && [b.project.name, b.project.projectId, ...b.project.assets.flatMap(a => [a.symbol, a.chain, a.network, a.address, a.collection ?? '', a.tokenId ?? ''])].some(s => s.toLocaleLowerCase().includes(q)));
}
