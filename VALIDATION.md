# Worker validation — 2026-10-07

## Scope and completion

**Local E1 frontend/evidence: complete. Public delivery: incomplete.** Source, lockfile, root design documentation, deterministic fixtures/schemas and the final standalone `dist/` exist. E2 live data/AI/publishing, E3 monitoring and World integration remain pending. No production account, site, DNS, `.git/`, `.github/`, `.env` or repository dependency directory was modified. No subagents or paid jobs were used. There is no authenticated public publisher or remote in this checkout, so public repo, implementation commit and public preview are **NOT_RUN / unavailable**. No URL or commit is fabricated.

Native TypeScript components were chosen to keep this bounded MVP small, with Vite for static bundling and Zod for the shared runtime/types contract. UI is Traditional Chinese; fixture IDs and contract fields are English. No logo or attachment was available. Text wordmark, system fonts and invented fixture identities are deliberate assumptions.

This record reports worker checks, not independent certification. The passing export is the standard clean-install production build, copied byte-for-byte from the isolated build directory to `dist/` and tested there.

## Versions and commands

Linux x64; Node **v24.21.0**, npm **11.19.0**, TypeScript **5.9.3**, Vite **7.3.7**, Zod **4.3.6**, tsx **4.21.0**, Playwright **1.58.2**, Chromium **154.0.8037.0**. Dependency versions are locked. Final npm audit reported zero findings; this is not a security certification.

Dependencies were installed outside the repository to respect the prohibition on touching repository node_modules. `/tmp/emberevo-clean` contained an isolated copy of the delivered source/package/lock/config, and its own generated dependencies.

| Actual command / check | Result |
| --- | --- |
| `npm ci --prefix /tmp/emberevo-clean --cache /tmp/emberevo-npm-cache --no-audit --no-fund` | PASS, 23 packages installed |
| `npm --prefix /tmp/emberevo-clean run typecheck` | PASS, strict `tsc --noEmit` |
| `npm --prefix /tmp/emberevo-clean run build` | PASS, 88 modules, complete relative-URL static export |
| `npm --prefix /tmp/emberevo-clean test` | PASS, **30 tests**, 0 failures |
| `/tmp/emberevo-tools/node_modules/.bin/tsx --tsconfig test/scratch/tsconfig.json scripts/export-schema.ts` | PASS, catalog/config JSON schemas and deterministic demo catalog exported |
| `CHROMIUM_EXECUTABLE=/home/levi/.cache/ms-playwright/chromium-1246/chrome-linux64/chrome /tmp/emberevo-tools/node_modules/.bin/tsx --tsconfig test/scratch/tsconfig.json scripts/browser-check.ts` | PASS, **26 browser check groups**, 0 failures |
| `npm audit --json --cache /tmp/emberevo-npm-cache` | PASS, 0 reported vulnerabilities in the final lockfile |
| `git diff --check` | PASS; read-only check, no index or commit changes |
| `node scripts/check-delivery.mjs` | PASS; raw deliverable budget below 8 MiB, including source, export and screenshots; exact bytes in `artifacts/size-report.json` |
| Public repository creation / commit / public deployment | NOT_RUN: no publication connection, `.git/` writes prohibited |
| Live backend / AI / publisher service / monitoring | NOT_RUN: intentionally outside E1 |

The initial external-path build could not resolve Zod because repository node_modules was deliberately absent. A scratch-only alias enabled early checks; a subsequent conventional clean installation/build removed that environment dependency from final verification. The final delivered export was generated with the **unmodified `vite.config.ts`** in the clean copy. The browser helper was corrected for TypeScript evaluation helper injection and duplicate World-link selectors; these were test-harness failures, not application pass claims.

## Domain and HTTP evidence

`tests/research.test.ts` passes 30 tests covering fixture types/identities; deterministic canonical SHA-256 with a known test vector; selected R2 despite unpublished R3; manifest/report/project mismatches; withdrawal persistence across ledger recreation and old responses; corrupt cache failing closed; retained withdrawn/draft history; stable `claim_id` comparison and No material change; parent/reason/evidence retention; UNDECLARED rejection; self-project disclosure; unknown/expired freshness; name/symbol/chain/contract/collection filters; ticker collisions; exact large atomic amounts beyond Number precision; null/mixed units/assets/kinds/times; malformed atomics; schema versions/unknown fields; escaped text; safe HTTPS destinations; fixed World URL; demo-off isolation; adapter validation; immutable frozen reports; refresh clearing old current data; reused withdrawal record labels across projects preserving both tombstones.

A real Node loopback HTTP server tests successful empty data, limit/cursor pagination, omitted credentials, missing config, 404, 429, 500, timeout, invalid JSON, invalid schema version, rejection of DEMO_DATA in HTTP mode, cancellation and an overlapping slow/fast fetch. A deliberately noncooperative adapter proves late results are ignored even when cancellation is not honored. No automatic retries occur.

## Production browser evidence

`scripts/browser-check.ts` owns a finite foreground server and Chromium session and closes both. It serves the actual final export at root and at `/research/` without route rewrites. The ephemeral preview URL in `evidence/browser-results.json` is real historical local evidence, no longer running and **not public**.

