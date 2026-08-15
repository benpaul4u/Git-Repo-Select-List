# Git-Repo-Select-List

A curated, categorized list of open-source GitHub repositories, assessed for building web apps and embeddable editor SDKs. Each category is **ranked** — #1 is the preferred pick. Entries note license and why the repo matters, so future work can check here before re-researching.

**Rules for this list**
- Public information only. Never store tokens, credentials, or private details.
- Every entry: name, URL, license, one-line description, assessment note.
- Rankings are per-category, best first. Re-rank when a better option is found.

Last updated: 2026-08-15

---

## 1. Spreadsheet / Document engines

| # | Repo | License | Notes |
|---|------|---------|-------|
| 1 | [Univer](https://github.com/dream-num/univer) | Apache-2.0 | Web spreadsheet/doc engine — grid, formula engine, plugin architecture. Pin all `@univerjs/*` packages to one exact version — plugin contracts break across minors. Pro features (collab, xlsx I/O, charts, pivots) are paid; build those on OSS instead. |
| 2 | [ironcalc/IronCalc](https://github.com/ironcalc/IronCalc) | Apache-2.0 | Spreadsheet engine in Rust with WASM bindings; permissively-licensed alternative for embedding a calc engine outside JS. |
| 3 | [productdevbook/hucre](https://github.com/productdevbook/hucre) | MIT | Zero-dependency pure-TypeScript spreadsheet engine with XLSX/CSV/ODS read-write. Young project — verify maturity before depending on it. |

## 2. Embeddable editor SDK model (architecture references)

| # | Repo | License | Notes |
|---|------|---------|-------|
| 1 | [Excalidraw](https://github.com/excalidraw/excalidraw) | MIT | The gold-standard "package IS the editor" model: npm package ships the full editor, collab server is opt-in, local-first localStorage host, E2E-encrypted share links. |
| 2 | [Penpot](https://github.com/penpot/penpot) | MPL-2.0 | Team-scale real-time collaborative design editor; deployment-agnostic self-hosting; open-standards file formats. Clojure/ClojureScript stack limits code reuse — study the model, not the code. |
| 3 | [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) | AGPL-3.0 | Local-first collaborative workspace (Notion-style). Its Rust `collab` crates build on yrs (Yjs-compatible CRDT) — relevant when a native/Rust sync peer is needed. Desktop-native (Flutter), not web-embeddable. |
| 4 | [toeverything/blocksuite](https://github.com/toeverything/blocksuite) | MPL-2.0 | Block-based collaborative editor toolkit (powers AFFiNE); CRDT-native document model, good reference for editor-as-package architecture. |

## 3. Real-time collaboration / CRDT

| # | Repo | License | Notes |
|---|------|---------|-------|
| 1 | [Yjs](https://github.com/yjs/yjs) | MIT | CRDT for shared editing. Battle-tested, big ecosystem (providers, awareness/presence). |
| 2 | [Hocuspocus](https://github.com/ueberdosis/hocuspocus) | MIT | Yjs WebSocket collab server + client provider. Hooks for auth, persistence, throttling. |
| 3 | [loro-dev/loro](https://github.com/loro-dev/loro) | MIT | Rust CRDT with rich-text/tree support and JS bindings; strongest emerging alternative to Yjs. |
| 4 | [microsoft/FluidFramework](https://github.com/microsoft/FluidFramework) | MIT | Microsoft's distributed data structures for real-time collab; heavier server coupling (needs a Fluid service) than Yjs-style CRDTs. |

## 4. File I/O (office formats)

| # | Repo | License | Notes |
|---|------|---------|-------|
| 1 | [ExcelJS](https://github.com/exceljs/exceljs) | MIT | xlsx read/write in JS. Preferred over SheetJS Community for license clarity. |
| 2 | [JSZip](https://github.com/Stuk/jszip) | MIT/GPLv3 dual | Zip layer underpinning xlsx pipelines. |
| 3 | [SheetJS CE (`@e965/xlsx` mirror)](https://github.com/e965/sheetjs-npm-publisher) | Apache-2.0 | npm-published mirror of SheetJS Community Edition. Works, but license/distribution caveats — prefer ExcelJS. |
| 4 | [pdf-lib](https://github.com/Hopding/pdf-lib) | MIT | PDF creation/manipulation in JS. Candidate when PDF export is needed. |

## 5. Charts / visualization

| # | Repo | License | Notes |
|---|------|---------|-------|
| 1 | [Apache ECharts](https://github.com/apache/echarts) | Apache-2.0 | Chart rendering (canvas/SVG). Broad chart-type coverage, no license issues. |
| 2 | [vega/vega-lite](https://github.com/vega/vega-lite) | BSD-3-Clause | Declarative grammar of interactive graphics; best for spec-driven chart generation. |
| 3 | [reactchartjs/react-chartjs-2](https://github.com/reactchartjs/react-chartjs-2) | MIT | React bindings for Chart.js; lightweight option when full ECharts is overkill. |

## 6. Sharing / permissions / document-workflow patterns

| # | Repo | License | Notes |
|---|------|---------|-------|
| 1 | [Documenso](https://github.com/documenso/documenso) | AGPL-3.0 | Open-source DocuSign alternative (React Router v7, Hono, Prisma, tRPC, Turborepo). Strong reference for recipient/permissions/team sharing models and S3 file storage. AGPL — patterns only, no code copying. |

## 7. Self-hosting / Docker / release-engineering patterns

| # | Repo | License | Notes |
|---|------|---------|-------|
| 1 | [Immich](https://github.com/immich-app/immich) | AGPL-3.0 | Gold-standard self-hosted Docker release discipline, pnpm monorepo, upload/asset pipelines, shared-album permissions. |
| 2 | [Dub](https://github.com/dubinc/dub) | AGPL-3.0 + closed `/ee` | Clean Turborepo layout; notable dual-license OSS + Enterprise-Edition split as a monetization pattern. |
| 3 | [ListMonk](https://github.com/knadh/listmonk) | AGPL-3.0 | Single-binary Go self-hosted app — packaging comparable for Go services. |
| 4 | [Cal.DIY](https://github.com/calcom/cal.diy) | MIT | Community scheduling fork of Cal.com; plain Turborepo/self-hosting example, nothing distinctive. |
| 5 | [coollabsio/coolify](https://github.com/coollabsio/coolify) | Apache-2.0 | Self-hostable PaaS (Vercel/Heroku alternative); useful deployment target/pattern for shipping self-hosted apps. |
| — | [awesome-selfhosted/awesome-selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted) | unknown (GitHub reports no detected license) | Meta-directory: discovery list of self-hosted software, not software itself. Use for scouting, not a dependency. |

## 8. Assessed — low relevance for web editor work

| Repo | License | Verdict |
|------|---------|---------|
| [RustDesk](https://github.com/rustdesk/rustdesk) | AGPL-3.0 | Remote-desktop tool; desktop-native P2P; no web/editor applicability. |
| [FluidVoice](https://github.com/altic-dev/FluidVoice) | GPLv3 | macOS-native dictation app; no web or embedding model. |

---

## License policy

- **Safe to depend on / vendor**: MIT, Apache-2.0, BSD, MPL-2.0 (file-level copyleft).
- **Patterns only — never copy code**: AGPL-3.0, GPLv3. Reading architecture and docs is fine; code must not land in permissively-licensed projects.
- Always record the license in the entry so this check is one glance.

## Roadmap ideas

- **Trending-repo crawler**: a scheduled job (GitHub Search API — `stars:>N`, `pushed:>date`, topic filters) that surfaces trending/high-traction repos per category into a `candidates.md` for manual triage before promotion into this list. Signals worth combining: star velocity, release cadence, open-issue responsiveness, license.
- Per-category `details/` pages when an entry needs more than a table row (gotchas, upgrade notes).
