# Handoff

E1 source and a new isolated static demo are delivered here. This is a single bounded, non-onchain frontend build; no recurrence, child jobs or production modifications were made. The demo does not connect to imdember.com except when the visitor follows the fixed World link.

## Source map

| Path | Responsibility |
| --- | --- |
| `src/domain/schema.ts`, `schemas/` | Runtime validation, inferred domain types and JSON schemas |
| `src/domain/integrity.ts` | Canonical SHA-256, reference/asset/evidence bindings, publishability and freezing |
| `src/domain/research.ts` | Current resolution, freshness, persistent withdrawal ledger, claim diffs, precise amounts and filters |
| `src/data/repository.ts` | Replaceable demo/off/HTTP adapters, config, loading/cancellation/error lifecycle |
| `src/data/fixtures.ts`, `fixtures/` | Deterministic synthetic fixtures and exported catalog |
| `src/ui/`, `src/main.ts`, `src/style.css` | Safe components, pages, routing, interactions and responsive design |
| `tests/research.test.ts` | Domain tests and a real loopback HTTP mock server |
| `scripts/browser-check.ts` | Production-export browser interactions, routes, screenshots and measured contrast |
| `dist/` | Complete deployable static export, including config and local assets |

## E2 seam

Implement `ResearchRepository.list(cursor, signal)` against the documented versioned contract. Keep schemas and integrity validation authoritative; never let a new adapter silently choose a highest revision or return unvalidated payloads. The upstream system owns genuine identities, canonical chain-specific addresses, evidence, licensing, commercial disclosures and approvals. Add backend authorization, a durable monotonic publication stream, archival retrieval and withdrawal completeness before calling it live research. Retain nulls and integer strings. Keep API config deployment-owned and credential-free in the browser.

There are no production mutation methods. Implement publishing elsewhere only after an explicit later task. UI approval text and hashes are not a signing or certification system.

## E3 seam

Monitoring may eventually create new immutable proposed revisions and material-change reasons. This E1 must keep viewing the selected publishedReportRef until a real publisher changes it. A monitor must not auto-promote the highest revision. No schedules or subscriptions are created here.

## Genesis PEPE / Dream Hall / World seam

The shared World URL constant is in `src/ui/components.ts`. It is exactly `https://imdember.com/`; no return URL, private query, token or session is attached. Character/camera restoration and host-world wiring are pending Codex integration. Add future context only through an explicitly reviewed host integration, keeping research data unable to run code or change config.

Future Paid Genesis is EMVO paid to the owner-confirmed Paying Wallet, without a required burn. This document preserves context only: no price/address is selected, and no wallet, payment, ownership or entitlement flow exists. Dream Hall and Genesis PEPE are not active navigation destinations in E1.

## Publication handoff

The required public repository URL, new commit and public demo URL remain **PENDING**, recorded as null in `artifacts/delivery.json`. There is no configured remote or publisher capability in this checkout. Do not substitute the initial checkout commit or temporary loopback preview for this implementation's published identity.

The authorized publishing operator can create a **new public source repository** and **new isolated static preview**, include the enumerated source/lockfile/dist/docs/evidence, then record actual remote URL, commit SHA and preview URL. Do not change `.github/`, imdember.com, emvo-review, world source, DNS or production accounts during this task. Never include dependencies, caches, scratch work, `.imd` inputs, secrets or submodules. No ignore file change is required or authorized by this delivery; the explicit file list and budget check identify what is included.

The environment pre-excludes `artifacts/` in its Git metadata. Required screenshots/results are therefore delivered under the ordinary source path `evidence/`, and the full validation record and license notices also exist at repository root. Small artifact reports are additional delivery metadata; no ignore rule or Git metadata was changed.
