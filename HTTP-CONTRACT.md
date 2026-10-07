# Read-only research contract v1

This is an **app-owned proposed API**, not an existing IMD API. No remote service is supplied. Runtime validation lives in `src/domain/schema.ts`; structural JSON schemas are exported to `schemas/`. Semantic and cryptographic checks additionally run in `src/domain/integrity.ts`. Types are inferred from the same runtime schemas. Validated reports are recursively frozen; research changes require new immutable revisions.

## Endpoint, pagination and coverage

`GET {apiBase}/v1/catalog?limit=50[&cursor=<opaque cursor>]`

Response: `CatalogPage`, `schemaVersion: "1.0"`, `namespace: "RESEARCH_DATA"`, `projects: Bundle[]`, `nextCursor: string | null`, and `coverage: {description, total: number | null, asOf: ISO-8601 | null}`. The server must state its actual coverage. `total` is catalog coverage, never a live global market counter. `DEMO_DATA` is only accepted by the demo repository; HTTP rejects it. At most 100 bundles per page. Cursors use `[A-Za-z0-9_-]{1,200}` and cannot provide URLs. A bundle includes all retained revisions and withdrawal records for that project. Never split revisions across pages. `nextCursor:null` ends pagination. Each load-more action makes one request. Duplicate project identities across pages are rejected. No global search endpoint exists.

Empty success example:

```json
{"schemaVersion":"1.0","namespace":"RESEARCH_DATA","projects":[],"nextCursor":null,"coverage":{"description":"This service has not published any projects.","total":0,"asOf":null}}
```

`fixtures/catalog.demo.json` is the complete synthetic shape example and is not a live HTTP response. See the tests' loopback mock for HTTP scenarios.

Requests use `credentials:'omit'`, `cache:'no-store'`, `redirect:'error'`, `Accept:application/json` and an AbortSignal. The deployed API must support the public frontend origin via CORS, without cookies or visitor accounts. The adapter appends `/v1/catalog` to the deployment-controlled base path. API base must be HTTPS (loopback HTTP is accepted for local tests), without credentials, query or fragment. It is never supplied by a visitor query parameter or text field.

## Bundles, identity and disclosure

A bundle contains `project`, `reports`, `manifests`, `publication` and `withdrawals`. Stable `projectId` is distinct from symbols. Asset identity is the tuple `[chain, network, address, collection, tokenId]`. Store chain-appropriate canonical addresses upstream; this adapter preserves case and never merges on symbol or applies chain-agnostic lowercasing. Token and NFT relationships are separate explanatory text. Each `assetRef` includes kind, identity fields, symbol and decimals. Demo addresses and networks use `fixture:` and project/report IDs use `demo:`; none look tradable.

Reports contain claims (`claim_id`, category, text, evidence status, evidence IDs and limitations), sources, evidence excerpts, metrics, changes, quality, four distinct timestamps, disclosure and approval declaration. Evidence states (`SUPPORTED`, `PARTIAL`, `UNCONFIRMED`, `RETRACTED`) are independent of report quality (`LIMITED`, `DOCUMENTED`, `UNKNOWN`). Neither is a security certification.

Commercial relationships separately declare inclusion, research payment, sponsorship, IMD relationship and self-project status. `UNDECLARED` is rejected for published research, including historical published revisions. Self-project disclosure is explicit and is not independent certification. Synthetic demo approval has no authority. E2 must authenticate and authorize publisher decisions outside this browser; hashes do not do that.

## Current version and SHA-256

All current views call the same `resolveCurrent`. They use only `publication.publishedReportRef = {reportId, revision, manifestHash}`. They never select the numerically highest revision. A newer unpublished report remains historical. The manifest is `{schemaVersion, projectId, reportId, revision, reportHash}`. Every report has exactly one manifest. The pointer's manifest hash and all report hashes are verified before the catalog is usable; any mismatch rejects the page.

Canonical JSON v1 (`canonical`): recursively sort object keys by JavaScript UTF-16 lexical ordering; JSON.stringify each key/string; retain array order; no whitespace, BOM or terminal newline; no Unicode normalization; only null, booleans, strings and safe integer metadata numbers are supported. Encode as UTF-8, hash with SHA-256, render 64 lowercase hexadecimal characters. Hash a complete ReportRevision to form `reportHash`; hash the complete manifest to form `manifestHash`. Hash fields are outside the report, avoiding circularity. The JSON file's formatting is not hashed. Test vector: SHA-256 of canonical `{}` is `44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a`.

Freshness is CHECKED only when both publication check time and report verification time are present, no more than 24 hours old, and not in the future. Otherwise it is STALE. The fixed demo verification dates are null, so every available demo report is explicitly stale. This UI policy is not assurance of research truth.

## Withdrawal and caching

`publication.sequence` is a monotonic nonnegative number per project; `publishedReportRef:null` means no current report. A withdrawal record binds recordId, projectId, reportId, revision, sequence, time and reason. Withdrawn content remains immutable history, even if its original state was PUBLISHED. Publishing and withdrawing are simulated only by fixtures/tests; no mutation endpoint or UI exists.

Only withdrawal tombstones and maximum seen publication sequences are persisted in localStorage. Keys include mode and API base. Reports are never cached as current. Every fetched withdrawal is merged before resolving views. Tombstones permanently block that report revision, including on reload or a later stale response. An older publication sequence cannot overwrite a newer state. Re-publishing after a withdrawal needs a new revision and new pointer. Damaged/inaccessible persistence after construction fails closed for current resolution. The browser cannot protect against a user deleting storage, a dishonest authoritative server omitting past withdrawals, or rollback before this device first observed it; E2 needs authoritative durable records. No service worker or offline-current cache exists.

## Numbers and dates

Missing values are null/UNKNOWN. A numeric zero is valid only when the source actually supplies zero. `amountAtomic` is a nonnegative decimal integer **string**. Its decimals must be an integer 0–255 matching a fully bound assetRef. Rendering pads/slices strings; summation uses BigInt. JavaScript Number is never used for atomic amounts. A metric without unit, currency, asset identity, as-of time or source is unavailable. Sum helpers reject mixed assets, units, currencies, types, decimals or as-of times. No exchange rates are invented.

VOLUME, FEES_RECEIVED, FDV, CIRCULATING_CAP, NFT_FLOOR, NFT_BID and NFT_SALE are separate metric kinds. Discovery, retrieval, analysis, verification, source publication and metric as-of timestamps have distinct fields. The UI intentionally displays no values for incomplete fixtures.

## Honest errors and untrusted content

NOT_CONNECTED (off), MISSING_CONFIG, empty successful data, NOT_FOUND (404), RATE_LIMITED (429), TIMEOUT, INVALID_DATA (invalid JSON/schema/version/reference/hash), NETWORK_ERROR, HTTP_ERROR and CANCELLED are distinct. There are no automatic retries or demo fallback. The finite timeout includes body reading. Refresh cancels its predecessor; a generation token ignores out-of-order results even when an adapter fails to honor cancellation. On errors current data is removed, never substituted with stale cached reports.

All research values are escaped by the `html` tagged template before insertion. Trusted template markup is only authored in source code. External links must be HTTPS without credentials, show the destination and use noopener/noreferrer. No raw research HTML, remote embeds, executable scripts, wallet actions, tools or configuration directives are supported. Treat third-party prose as text, including apparent instructions. Demo data needs no external request beyond local assets and config.
