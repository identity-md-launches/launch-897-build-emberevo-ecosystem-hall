import { html, empty } from './html';
import type { Bundle, ReportRevision, Claim } from '../domain/schema';
import { freshness, projectStatus, resolveCurrent, type WithdrawalLedger } from '../domain/research';
export const WORLD_URL = 'https://imdember.com/';
export const statusLabels = { CURRENT: '現行報告', HISTORICAL: '歷史版本', RETRACTED: '已撤回', NEEDS_RECHECK: '待重新查證', MISSING: '尚無研究' };
export const evidenceLabels = { SUPPORTED: '有證據支持', PARTIAL: '部分支持', UNCONFIRMED: '尚未確認', RETRACTED: '主張已撤回' };
export const categoryLabels = { PURPOSE: '專案用途', MONEY_SOURCE: '錢從哪裡來', MONEY_DESTINATION: '錢往哪裡去', RIGHTS: '持有人有什麼權利', RULES: '誰能改變規則' };
export const date = (value: string | null | undefined) => value ? value.slice(0, 10).replaceAll('-', '.') : '尚未確認';
export const route = (id: string) => '#/project/' + encodeURIComponent(id);
export const historyRoute = (id: string) => '#/history/' + encodeURIComponent(id);
export const icon = (name: 'grid' | 'board' | 'clock' | 'search' | 'arrow') => {
  if (name === 'grid') return html`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>`;
  if (name === 'board') return html`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M7 12l3-3 4 3 3-5"/></svg>`;
  if (name === 'clock') return html`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
  if (name === 'search') return html`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>`;
  return html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>`;
};
export function badge(label: string, tone = '') { return html`<span class="badge ${tone}">${label}</span>`; }
export function emptyState(title: string, message: string, action = html`<a class="button" href="#/overview">返回研究總覽</a>`) {
  return html`<section class="empty-state"><span class="empty-glyph" aria-hidden="true">◇</span><h2>${title}</h2><p>${message}</p>${action}</section>`;
}
export function pointer(b: Bundle, ledger: WithdrawalLedger) {
  const r = resolveCurrent(b, ledger);
  return html`<span class="pointer" data-current-ref="${r ? r.reportId + '@' + r.revision : 'NONE'}">${r ? '現行指標 · R' + String(r.revision).padStart(2, '0') : '無現行報告'}${r ? html`<span class="dot-separator">/</span>${freshness(b, r)}` : empty}</span>`;
}
export function projectCard(b: Bundle, ledger: WithdrawalLedger, compact = false) {
  const p = b.project; const r = resolveCurrent(b, ledger); const status = projectStatus(b, ledger);
  const initials = p.name.split(' ').slice(0, 2).map(w => w[0]).join('');
  return html`<article class="project-card ${compact ? 'compact' : ''}" data-project-id="${p.projectId}">
    <div class="card-top"><span class="project-monogram type-${p.assetType}" aria-hidden="true">${initials}</span><span class="small-label">${p.category}</span><span class="card-number">${p.assetType}</span></div>
    <div class="card-name"><h3><a href="${route(p.projectId)}">${p.name}</a></h3>${badge(statusLabels[status], status === 'RETRACTED' ? 'orange' : status === 'MISSING' ? '' : 'teal')}</div>
    <p class="card-description">${p.subtitle}</p>
    <div class="asset-chips">${p.assets.map(a => html`<span><b>${a.symbol}</b><span class="chip-divider">/</span>${a.chain}</span>`)}</div>
    ${compact ? empty : html`<div class="card-insight"><span class="small-label">${r ? '本版關注' : status === 'RETRACTED' ? '撤回原因' : '研究缺口'}</span><p>${r ? r.reason : b.withdrawals[0]?.reason ?? '目前只有收錄資訊；尚未建立可用的研究報告。'}</p></div>`}
    <div class="card-bottom">${pointer(b, ledger)}<a class="card-action" href="${route(p.projectId)}" aria-label="${p.name}：${r ? '閱讀報告' : '查看紀錄'}">${r ? '閱讀報告' : '查看紀錄'} ${icon('arrow')}</a></div>
  </article>`;
}
export function claimCard(claim: Claim, index: number) {
  return html`<article class="claim-card"><div class="claim-head"><span class="claim-number">0${index}</span>${badge(evidenceLabels[claim.evidenceStatus], claim.evidenceStatus === 'UNCONFIRMED' ? 'orange' : 'teal')}</div><h3>${categoryLabels[claim.category]}</h3><p>${claim.text}</p><div class="claim-limit">${claim.limitation}</div><span class="mono small-label">claim_id: ${claim.claim_id}</span><p class="small-label">${claim.evidenceIds.length ? '證據：' + claim.evidenceIds.join(' · ') : '證據：尚無'}</p></article>`;
}
export function reportMeta(r: ReportRevision) {
  return html`<dl class="time-grid"><div><dt>發現時間</dt><dd>${date(r.discoveredAt)}</dd></div><div><dt>擷取時間</dt><dd>${date(r.retrievedAt)}</dd></div><div><dt>分析時間</dt><dd>${date(r.analyzedAt)}</dd></div><div><dt>驗證時間</dt><dd>${date(r.verifiedAt)}</dd></div></dl>`;
}
