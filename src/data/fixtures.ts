import type { AssetRef, Bundle, CatalogPage, Claim, ReportRevision } from '../domain/schema';
import { digest } from '../domain/integrity';

const day = '2026-09-30T09:00:00Z';
const asset = (slug: string, symbol: string, chain: string, kind: 'TOKEN' | 'NFT'): AssetRef => ({
  assetId: 'demo:asset:' + slug, symbol, chain, network: 'fixture:' + chain.toLowerCase(),
  address: 'fixture:' + slug, kind, collection: kind === 'NFT' ? 'fixture:collection:' + slug : null,
  tokenId: null, decimals: kind === 'TOKEN' ? 18 : 0,
});
export async function makeFixtures(): Promise<CatalogPage> {
  const definitions = [
    { slug: 'grove', name: 'Grove Protocol', subtitle: '讓公共資源的資金流向更清楚', category: '公共財 · TOKEN', type: 'TOKEN', assets: [asset('grove-eth', 'GRV', 'Ethereum', 'TOKEN')], description: '假想的公共財資助協議。以代幣記錄提案與資金分配，探索治理參與和資金使用之間的關係。' },
    { slug: 'atelier', name: 'Atelier Objects', subtitle: '數位收藏與實體創作之間', category: '數位藝術 · NFT', type: 'NFT', assets: [asset('atelier-tez', 'OBJ', 'Tezos', 'NFT')], description: '假想的獨立創作者收藏計畫。NFT 記錄作品來源；實體作品兌換與著作權需分別查證。' },
    { slug: 'tide', name: 'Tide Collective', subtitle: '一個社群，兩種不同的權利', category: '社群協作 · MIXED', type: 'MIXED', assets: [asset('tide-base', 'TIDE', 'Base', 'TOKEN'), asset('tide-pass', 'PASS', 'Base', 'NFT')], description: '假想的海洋研究社群。代幣用於協作提案，NFT 用於識別收藏系列，兩者沒有預設兌換關係。' },
    { slug: 'grove-sol', name: 'Grove Studio', subtitle: '相同代號，不同資產身分', category: '創作工具 · TOKEN', type: 'TOKEN', assets: [asset('grove-sol', 'GRV', 'Solana', 'TOKEN')], description: '假想的創作工具專案。GRV 與 Grove Protocol 同名但網路與地址不同，研究紀錄完全分開。' },
    { slug: 'cinder', name: 'Cinder Archive', subtitle: '保留撤回原因，而非隱藏歷史', category: '文化保存 · NFT', type: 'NFT', assets: [asset('cinder-eth', 'CND', 'Ethereum', 'NFT')], description: '假想的文化典藏收藏。先前研究因權利描述缺乏支持而撤回，沒有現行報告。' },
  ] as const;
  const bundles: Bundle[] = [];
  for (const d of definitions) {
    const projectId = 'demo:' + d.slug;
    const b: Bundle = {
      project: { schemaVersion: '1.0', projectId, name: d.name, subtitle: d.subtitle, category: d.category, description: d.description, assetType: d.type, assets: [...d.assets], discoveredAt: day,
        relationships: d.type === 'MIXED' ? ['TIDE 與 PASS 為不同資產；代幣不代表 NFT 所有權。', '未確認兌換、收益分配或跨資產權利。'] : ['收錄僅供研究；資產持有不等同公司股權或回報承諾。'] },
      reports: [], manifests: [], publication: { sequence: 1, checkedAt: null, publishedReportRef: null }, withdrawals: [],
    };
    const claims: Claim[] = [
      { claim_id: 'purpose', category: 'PURPOSE', text: d.description, evidenceStatus: 'PARTIAL', evidenceIds: ['demo:ev:brief'], limitation: '合成案例，沒有實際鏈上或獨立驗證。' },
      { claim_id: 'money-source', category: 'MONEY_SOURCE', text: d.type === 'NFT' ? '範例設定：作品初次銷售收入。二級市場收入尚未確認。' : '範例設定：由社群提案資助與協議使用費提供資金。', evidenceStatus: 'PARTIAL', evidenceIds: ['demo:ev:brief'], limitation: '收入金額與支付者均未驗證。' },
      { claim_id: 'money-destination', category: 'MONEY_DESTINATION', text: '資金用途由專案管理者決定；分配比例尚未揭露。', evidenceStatus: 'UNCONFIRMED', evidenceIds: [], limitation: '無可驗證的支出紀錄。' },
      { claim_id: 'rights', category: 'RIGHTS', text: d.type === 'NFT' ? '收藏不自動移轉著作權；實體兌換條件尚未確認。' : '可參與提案討論；不代表可贖回資金或取得收益。', evidenceStatus: 'UNCONFIRMED', evidenceIds: [], limitation: '此描述不是可執行的權利或合約。' },
      { claim_id: 'rules', category: 'RULES', text: '管理者可提出規則變更；是否有延遲與否決機制尚未確認。', evidenceStatus: 'UNCONFIRMED', evidenceIds: [], limitation: '未檢視任何真實合約或管理權限。' },
    ];
    const report: ReportRevision = {
      schemaVersion: '1.0', projectId, reportId: 'demo:report:' + d.slug, revision: 1, parentRevision: null,
      state: 'PUBLISHED', reason: '建立初始研究脈絡（合成案例）。', quality: 'LIMITED',
      discoveredAt: '2026-09-28T08:00:00Z', retrievedAt: '2026-09-29T10:00:00Z', analyzedAt: day, verifiedAt: null,
      claims, sources: [{ sourceId: 'demo:source:brief', label: '合成專案說明 · 非真實研究來源', url: 'https://example.org/', kind: 'SYNTHETIC', publishedAt: '2026-09-28T08:00:00Z', retrievedAt: '2026-09-29T10:00:00Z' }],
      evidence: [{ evidenceId: 'demo:ev:brief', sourceId: 'demo:source:brief', excerpt: '此為測試用虛構說明，僅展示證據、修訂與限制的閱讀方式。', location: 'fixture / project-brief / paragraph-1' }],
      metrics: [
        { metricId: 'demo:metric:volume', label: d.type === 'NFT' ? '收藏底價' : '使用量', kind: d.type === 'NFT' ? 'NFT_FLOOR' : 'VOLUME', amountAtomic: null, decimals: null, assetRef: null, unit: null, currency: null, asOf: null, sourceId: null },
        { metricId: 'demo:metric:fees', label: '已收取費用', kind: 'FEES_RECEIVED', amountAtomic: null, decimals: null, assetRef: null, unit: null, currency: null, asOf: null, sourceId: null },
      ],
      changes: [{ claim_id: 'purpose', kind: 'ADDED', reason: '初始收錄。', evidenceIds: ['demo:ev:brief'] }],
      limitations: ['所有內容均為 DEMO_DATA，未進行即時資料擷取或鏈上驗證。', '來源頁面為保留的範例網域，不提供上述主張的證明。', '未確認的新鮮度一律標記 STALE；雜湊不證明研究品質或安全性。'],
      commercialRelationship: { declaration: 'DECLARED', inclusion: 'EDITORIAL', research: 'UNPAID', sponsorship: 'NONE', imdRelationship: 'NONE', selfProject: false, details: '合成披露：無收錄費、研究費或贊助。此設定僅用於介面測試。' }, approval: 'SYNTHETIC_DEMO',
    };
    if (d.slug !== 'grove-sol') b.reports.push(report);
    if (d.slug === 'grove') {
      const r2 = structuredClone(report);
      r2.revision = 2; r2.parentRevision = 1; r2.reason = '補充資金去向與規則變更限制。';
      r2.analyzedAt = '2026-10-02T11:30:00Z';
      r2.claims[2].text = '範例設定：資金分配至公共財提案與營運儲備；實際比例仍未知。';
      r2.claims[2].evidenceStatus = 'PARTIAL'; r2.claims[2].evidenceIds = ['demo:ev:brief'];
      r2.changes = [{ claim_id: 'money-destination', kind: 'UPDATED', reason: '範例說明新增用途分類，未提供比例。', evidenceIds: ['demo:ev:brief'] }];
      b.reports.push(r2);
      const draft = structuredClone(r2); draft.revision = 3; draft.parentRevision = 2; draft.state = 'DRAFT'; draft.approval = 'NONE';
      draft.reason = '草稿複核；無實質變更。'; draft.changes = [{ claim_id: null, kind: 'NO_MATERIAL_CHANGE', reason: 'No material change；尚未發布。', evidenceIds: [] }];
      b.reports.push(draft); b.publication.sequence = 2;
    }
    if (d.slug === 'tide') {
      report.commercialRelationship = { declaration: 'DECLARED', inclusion: 'SELF_PROJECT', research: 'UNPAID', sponsorship: 'NONE', imdRelationship: 'SELF_PROJECT', selfProject: true, details: '合成自有專案關係示例，並非真實 IMD 關係。自有研究不是獨立認證。' };
    }
    if (d.slug === 'cinder') {
      b.withdrawals = [{ recordId: 'demo:withdrawal:cinder:1', projectId, reportId: report.reportId, revision: 1, sequence: 2, at: '2026-10-03T12:00:00Z', reason: '實體作品權利缺乏支持；撤回現行指標並保留研究歷史。' }];
      b.publication.sequence = 2;
    }
    for (const r of b.reports) b.manifests.push({ schemaVersion: '1.0', projectId, reportId: r.reportId, revision: r.revision, reportHash: await digest(r) });
    if (b.reports.length && d.slug !== 'cinder') {
      const m = b.manifests.find(m => m.revision === (d.slug === 'grove' ? 2 : 1))!;
      b.publication.publishedReportRef = { reportId: m.reportId, revision: m.revision, manifestHash: await digest(m) };
    }
    bundles.push(b);
  }
  return { schemaVersion: '1.0', namespace: 'DEMO_DATA', projects: bundles, nextCursor: null, coverage: { description: '僅涵蓋 5 個虛構專案。含代幣、NFT、混合資產與同名代幣；不代表市場全貌。', total: 5, asOf: '2026-10-03T12:00:00Z' } };
}
