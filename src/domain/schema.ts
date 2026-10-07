import { z } from 'zod';

const id = z.string().min(1).max(160);
const prose = z.string().max(12000);
const time = z.iso.datetime().nullable();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const SCHEMA_VERSION = '1.0' as const;
export const StatusSchema = z.enum(['CURRENT', 'HISTORICAL', 'RETRACTED', 'NEEDS_RECHECK', 'MISSING']);
export const AssetRefSchema = z.strictObject({
  assetId: id, kind: z.enum(['TOKEN', 'NFT']), symbol: id,
  chain: id, network: id, address: id, collection: id.nullable(), tokenId: id.nullable(),
  decimals: z.number().int().min(0).max(255).nullable(),
});
export const SourceSchema = z.strictObject({
  sourceId: id, label: prose, url: z.url({ protocol: /^https$/ }),
  kind: z.enum(['SYNTHETIC', 'DOCUMENT']), publishedAt: time, retrievedAt: time,
});
export const EvidenceSchema = z.strictObject({ evidenceId: id, sourceId: id, excerpt: prose, location: prose });
export const ClaimSchema = z.strictObject({
  claim_id: id, category: z.enum(['PURPOSE', 'MONEY_SOURCE', 'MONEY_DESTINATION', 'RIGHTS', 'RULES']),
  text: prose, evidenceStatus: z.enum(['SUPPORTED', 'PARTIAL', 'UNCONFIRMED', 'RETRACTED']),
  evidenceIds: z.array(id), limitation: prose,
});
export const MetricSchema = z.strictObject({
  metricId: id, label: prose,
  kind: z.enum(['VOLUME', 'FEES_RECEIVED', 'FDV', 'CIRCULATING_CAP', 'NFT_FLOOR', 'NFT_BID', 'NFT_SALE']),
  amountAtomic: z.string().regex(/^(0|[1-9][0-9]*)$/).nullable(),
  decimals: z.number().int().min(0).max(255).nullable(), assetRef: AssetRefSchema.nullable(),
  unit: id.nullable(), currency: id.nullable(), asOf: time, sourceId: id.nullable(),
});
export const CommercialRelationshipSchema = z.strictObject({
  declaration: z.enum(['DECLARED', 'UNDECLARED']),
  inclusion: z.enum(['EDITORIAL', 'SELF_PROJECT', 'UNKNOWN']),
  research: z.enum(['UNPAID', 'PAID', 'UNKNOWN']),
  sponsorship: z.enum(['NONE', 'SPONSORED', 'UNKNOWN']),
  imdRelationship: z.enum(['NONE', 'RELATED', 'SELF_PROJECT', 'UNKNOWN']),
  selfProject: z.boolean(), details: prose,
});
export const ChangeSchema = z.strictObject({
  claim_id: id.nullable(), kind: z.enum(['ADDED', 'UPDATED', 'REMOVED', 'NO_MATERIAL_CHANGE']),
  reason: prose, evidenceIds: z.array(id),
});
export const ReportRevisionSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION), projectId: id, reportId: id,
  revision: z.number().int().positive(), parentRevision: z.number().int().positive().nullable(),
  state: z.enum(['PUBLISHED', 'DRAFT', 'RETRACTED']), reason: prose,
  quality: z.enum(['LIMITED', 'DOCUMENTED', 'UNKNOWN']),
  discoveredAt: time, retrievedAt: time, analyzedAt: time, verifiedAt: time,
  claims: z.array(ClaimSchema), evidence: z.array(EvidenceSchema), sources: z.array(SourceSchema),
  metrics: z.array(MetricSchema), changes: z.array(ChangeSchema),
  limitations: z.array(prose), commercialRelationship: CommercialRelationshipSchema,
  approval: z.enum(['SYNTHETIC_DEMO', 'PUBLISHER_DECLARED', 'NONE']),
});
export const PublishedReportRefSchema = z.strictObject({ reportId: id, revision: z.number().int().positive(), manifestHash: hash });
export const ManifestSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION), projectId: id, reportId: id,
  revision: z.number().int().positive(), reportHash: hash,
});
export const WithdrawalSchema = z.strictObject({
  recordId: id, projectId: id, reportId: id, revision: z.number().int().positive(),
  sequence: z.number().int().nonnegative(), at: z.iso.datetime(), reason: prose,
});
export const ProjectSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION), projectId: id, name: id, subtitle: prose,
  category: id, description: prose, assetType: z.enum(['TOKEN', 'NFT', 'MIXED']),
  assets: z.array(AssetRefSchema).min(1), relationships: z.array(prose), discoveredAt: time,
});
export const BundleSchema = z.strictObject({
  project: ProjectSchema, reports: z.array(ReportRevisionSchema), manifests: z.array(ManifestSchema),
  publication: z.strictObject({ sequence: z.number().int().nonnegative(), checkedAt: time, publishedReportRef: PublishedReportRefSchema.nullable() }),
  withdrawals: z.array(WithdrawalSchema),
});
export const CatalogPageSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION), namespace: z.enum(['DEMO_DATA', 'RESEARCH_DATA']),
  projects: z.array(BundleSchema).max(100), nextCursor: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(200).nullable(),
  coverage: z.strictObject({ description: prose, total: z.number().int().nonnegative().nullable(), asOf: time }),
});
export const ConfigSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION), mode: z.enum(['demo', 'http', 'off']),
  apiBase: z.url().nullable(), timeoutMs: z.number().int().min(50).max(15000),
});

export type AssetRef = z.infer<typeof AssetRefSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Metric = z.infer<typeof MetricSchema>;
export type ReportRevision = z.infer<typeof ReportRevisionSchema>;
export type Change = z.infer<typeof ChangeSchema>;
export type CommercialRelationship = z.infer<typeof CommercialRelationshipSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Bundle = z.infer<typeof BundleSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
export type Withdrawal = z.infer<typeof WithdrawalSchema>;
export type CatalogPage = z.infer<typeof CatalogPageSchema>;
export type Config = z.infer<typeof ConfigSchema>;