- Reloaded overview, board, project and history at both mounts. Local assets and relative config loaded successfully.
- Exercised search, address search, ticker collision, network/type filters, no-result state and clear action.
- Verified the same current pointer across overview, board and project, board reading toggle and hash details.
- Compared R1/R2 and R2/R3; confirmed No material change. Withdrawal remained visible after reload with no current report.
- Turned demo off, reloaded and confirmed empty NOT_CONNECTED; the fixture JS chunk was not requested. Re-enabling is explicit.
- Confirmed AI action is disabled. Both World links use exactly `https://imdember.com/`; injected visitor returnUrl did not change links.
- Keyboard-only skip-to-main, typed search, Tab to filter, native navigation activation and h1 focus worked. A visible 3px ring was captured.
- All four routes at **320, 390, 896, 1440, 1920 CSS px** had no document horizontal overflow. Mobile board computed one column. Reduced-motion mode computed zero transition duration.
- Browser HTTP mock displayed loading, empty, missing config, 404, 429, timeout and invalid-data states. An injected HTML-shaped project name remained literal text without img/script elements or execution.
- No JavaScript page errors or unexpected failed requests. Production routes had zero console errors. The later intentionally injected 404 and 429 checks produced the two expected browser resource-console messages, preserved in the result JSON.

Screenshots (actual PNGs): `evidence/screenshots/overview-390.png`, `overview-1440.png`, `overview-1920.png`, `project-1440.png`, and `keyboard-focus.png`. The images were opened for visual review (overview at all three requested sizes, project content via recorded screenshots and the history failure-state inspection, and focused navigation). Mobile long-page captures are full-page images, not a claim of physical-device testing.

Measured **rendered** text contrast: primary h1/page **15.17:1**; supporting text/page **8.53:1**; notice supporting text **7.31:1**; notice gold **9.45:1**; evidence badge **7.16:1**; card supporting text **8.04:1**; card action **9.59:1**; report pointer **7.43:1**; environment marker **11.03:1**. These nine actual pairs exceed 4.5:1. Other hover/disabled/forced-color combinations were source-reviewed but not exhaustively measured.

## Better Interface consolidated review

Read the supplied workflow and the core principles/verification guidance of all six domains, then the document-web-design method. Supporting focus, screen size and text rules informed implementation. Attribution/licenses are retained in `THIRD_PARTY_NOTICES.txt` and artifact notices.

| Domain | Coverage and evidence | Remaining limitation |
| --- | --- | --- |
| Accessibility | Checked: native controls, explicit labels, headings/landmarks, first-tab skip, Tab/Enter path, live result region, visible focus, disabled AI, reduced motion, non-color status labels | Actual screen reader, all-focus-stop/background audit, forced-colors rendering and native 200% zoom NOT_RUN |
| Layout | Checked: shared alignment/gaps, stacked content at five widths, four routes without horizontal overflow, final overview screenshots at requested sizes | Physical devices and unusual text-enlargement settings NOT_RUN |
| Writing | Checked: consistent Chinese labels, scoped coverage, concrete recoverable errors, explicit demo/off/disclosure/unknown states | Native-language editorial review beyond worker review NOT_RUN |
| Typography | Checked: descending semantic heading roles, system fallback rendering, 16px narrow form fields, wrapping IDs/prose, tabular numbers | Installed CJK face not positively identified; small English metadata remains a deliberate dense-interface limitation |
| Colors | Checked: small role-based blue-gray/gold/teal/orange palette, nine actual rendered contrast pairs, explicit status text | Exhaustive interactive-state contrast and alternate/forced themes NOT_RUN; no light theme was requested |
| UI | Checked: same cards/pointers across routes, native disclosures, hover/focus/loading/empty/error/off states, restrained optional motion and mobile stack | Slow-motion panel inspection NOT_RUN; overlays/autoplay/3D not applicable |

### Findings, fixes and rechecks

| Severity / domain | Source location | Observed issue → correction | Recheck |
| --- | --- | --- | --- |
| HIGH / UI behavior | `src/data/repository.ts:45` | Browser HTTP calls failed while Node tests passed: native fetch was called with the repository receiver. Capture it as a standalone function before invocation. | PASS, final browser HTTP empty/error/timeout/safe-text scenarios plus local HTTP tests |
| MEDIUM / Accessibility | `src/main.ts:112` | A wrapping comparison label included select option text, preventing a stable exact accessible name. Use explicit label `for` and select `id`. | PASS, both fields are found by their exact labels and compare R1/R2/R3 |
| MEDIUM / UI consistency | `src/main.ts:109` | A single-revision history could select a fallback report while the requested number remained R2. Normalize both selection values to available revisions. | PASS, withdrawn single-revision history renders and reloads |
| MEDIUM / Layout/navigation | `src/main.ts:40`, `src/style.css:372` | Mobile rail adaptation hid its World link. Add the same fixed World destination to the footer. | PASS, final mobile screenshots and fixed-destination browser assertions |
| MEDIUM / Data integrity | `src/domain/integrity.ts:65` | Validated revisions could still be mutated by a caller. Recursively freeze the validated catalog. | PASS, explicit mutation test throws TypeError |
| MEDIUM / Data integrity | `src/domain/research.ts:16` | Reused withdrawal labels across projects could overwrite a tombstone. Scope its storage key by project, report and revision as well as record ID. | PASS, both withdrawals survive ledger recreation |
| LOW / Writing | `src/main.ts:78`, `src/main.ts:112` | Count wording and history freshness had demo-specific wording even for a future HTTP response. Derive labels from mode and freshness. | PASS, browser HTTP rendering and freshness unit test |
| LOW / Typography | `src/style.css:370` | Unbroken third-party names/prose could escape their card. Add anywhere wrapping and a shrinkable heading container. | PASS, HTML-shaped long test name rendered safely on mobile |

No unresolved blocker was observed in the implemented local primary flows. Public delivery and the enumerated manual/cross-browser checks remain unperformed; this report does not label them PASS.
