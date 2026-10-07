# EmberEVO Ecosystem Hall — Crypto Research

繁體中文、可操作的 E1 生態研究廳。包含總覽、研究看板與閱讀模式、專案研究、修訂比較、已載入資料搜尋。預設為 **DEMO_DATA**；五個專案與所有證據均為虛構，不是即時研究、AI 服務或安全認證。

原創藍灰、暖金、青綠與橙色介面，使用文字品牌標示。未使用私人世界素材、3D 模型、音樂、外部字型、錢包或登入服務。

## Install, preview and build

Node.js 22.12+ or 24, npm 11. Source uses native TypeScript DOM components, Vite and Zod; no UI runtime is needed. The committed export can be served without Node or an API.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run dev` and `npm run preview` bind to loopback. Open the URL printed by Vite. For static-only preview: `python3 -m http.server 8080 --directory dist`, then open `http://localhost:8080/#/overview`. Serve the directory over HTTP(S), not `file://`, because the deployment config is loaded with fetch.

```sh
npm run schemas           # regenerate schemas/ and deterministic fixtures/
npx playwright install chromium
npm run test:browser      # builds must already exist; owns/cleans its local server
```

`CHROMIUM_EXECUTABLE=/path/to/chrome npm run test:browser` uses an existing Chromium. Tests produce screenshots and `evidence/browser-results.json`. The browser test binds an ephemeral loopback port and checks both `/` and `/research/`; its URL ends when the check ends.

On this restricted worker, dependencies were installed in `/tmp/emberevo-tools`, leaving repository `node_modules/` untouched. Equivalent commands used an external TypeScript module path and a scratch-only Vite alias. A clean conventional install/build was also checked in an isolated copy; see the validation record for actual outcomes. Neither scratch nor `/tmp` is required by the delivered source.

## Pages and interactions

- `/#/overview`: discoveries, current published research, changes, explicit coverage, search and filters.
- `/#/board`: the same repository, cards and current pointer in a large-screen dashboard or reading mode. Mobile stacks cards.
- `/#/project/demo%3Agrove`: four money/rights/rule questions, evidence, safe source links, asset identities, dates, limitations and disclosures.
- `/#/history/demo%3Agrove`: immutable R1/R2 and unpublished R3, stable `claim_id` comparison, reasons, parent revisions and No material change.
- `/#/about`: working scope, disconnected services and fixed World return.

Search only operates on loaded records: names, symbols, chain/network, contract/mint/collection address and token ID. GRV intentionally finds two unrelated assets. The demo switch clears loaded data; turning demo off remains off on reload within the tab and returns NOT_CONNECTED. It never automatically substitutes fixtures for HTTP failures. Load-more retrieves one page per explicit action.

## Data adapters

Deployment config is `public/config.json`, copied to `dist/config.json`. It contains no secrets and is not visitor-editable through the application:

```json
{"schemaVersion":"1.0","mode":"demo","apiBase":null,"timeoutMs":5000}
```

Set `mode` to `off` for empty NOT_CONNECTED, or `http` with an app-owned HTTPS `apiBase`. An absent HTTP base produces MISSING_CONFIG. Localhost HTTP is allowed solely for local checks. Rebuild after editing `public/config.json`, or replace `dist/config.json` at deployment. API base accepts no credentials, query or fragment. Never put secrets in it.

The HTTP adapter makes credential-free, read-only, no-store requests, with a finite timeout, cancellation, response-order protection and no retries. Config comes from the deployment file, never visitor URL input. There is no publishing, AI or monitoring backend. The schema and app-owned HTTP API contract are in [HTTP-CONTRACT.md](HTTP-CONTRACT.md).

## Static deployment

`vite.config.ts` sets `base: './'`. `dist/index.html` references local `./assets/...`; config is relative to the page. Hash routes work without SSR or server rewrites. To change the build base explicitly, run `npm run build -- --base=/research/`, but retain the default relative export for movable gateway/IPFS hosting.

Publish the **contents of `dist/`**, including `config.json` and `assets/`, to a new isolated public static host. Both a root directory and a `/research/` directory work with the same export. Preserve trailing slash on the directory URL. For GitHub Pages source delivery, create a new public repository and publish the already built export using the host's external/static upload mechanism; do not change existing production sites or DNS. No GitHub workflow is provided because `.github/` is outside this assignment's writable boundary.

The production export is a required source-delivery artifact. Keep `dist/` included; do not upload development dependencies, caches, scratch tests, or `.imd` inputs. [scripts/check-delivery.mjs](scripts/check-delivery.mjs) enumerates deliverables and enforces the 8 MiB **uncompressed** file budget, a stricter local check than the compressed content payload. No ignore files or submodules were created.

## Verification and delivery state

The worker ran production build, strict source typecheck, domain/HTTP tests, and browser interaction/responsive checks. Exact versions, commands, failures repaired and PASS/FAIL/NOT_RUN results are recorded in [VALIDATION.md](VALIDATION.md), with actual screenshot evidence in [evidence/screenshots](evidence/screenshots). These are worker observations, not independent certification.

**Public repository URL, new commit and public preview URL are not available.** The checkout has no configured remote or authenticated publication tool, and the assignment prohibits modifying `.git/`. No commit or public deployment has been invented. Source and `dist/` are delivered locally for the enclosing submission process. The temporary local verification URL in `browser-results.json` is not a public preview and is no longer running.

See [DESIGN.md](DESIGN.md) for implemented tokens and components, [LIMITATIONS.md](LIMITATIONS.md) for known boundaries, and [HANDOFF.md](HANDOFF.md) for the remaining E2/E3 and World integration work.
