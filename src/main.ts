import './style.css';
import { CatalogStore, createRepository, DisconnectedRepository, loadConfig, ResearchError } from './data/repository';
import { compareClaims, filterProjects, freshness, formatAtomic, metricAvailable, resolveCurrent, WithdrawalLedger } from './domain/research';
import type { Bundle, Config, ReportRevision } from './domain/schema';
import { html, empty, sourceLink, type Markup } from './ui/html';
import { badge, categoryLabels, claimCard, date, emptyState, historyRoute, icon, pointer, projectCard, reportMeta, route, WORLD_URL } from './ui/components';

const root = document.querySelector<HTMLDivElement>('#app')!;
const announcer = document.querySelector<HTMLDivElement>('#announcer')!;
let config: Config = { schemaVersion: '1.0', mode: 'off', apiBase: null, timeoutMs: 5000 };
let store = new CatalogStore(new DisconnectedRepository(), new WithdrawalLedger());
let configReady = false;
let configError: ResearchError | null = null;
let query = ''; let kind = 'ALL'; let chain = 'ALL'; let reading = false;
let beforeRevision = 1; let afterRevision = 2;
const pageNames: Record<string, string> = { overview: '研究總覽', board: '研究看板', project: '專案研究', history: '修訂歷史', about: '研究範圍' };
const errorCopy: Record<string, [string, string]> = {
  NOT_CONNECTED: ['資料尚未連線', '目前沒有讀取研究資料。可開啟示範資料探索介面；正式研究需要部署者連接唯讀資料服務。'],
  MISSING_CONFIG: ['缺少資料設定', '部署者尚未設定 API 位址或 config.json。請檢查部署設定，再重新載入。'],
  NOT_FOUND: ['找不到資料端點 · 404', '伺服器沒有提供此研究目錄。請部署者確認 /v1/catalog 路徑。'],
  RATE_LIMITED: ['請求受到限制 · 429', '資料服務暫時限制請求。請稍後手動重試；系統不會自動重複請求。'],
  TIMEOUT: ['讀取逾時', '資料服務未在期限內回應。可檢查網路後重試；目前不顯示快取研究。'],
  INVALID_DATA: ['資料驗證未通過', '資料格式、版本或雜湊不一致。這批資料不會顯示為研究；請部署者檢查來源。'],
  NETWORK_ERROR: ['無法連接資料服務', '請檢查網路或服務的跨來源設定，再手動重試。'],
  HTTP_ERROR: ['資料服務回應錯誤', '伺服器暫時無法提供內容。請稍後手動重試。'],
  CANCELLED: ['讀取已取消', '可重新載入研究資料。'],
};
function currentRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  let id = ''; try { id = decodeURIComponent(parts[1] ?? ''); } catch { /* invalid route gets empty state */ }
  return { page: parts[0] || 'overview', id };
}
function navLink(page: string, label: string, glyph: 'grid' | 'board' | 'clock') {
  const active = currentRoute().page === page || (page === 'overview' && currentRoute().page === 'project');
  return html`<a class="nav-link ${active ? 'active' : ''}" href="#/${page}" aria-current="${active ? 'page' : 'false'}">${icon(glyph)}<span>${label}</span>${active ? html`<span class="nav-active-dot" aria-hidden="true"></span>` : empty}</a>`;
}
function shell(content: Markup) {
  const isDemo = configReady && config.mode === 'demo';
  root.innerHTML = html`<aside class="sidebar"><a class="wordmark" href="#/overview" aria-label="EmberEVO 首頁">Ember<span>EVO</span><small>ECOSYSTEM HALL</small></a><div class="sidebar-section-label">研究空間 <span>01</span></div><nav aria-label="主要導覽">${navLink('overview', '研究總覽', 'grid')}${navLink('board', '研究看板', 'board')}${navLink('history', '修訂歷史', 'clock')}</nav><a class="scope-link" href="#/about">研究方法與範圍 ↗</a><div class="sidebar-bottom"><div class="data-switch"><div><strong>示範資料</strong><span>${isDemo ? '已啟用 · 虛構專案' : '已停用'}</span></div><button type="button" id="toggle-demo" class="switch" role="switch" aria-checked="${isDemo}" aria-label="啟用示範資料"><span></span></button></div><a class="world-link" href="${WORLD_URL}">返回 Ember World ↗</a><p class="sidebar-note">E1 · Frontend demo<br>文字品牌標示 · Logo 整合待完成</p></div></aside>
  <div class="workspace"><header class="topbar"><span>ECOSYSTEM HALL <span class="topbar-slash">/</span> <b>CRYPTO RESEARCH</b></span><span class="environment-label"><span class="status-dot"></span>${isDemo ? 'DEMO_DATA' : configReady && config.mode === 'http' ? 'READ_ONLY' : 'NOT_CONNECTED'}</span></header><main id="main" tabindex="-1">${content}</main><footer><span>EmberEVO <span class="footer-divider">/</span> 把主張、證據與未知分開。</span><span>${isDemo ? 'DEMO_DATA · 合成示範，非投資建議' : 'E1 · 唯讀前端'} <span class="footer-divider">·</span> 無交易功能</span><a class="footer-world" href="${WORLD_URL}">返回 Ember World ↗</a></footer></div>`.value;
  bindGlobal();
}
function pageHeader(eyebrow: string, title: string, description: string, action = empty) {
  return html`<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1><p class="page-description">${description}</p></div>${action}</div>`;
}
function demoNotice() {
  return html`<div class="notice"><span class="notice-mark" aria-hidden="true">i</span><p>${config.mode === 'demo' ? html`<strong>這是一座示範研究廳。</strong> 所有專案與證據均為虛構，沒有即時市場資料或 AI 研究服務。` : html`<strong>僅顯示已載入資料。</strong> 未完成新鮮度檢查的研究均標記 STALE；不提供市場全面搜尋。`}</p><a href="#/about">了解範圍 ↗</a></div>`;
}
function getErrorView() {
  const e = configError ?? store.error;
  if (!e) return empty;
  const [title, message] = errorCopy[e.code];
  return html`<div role="${e.code === 'NOT_CONNECTED' ? 'status' : 'alert'}">${emptyState(title, message, html`<button class="button primary" id="${e.code === 'NOT_CONNECTED' ? 'enable-demo' : 'reload'}">${e.code === 'NOT_CONNECTED' ? '探索示範資料' : '重新載入'}</button>`)}</div>`;
}
function dataContent(content: () => Markup) {
  if (!configReady || store.loading) return html`<div class="loading-state" role="status"><span class="loading-line"></span><h2>正在讀取研究目錄</h2><p>正在驗證資料格式與報告內容，完成後才會顯示。</p></div>`;
  if (configError || store.error) return getErrorView();
  if (!store.page?.projects.length) return emptyState('目前沒有收錄的專案', '資料服務回傳空目錄。可重新載入，或查看研究範圍。', html`<button id="reload" class="button">重新載入</button>`);
  return content();
}
function filters() {
  const networks = [...new Set(store.page?.projects.flatMap(b => b.project.assets.map(a => a.chain)) ?? [])];
  return html`<div class="filter-bar"><div class="search-field"><label for="project-search">搜尋已載入專案</label><div>${icon('search')}<input id="project-search" type="search" name="search" autocomplete="off" value="${query}" placeholder="名稱、代號、網路或地址" /></div></div><div class="select-field"><label for="asset-filter">資產類型</label><select id="asset-filter">${[['ALL', '所有類型'], ['TOKEN', '代幣 Token'], ['NFT', '收藏 NFT'], ['MIXED', '混合資產']].map(([v, t]) => v === kind ? html`<option value="${v}" selected>${t}</option>` : html`<option value="${v}">${t}</option>`)}</select></div><div class="select-field"><label for="chain-filter">鏈 / 網路</label><select id="chain-filter"><option value="ALL">所有網路</option>${networks.map(n => n === chain ? html`<option selected>${n}</option>` : html`<option>${n}</option>`)}</select></div></div>`;
}
function results(compact = false) {
  const list = filterProjects(store.page?.projects ?? [], query, kind, chain);
  return html`<div class="result-meta"><span>${list.length} 個符合條件的專案</span><span>僅搜尋已載入 ${store.page?.projects.length ?? 0} 個紀錄</span></div>${list.length ? html`<div class="project-grid ${compact ? 'board-grid' : ''} ${reading ? 'reading' : ''}">${list.map(b => projectCard(b, store.ledger, compact && !reading))}</div>` : emptyState('沒有符合條件的專案', `在已載入資料中找不到「${query || '目前篩選條件'}」。試試其他名稱或清除篩選。`, html`<button id="clear-filters" class="button">清除篩選</button>`)}${store.page?.nextCursor ? html`<button id="load-more" class="button load-more">載入下一頁</button>` : empty}`;
}
function changeFeed() {
  const bundles = store.page?.projects ?? [];
  const updates = bundles.flatMap(b => { const r = resolveCurrent(b, store.ledger); return r && r.revision > 1 ? [{ b, r }] : []; });
  const withdrawn = store.ledger.withdrawals.filter(w => bundles.some(b => b.project.projectId === w.projectId));
  return html`<aside class="research-aside"><section class="side-panel"><div class="section-label"><h2>研究動態</h2><span class="small-label">REVISIONS</span></div>${updates.length || withdrawn.length ? html`<ol class="timeline">${updates.map(({ b, r }) => html`<li><span class="timeline-dot teal-dot"></span><p class="small-label">${date(r.analyzedAt)} · R${r.revision}</p><h3>${b.project.name}</h3><p>${r.reason}</p><a href="${historyRoute(b.project.projectId)}">比較修訂 →</a></li>`)}${withdrawn.map(w => html`<li><span class="timeline-dot orange-dot"></span><p class="small-label">${date(w.at)} · 已撤回</p><h3>${bundles.find(b => b.project.projectId === w.projectId)?.project.name}</h3><p>${w.reason}</p><a href="${historyRoute(w.projectId)}">查看撤回紀錄 →</a></li>`)}</ol>` : html`<p class="muted">已載入紀錄沒有實質變更。</p>`}</section><section class="scope-panel"><span class="eyebrow">COVERAGE, NOT CERTIFICATION</span><h2>看得見的，也有邊界。</h2><p>${store.page?.coverage.description}</p><ul><li>代幣、NFT 與非 AI 專案</li><li>收錄不代表背書或安全評分</li><li>缺少資料保留為未知</li></ul><a href="#/about">閱讀研究限制 ↗</a></section><div class="ai-panel"><span class="status-dot"></span><strong>AI 研究尚未連線</strong><p>目前可閱讀與比較已載入研究。新的分析需要後端服務。</p><button class="button quiet" disabled>建立新研究 · NOT_CONNECTED</button></div></aside>`;
}
function overview() {
  const bundles = store.page?.projects ?? [];
  const available = bundles.filter(b => resolveCurrent(b, store.ledger));
  return html`${pageHeader('EXPLORE WITH CONTEXT', '理解生態，從證據開始。', '發現值得研究的專案，追溯資金、權利與每一次重要變更。', html`<a class="button primary" href="#/board">開啟研究看板 ${icon('arrow')}</a>`)}${demoNotice()}${dataContent(() => html`<div class="stat-grid"><div><span>收錄專案</span><strong>${String(bundles.length).padStart(2, '0')}<small>${config.mode === 'demo' ? '個示範紀錄' : '個收錄紀錄'}</small></strong></div><div><span>可閱讀研究</span><strong>${String(available.length).padStart(2, '0')}<small>個現行指標</small></strong></div><div><span>實質修訂</span><strong>${String(available.filter(b => resolveCurrent(b, store.ledger)!.changes.some(c => c.kind === 'UPDATED')).length).padStart(2, '0')}<small>個已載入專案</small></strong></div><div><span>待確認範圍</span><strong class="stat-text">保持可見<small>沒有預設安全分數</small></strong></div></div><div class="overview-layout"><section class="index-section"><div class="section-label"><h2>研究索引</h2><span class="small-label">THE RESEARCH INDEX</span></div>${filters()}<div id="results">${results()}</div></section>${changeFeed()}</div>`)}`;
}
function board() {
  return html`${pageHeader('THE RESEARCH BOARD', '把研究放在同一張桌上。', '同一份資料、同一個現行指標。切換閱讀模式，保留完整脈絡。', html`<button class="button" id="reading-mode" aria-pressed="${reading}">${reading ? '切換看板模式' : '切換閱讀模式'}</button>`)}${demoNotice()}${dataContent(() => html`<section>${filters()}<div id="results">${results(true)}</div></section><section class="board-note"><h2>如何閱讀這張看板</h2><p>R 表示現行報告版本；STALE 表示新鮮度未確認。草稿與撤回內容只保留在歷史中。所有資料均來自共用的 ResearchRepository。</p></section>`)}`;
}
function reportDetails(b: Bundle, r: ReportRevision) {
  const disclosure = r.commercialRelationship;
  const disclosureLabels: Record<string, string> = { EDITORIAL: '編輯收錄', SELF_PROJECT: '自有專案', UNKNOWN: '未知', UNPAID: '無付費', PAID: '付費研究', NONE: '無', SPONSORED: '有贊助', RELATED: '有關係' };
  return html`<div class="report-intro"><div><span class="eyebrow">THE RESEARCH BRIEF</span><h2>做什麼、改變了什麼、還不知道什麼。</h2><p>${r.claims.find(c => c.category === 'PURPOSE')?.text ?? '專案用途尚待補充。'}</p></div><div class="report-quality">${badge('研究完整度 · ' + r.quality)}<p>證據狀態與研究完整度分開呈現。<br>沒有安全分數或認證。</p></div></div><section class="change-callout"><span class="small-label">本版變更 · R${r.revision}</span><p>${r.reason}</p><a href="${historyRoute(b.project.projectId)}">追溯修訂與證據 →</a></section><section class="four-questions" aria-label="四個核心問題">${r.claims.filter(c => c.category !== 'PURPOSE').map((c, i) => claimCard(c, i + 1))}</section><div class="detail-grid"><section class="detail-panel"><div class="section-label"><h2>證據與來源</h2><span class="small-label">EVIDENCE</span></div>${r.evidence.length ? r.evidence.map(e => { const s = r.sources.find(s => s.sourceId === e.sourceId)!; return html`<article class="evidence-entry"><span class="badge">${s.kind === 'SYNTHETIC' ? '合成來源 · DEMO_DATA' : '文件來源'}</span><blockquote>${e.excerpt}</blockquote><span class="mono small-label">${e.evidenceId}</span><p class="small-label">位置：${e.location}<br>來源發布：${date(s.publishedAt)} · 擷取：${date(s.retrievedAt)}</p>${sourceLink(s.url, s.label)}</article>`; }) : html`<p>尚無可用證據。</p>`}</section><section class="detail-panel"><div class="section-label"><h2>指標與缺口</h2><span class="small-label">NO ASSUMED VALUES</span></div><p class="muted">成交量與已收費用不同；估值、市值、NFT 底價、出價和成交價各自獨立。</p>${r.metrics.map(m => html`<div class="metric-row"><div><strong>${m.label}</strong><span class="small-label">${m.kind}</span></div><span>${metricAvailable(m) ? formatAtomic(m.amountAtomic!, m.decimals!) + ' ' + m.unit : '無可用資料'}</span></div>${metricAvailable(m) ? html`<p class="small-label">${m.assetRef!.chain} / ${m.assetRef!.address} · ${m.currency} · ${date(m.asOf)} · ${m.sourceId}</p>` : empty}`)}<p class="small-label">缺少數值、單位、資產、時間或來源時，不顯示為 0。</p></section></div><section class="detail-panel"><h2>資產身分與關係</h2><div class="asset-identity-list">${b.project.assets.map(a => html`<div><strong>${a.symbol} ${badge(a.kind)}</strong><p>${a.chain} / ${a.network}</p><code>${a.address}</code>${a.collection ? html`<p>Collection: <code>${a.collection}</code> · Token ID: ${a.tokenId ?? 'UNKNOWN'}</p>` : empty}</div>`)}</div>${b.project.relationships.map(t => html`<p class="muted">${t}</p>`)}</section><section class="detail-panel"><h2>研究時間與限制</h2>${reportMeta(r)}<ul class="limitations">${r.limitations.map(l => html`<li>${l}</li>`)}</ul></section><section class="detail-panel disclosure"><h2>商業關係披露</h2><div class="disclosure-grid">${[['收錄', disclosure.inclusion], ['研究', disclosure.research], ['贊助', disclosure.sponsorship], ['IMD 關係', disclosure.imdRelationship]].map(([label, v]) => html`<div><span>${label}</span><strong>${disclosureLabels[v]}</strong></div>`)}</div><p>${disclosure.details}</p>${disclosure.selfProject ? html`<p class="warning-text">自有專案研究不是獨立認證。</p>` : empty}</section><details class="integrity-panel"><summary>查看版本身分與內容雜湊</summary><dl><dt>reportId / revision</dt><dd><code>${r.reportId} / ${r.revision}</code></dd><dt>manifestHash</dt><dd><code>${b.publication.publishedReportRef?.manifestHash ?? '無現行指標'}</code></dd><dt>reportHash</dt><dd><code>${b.manifests.find(m => m.reportId === r.reportId && m.revision === r.revision)?.reportHash}</code></dd></dl><p>SHA-256 識別內容；不證明批准、安全性或研究品質。${r.approval === 'SYNTHETIC_DEMO' ? '本例批准為合成示範。' : '批准為發布者聲明。'}</p></details>`;
}
function project(id: string) {
  const b = store.page?.projects.find(b => b.project.projectId === id);
  return dataContent(() => {
    if (!b) return emptyState('找不到這個專案', '此專案不在已載入的研究目錄中。請回到總覽檢查目前涵蓋的資料。');
    const r = resolveCurrent(b, store.ledger);
    return html`<a class="back-link" href="#/overview">← 返回研究索引</a>${pageHeader(b.project.category, b.project.name, b.project.subtitle, html`<a class="button" href="${historyRoute(id)}">${icon('clock')} 查看修訂歷史</a>`)}${demoNotice()}<div class="project-status-bar">${pointer(b, store.ledger)}<span class="mono small-label">${b.project.projectId}</span></div>${r ? reportDetails(b, r) : html`${emptyState(b.withdrawals.length ? '報告已撤回' : '尚無現行研究', b.withdrawals[0]?.reason ?? '這個專案目前只有收錄資訊；尚未完成研究，無法提供結論。', html`<a class="button" href="${historyRoute(id)}">查看可用歷史</a>`)}<section class="detail-panel"><h2>收錄資訊</h2><p>${b.project.description}</p>${b.project.assets.map(a => html`<p>${a.symbol} / ${a.chain} / <code>${a.address}</code></p>`)}</section>`}`;
  });
}
function comparison(b: Bundle) {
  const before = b.reports.find(r => r.revision === beforeRevision) ?? b.reports[0];
  const after = b.reports.find(r => r.revision === afterRevision) ?? b.reports.at(-1);
  if (!before || !after) return emptyState('尚無可比較版本', '只有收錄紀錄，尚未建立研究修訂。');
  const rows = compareClaims(before, after);
  const changed = rows.filter(r => r.kind !== 'NO_MATERIAL_CHANGE').length;
  return html`<div class="compare-summary" role="status">${changed ? changed + ' 項主張有變更' : '無實質變更 · No material change'}<span>依穩定 claim_id 比對，不依顯示順序。</span></div><div class="comparison-list">${rows.map(row => html`<article class="comparison-row"><div class="comparison-label"><h3>${row.to ? categoryLabels[row.to.category] : row.from ? categoryLabels[row.from.category] : row.claim_id}</h3><span class="mono small-label">${row.claim_id}</span>${badge(row.kind === 'NO_MATERIAL_CHANGE' ? '無實質變更' : row.kind === 'UPDATED' ? '已更新' : row.kind === 'ADDED' ? '新增' : '移除', row.kind === 'UPDATED' ? 'teal' : '')}</div><div><span class="small-label">R${before.revision} · 比較起點</span><p>${row.from?.text ?? '此版本無此主張'}</p><span class="small-label">證據：${row.from?.evidenceIds.join(' · ') || '尚無'}</span></div><div class="comparison-after"><span class="small-label">R${after.revision} · 比較終點</span><p>${row.to?.text ?? '此版本已移除'}</p><span class="small-label">證據：${row.to?.evidenceIds.join(' · ') || '尚無'}</span></div></article>`)}</div>`;
}
function history(id: string) {
  return html`${pageHeader('A RECORD OF WHAT CHANGED', '研究會改變，脈絡應該留下。', '保留版本、理由與證據。比較每一項主張，也看見沒有改變的部分。')}${demoNotice()}${dataContent(() => {
    const b = store.page!.projects.find(b => b.project.projectId === id);
    if (!b) return html`<section class="history-index"><h2>選擇專案，查看修訂</h2>${store.page!.projects.map(b => html`<a class="history-project" href="${historyRoute(b.project.projectId)}"><span><strong>${b.project.name}</strong><small>${b.reports.length} 個保留版本 · ${b.project.assets.map(a => a.chain).join(' / ')}</small></span>${pointer(b, store.ledger)}${icon('arrow')}</a>`)}</section>`;
    const current = resolveCurrent(b, store.ledger);
    if (!b.reports.some(r => r.revision === beforeRevision)) beforeRevision = b.reports[0]?.revision ?? 1;
    if (!b.reports.some(r => r.revision === afterRevision)) afterRevision = b.reports.at(-1)?.revision ?? 1;
    const withdrawals = store.ledger.withdrawals.filter(w => w.projectId === id);
    return html`<div class="section-label"><h2>${b.project.name}</h2><a href="${route(id)}">返回專案 →</a></div><div class="project-status-bar">${pointer(b, store.ledger)}<span class="small-label">現行、歷史、草稿與撤回分開標示</span></div>${withdrawals.map(w => html`<div class="withdrawal-record"><strong>已撤回 · R${w.revision}</strong><span>${date(w.at)}</span><p>${w.reason}</p><code>${w.recordId}</code></div>`)}${b.reports.length ? html`<div class="revision-list">${b.reports.map(r => html`<article><span class="revision-number">R${String(r.revision).padStart(2, '0')}</span><div><strong>${current === r ? '現行指標 · ' + (freshness(b, r) === 'STALE' ? '待重新查證' : '新鮮度已檢查') : withdrawals.some(w => w.reportId === r.reportId && w.revision === r.revision) || r.state === 'RETRACTED' ? '已撤回 · 僅供歷史查閱' : r.state === 'DRAFT' ? '未發布草稿 · 歷史保留' : '歷史版本'}</strong><p>${r.reason}</p><span class="small-label">Parent: ${r.parentRevision === null ? '無' : 'R' + r.parentRevision} · 分析：${date(r.analyzedAt)} · ${r.state}</span><details><summary>查看修訂理由、證據與主張</summary>${r.changes.map(c => html`<p>${c.kind} · ${c.reason}<br><span class="mono small-label">${c.claim_id ?? '報告整體'} · ${c.evidenceIds.join(', ') || '無新增證據'}</span></p>`)}${r.claims.map(c => html`<p><strong>${categoryLabels[c.category]}</strong> — ${c.text}</p>`)}${r.evidence.map(e => html`<blockquote>${e.excerpt}<br><span class="mono small-label">${e.evidenceId} → ${e.sourceId}</span></blockquote>`)}${r.sources.map(s => sourceLink(s.url, s.label))}</details></div></article>`)}</div><section class="compare-section"><h2>逐項比較</h2><div class="compare-controls"><div class="compare-field"><label for="before-revision">比較起點</label><select id="before-revision">${b.reports.map(r => r.revision === beforeRevision ? html`<option value="${r.revision}" selected>R${r.revision} · ${r.state}</option>` : html`<option value="${r.revision}">R${r.revision} · ${r.state}</option>`)}</select></div><span aria-hidden="true">→</span><div class="compare-field"><label for="after-revision">比較終點</label><select id="after-revision">${b.reports.map(r => r.revision === afterRevision ? html`<option value="${r.revision}" selected>R${r.revision} · ${r.state}</option>` : html`<option value="${r.revision}">R${r.revision} · ${r.state}</option>`)}</select></div></div><div id="comparison">${comparison(b)}</div></section>` : emptyState('尚無研究修訂', '此專案僅有收錄紀錄，沒有研究內容可比較。')}`;
  })}`;
}
function about() {
  return html`${pageHeader('METHOD & BOUNDARIES', '知道什麼，也說清楚不知道什麼。', 'EmberEVO Ecosystem Hall 是研究內容的閱讀介面。E1 交付範圍是前端與證據呈現。')}${demoNotice()}<div class="about-grid"><section class="detail-panel"><h2>01 / 目前可以做的事</h2><p>瀏覽代幣與 NFT 專案、搜尋已載入紀錄、閱讀資金與權利說明、比較修訂與查看撤回原因。</p><p>DEMO_DATA 是明確隔離的虛構資料。即使顯示「部分支持」，也不代表真實專案已被驗證。</p></section><section class="detail-panel"><h2>02 / 研究的邊界</h2><p>沒有市場全量資料、價格預測、安全評分或獨立認證。缺少資料一律保留為 null / UNKNOWN；未檢查新鮮度為 STALE。</p><p>雜湊只驗證內容一致性。合成批准不等同正式研究核准。</p></section><section class="detail-panel"><h2>03 / 未連接的服務</h2><p>E2 即時研究、AI 分析與發布後端，以及 E3 持續監測，均尚未連接。沒有送出研究請求、排程或訂閱。</p><button class="button" disabled>建立新研究 · NOT_CONNECTED</button></section><section class="detail-panel"><h2>04 / World 整合範圍</h2><p>返回世界只連至 imdember.com 首頁。角色與鏡頭還原、Genesis PEPE 與 Dream Hall 整合待 Codex 接續。</p><p>目前沒有錢包、登入、持有權、鑄造、交易、付款或 NFT 權益功能。</p><a href="${WORLD_URL}">返回 Ember World ↗</a></section></div>`;
}
function render(focus = false) {
  const r = currentRoute();
  document.title = `${pageNames[r.page] ?? '找不到頁面'} — EmberEVO`;
  const content = r.page === 'overview' ? overview() : r.page === 'board' ? board() : r.page === 'project' ? project(r.id) : r.page === 'history' ? history(r.id) : r.page === 'about' ? about() : emptyState('找不到這個頁面', '請透過研究總覽繼續瀏覽。');
  shell(content);
  if (focus) { document.querySelector<HTMLElement>('h1')?.focus(); window.scrollTo(0, 0); }
}
function bindGlobal() {
  document.querySelector('#toggle-demo')?.addEventListener('click', () => switchMode(config.mode === 'demo' ? 'off' : 'demo'));
  document.querySelector('#enable-demo')?.addEventListener('click', () => switchMode('demo'));
  document.querySelector('#reload')?.addEventListener('click', () => configError ? start() : reload());
  document.querySelector('#reading-mode')?.addEventListener('click', () => { reading = !reading; render(); document.querySelector<HTMLElement>('#reading-mode')?.focus(); });
  document.querySelector<HTMLInputElement>('#project-search')?.addEventListener('input', e => { query = (e.target as HTMLInputElement).value; updateResults(); });
  document.querySelector<HTMLSelectElement>('#asset-filter')?.addEventListener('change', e => { kind = (e.target as HTMLSelectElement).value; updateResults(); });
  document.querySelector<HTMLSelectElement>('#chain-filter')?.addEventListener('change', e => { chain = (e.target as HTMLSelectElement).value; updateResults(); });
  for (const field of ['before', 'after']) document.querySelector('#' + field + '-revision')?.addEventListener('change', e => {
    if (field === 'before') beforeRevision = Number((e.target as HTMLSelectElement).value); else afterRevision = Number((e.target as HTMLSelectElement).value);
    const b = store.page?.projects.find(b => b.project.projectId === currentRoute().id);
    if (b) document.querySelector('#comparison')!.innerHTML = comparison(b).value;
  });
  bindResultActions();
}
function bindResultActions() {
  document.querySelector('#clear-filters')?.addEventListener('click', () => { query = ''; kind = 'ALL'; chain = 'ALL'; render(); document.querySelector<HTMLElement>('#project-search')?.focus(); });
  document.querySelector('#load-more')?.addEventListener('click', () => reload(true));
}
function updateResults() {
  const target = document.querySelector('#results');
  if (target) target.innerHTML = results(currentRoute().page === 'board').value;
  announcer.textContent = `${filterProjects(store.page?.projects ?? [], query, kind, chain).length} 個符合條件的專案。僅搜尋已載入資料。`;
  bindResultActions();
}
function ledgerFor(c: Config) {
  let storage: Storage | undefined;
  try { storage = localStorage; } catch { /* reports are never cached */ }
  return new WithdrawalLedger(storage, `emberevo:withdrawals:v1:${c.mode}:${c.apiBase ?? 'local'}`);
}
async function reload(append = false) {
  const pending = store.load(append); render();
  await pending; render();
  announcer.textContent = store.error ? errorCopy[store.error.code][0] : `已載入 ${store.page?.projects.length ?? 0} 個專案。`;
}
async function switchMode(mode: Config['mode']) {
  store.cancel(); config = { ...config, mode }; configReady = true; configError = null;
  query = ''; kind = 'ALL'; chain = 'ALL';
  // Persist only an off override. Visitors cannot edit API base or enable any paid service.
  try { if (mode === 'off') sessionStorage.setItem('emberevo:demo-off', '1'); else sessionStorage.removeItem('emberevo:demo-off'); } catch { /* no persistence available */ }
  store = new CatalogStore(createRepository(config), ledgerFor(config));
  await reload();
}
async function start() {
  configReady = false; configError = null; render();
  try {
    config = await loadConfig();
    try { if (config.mode === 'demo' && sessionStorage.getItem('emberevo:demo-off') === '1') config.mode = 'off'; } catch { /* unavailable session storage */ }
    configReady = true;
    store = new CatalogStore(createRepository(config), ledgerFor(config)); await reload();
  } catch (e) { configReady = true; configError = e instanceof ResearchError ? e : new ResearchError('INVALID_DATA'); render(); }
}
window.addEventListener('hashchange', () => { beforeRevision = 1; afterRevision = 2; render(true); });
// A skip link focuses the main landmark without entering the application router.
 document.querySelector('.skip-link')?.addEventListener('click', e => { e.preventDefault(); document.querySelector<HTMLElement>('#main')?.focus(); });
void start();
