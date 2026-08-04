# Bharat Paints ERP Production Source Recovery Report

**Mission date:** 2026-08-04 (Asia/Calcutta)  
**Workspace:** `D:\AI\AI\Bharat Paints ERP 2`  
**Production project:** `bharat-paints-dashboard`  
**Production deployment:** `dpl_EjLHYR9BeWwSJayfNvUXisV4FnMv`  
**Result:** The original React/Vite source was **not recovered as source files**. The deployed application, exact build fingerprint, build logs, production assets, APIs, Google Sheet identifiers, data models, and major application behavior were recovered sufficiently to support a controlled reconstruction.

## 1. Executive conclusion

The checked-out GitHub repository is not the source used for production. Git contains only the old static `index.html` and a placeholder `README.md`.

The live Vercel deployment was built on 2026-05-06 from a separate 28-file upload with package name `bharat-paints-v2`. Vercel installed a pnpm project, ran `tsc && vite build`, transformed 2,294 modules, and produced the exact assets still served in production.

No surviving local copy of those 28 source files was found in Git, common folders, accessible drives, OneDrive, Recycle Bins, editor history/backups, shell history, Claude/Codex records, npm/temporary caches, or other Bharat Paints project folders.

The strongest historical lead, `D:\AI\AI\Bharat Paints Stock App`, was a different Google Apps Script inventory project. Its directory has since disappeared, but its Claude transcript proves that it contained `Code.js`, `Chatbot.html`, and clasp metadata—not the React/Vite production application.

## 2. Locations searched

### A. Current Git repository

Searched:

- Working tree and ignored/untracked state
- Local and remote branches
- Local and remote tags
- All refs
- All local commits
- All reflogs
- Git stash
- Git worktrees
- Packed objects
- Dangling and unreachable Git objects (`git fsck --full --unreachable --no-reflogs`)
- `.git/config`, logs, refs, index, object packs, and info files
- Remote refs through `git ls-remote --heads --tags origin`

Result:

- Only branch: `main`
- Only remote branch: `origin/main`
- No tags
- No stash
- No alternate worktrees
- No dangling/unreachable objects
- Reflog contains only the 2026-08-04 clone
- Six commits total; none contains React/Vite source
- Local and remote HEAD are both `47c0b2e`

### B. Current workspace and hidden files

Searched all visible and hidden files, including:

- `.vercel/repo.json`
- `.vercel/README.txt`
- `.env.local` (key name inspected; secret value not exposed)
- `.gitignore`
- All root and recursive files
- `dist`, `build`, `src`, `assets`, `node_modules`, `package.json`, lockfiles, Vite configs, TSX, JSX, TypeScript, and JavaScript candidates

Result:

- No `dist`, `src`, `assets`, `node_modules`, `package.json`, lockfile, Vite config, TSX, or JSX exists here.
- `.vercel/project.json` is absent; `.vercel/repo.json` links the folder to the correct project ID.

### C. User folders and accessible drives

Searched by project/directory name, source filename, production asset hash, project ID, and distinctive production strings across:

- `C:\Users\Bharat\Desktop` (not available as a normal local folder in the accessible profile)
- `C:\Users\Bharat\Downloads`
- `C:\Users\Bharat\Documents`
- `C:\Users\Bharat\OneDrive`
- `D:\AI`
- `D:\`
- `G:\` where accessible
- Existing Bharat/Paints/dashboard/ERP-named folders
- Generic source folders whose names did not mention Bharat Paints

Search signatures included:

- `bharat-paints-dashboard`
- `bharat-paints-v2`
- `prj_7quJPEwqyWODSUIeDXxlzSlMz4T1`
- `index-Dsta7dsK.js`
- `index-CnAGMVau.css`
- `BHARAT PAINTS INVENTORY DATA CONTEXT`
- `gemini_api_key`
- `Total stock value`
- `Godown-wise total qty`
- `Gopal Kunj`
- Google Sheets CSV export code

Result: no matching original React/Vite source or production build cache.

### D. Related and old project folders

Inspected or signature-searched relevant folders including:

- `D:\AI\AI\Bharat Paints ERP`
- `D:\AI\AI\Bharat Paints ERP 2`
- Former `D:\AI\AI\Bharat Paints Stock App` references
- `D:\AI\AI\Bharat AI Business intellegent suite\bharat-paints-ai`
- `D:\AI\AI\Bharat Paints Tally Integration`
- `D:\AI\AI\Bharat Paints Website Project`
- `D:\AI\AI\Bharat Paints Chatbot Final without Key`
- `D:\AI\AI\Bharat Paints Waterproofing`
- Other Bharat Paints, paint, inventory, ERP, and dashboard directories under `D:\AI`
- Related downloads and ZIP filenames

Result:

- These are unrelated websites, chatbots, Google Apps Script systems, Tally integrations, or other products.
- The `bharat-paints-ai` candidate is Google Apps Script (`.gs` and HTML), with no Vite/React package.
- The former “Bharat Paints Stock App” was also Google Apps Script, not the Vercel React application.

### E. Recycle Bins, temporary files, and caches

Searched:

- `C:\$Recycle.Bin`
- `D:\$Recycle.Bin`
- `G:\$Recycle.Bin` where available
- `C:\Users\Bharat\AppData\Local\Temp`
- npm cache locations
- local Vercel cache/config locations where accessible
- hashed production asset names
- source/config filenames and distinctive code strings

Result: no recoverable React/Vite source, deployment upload, bundle copy, or source map.

### F. PowerShell and terminal history

Searched PowerShell PSReadLine history for Vercel, Vite, React, Bharat Paints, dashboard, stock, Git, and directory navigation.

Important findings:

- History refers to `D:\AI\AI\Bharat Paints Stock App`.
- It records a commit named `chore: checkpoint before Vercel frontend migration`.
- Subsequent commands were forensic searches for old dashboard/project folders.
- The current GitHub repository was cloned twice on 2026-08-04.
- `vercel link` was then run in `Bharat Paints ERP 2`.
- No command history identifies the directory from which the 2026-05-06 React/Vite deployment was originally uploaded.

### G. VS Code state and backups

Searched:

- VS Code global storage
- Workspace storage
- File history
- Chat editing sessions and snapshots
- Backups
- Recent folder references
- `.code-workspace` files

Result:

- Many Bharat Paints website/chatbot projects were found in VS Code history.
- No workspace or file history corresponds to the production React/Vite dashboard.
- No deleted `src/*.tsx`, `package.json`, `pnpm-lock.yaml`, or Vite config for this dashboard was found.

### H. Claude and Codex records

Searched:

- Claude project directory names and JSONL transcripts
- Claude tool-result/scratchpad references
- Codex history and sessions
- Project names, production strings, Sheet export code, Vercel commands, asset hashes, and project IDs

Result:

- A 26 MB Claude transcript was found for the former `Bharat Paints Stock App`.
- It preserves extensive content and file references for an Apps Script inventory app (`Code.js`, `Chatbot.html`, `.clasp.json`, `appsscript.json`), not the React/Vite dashboard.
- No Claude/Codex session contains the original production React component source.

### I. Vercel project, deployment, metadata, and build cache

Verified:

- Project ID: `prj_7quJPEwqyWODSUIeDXxlzSlMz4T1`
- Team/org ID: `team_F3n8OMlP3e5Vh25Ce2B5icJc`
- Deployment ID: `dpl_EjLHYR9BeWwSJayfNvUXisV4FnMv`
- Production alias: `bharat-paints-dashboard.vercel.app`
- Deployment state: Ready
- Deployment creation/build: 2026-05-06
- Vercel build region: Washington, D.C. (`iad1`)

Vercel logs confirm:

- 28 deployment files were uploaded.
- No previous build cache was available.
- A 44.18 MB build cache was created and uploaded after the build.
- The authenticated deployment-file listing endpoint was queried, including explicit team scope, but returned no retrievable listing/content through the current CLI/account response.
- The public deployment exposes built assets only; no source map is published.

## 3. Recovered files and artifacts

### Original source files recovered

**None.** No unminified production TS/TSX/CSS/config/lockfile source file was recovered to disk.

### Recoverable production artifacts still live

- `/index.html` — 388-byte Vite application shell
- `/assets/index-Dsta7dsK.js` — 631.40 kB minified JavaScript (184.02 kB gzip)
- `/assets/index-CnAGMVau.css` — 17.20 kB compiled CSS (4.42 kB gzip)

These remain publicly fetchable from the production deployment. They are compiled artifacts, not maintainable original source.

### Recovered forensic evidence

- Complete Vercel build log
- Exact dependency and devDependency versions
- Exact package/build command
- Exact Google Spreadsheet ID and Day Book gid
- CSV parsing and field mappings
- Brand normalization table
- Date/period derivation logic
- Inventory/transaction data models
- Gemini endpoint, model, client storage key, prompt/context construction
- Main UI feature labels and analytics behavior

## 4. Missing files

The original upload contained 28 files. The exact filenames are not disclosed by the retained build log, but the following are certainly or very likely missing:

- `package.json`
- `pnpm-lock.yaml` (lockfile format version 9)
- `tsconfig.json` and possibly a secondary TypeScript config
- `vite.config.ts` or `vite.config.js`
- `index.html`
- PostCSS configuration
- Tailwind configuration
- Original global CSS/input stylesheet
- React entry point (`src/main.tsx` or equivalent)
- Root application component
- Dashboard component(s)
- Sales analysis component(s)
- Purchase analysis component(s)
- Stock/inventory table component(s)
- AI assistant component
- Shared chart/card/filter/UI components
- Types, data-loading utilities, CSV parser, brand mapping, analytics helpers
- Any README or metadata files included in the 28-file upload

## 5. Production build fingerprint

### Package and build

- Package name: `bharat-paints-v2`
- Package version: `1.0.0`
- Package manager: pnpm `10.28.0`
- Lockfile: `pnpm-lock.yaml` version 9
- Build command: `tsc && vite build`
- Vite: `8.0.10`
- TypeScript: `6.0.3`
- Modules transformed: 2,294
- Build duration: 991 ms for Vite; 9 seconds total Vercel build
- One large application bundle; no application code splitting

### Exact runtime dependencies

- `react` `19.2.5`
- `react-dom` `19.2.5`
- `recharts` `3.8.1`
- `lucide-react` `1.14.0`
- `class-variance-authority` `0.7.1`
- `clsx` `2.1.1`
- `tailwind-merge` `3.5.0`

### Exact development dependencies

- `@vitejs/plugin-react` `6.0.1`
- `@types/node` `25.6.0`
- `@types/react` `19.2.14`
- `@types/react-dom` `19.2.3`
- `autoprefixer` `10.5.0`
- `postcss` `8.5.13`
- `tailwindcss` `3.4.1`
- `tailwindcss-animate` `1.0.7`
- `typescript` `6.0.3`
- `vite` `8.0.10`

### Framework/UI fingerprint

- React 19 SPA mounted into `<div id="root">`
- Vite client-only build
- Tailwind CSS utility styling
- Recharts charts (bar, line, area, composed, pie/scatter primitives present)
- Lucide icon set
- Redux Toolkit/Immer code is present in the bundle, most likely transitively through Recharts state internals; it was not listed as a direct dependency
- No React Router dependency in the install log and no evidence of multiple URL routes
- Effective application route: `/` only; navigation is component/tab state inside the SPA

## 6. APIs and data sources

### Google Sheets

**Spreadsheet ID:** `1ES7TvUJ9-lMeEaEX65TXeufcwar1VsPQPOVofGaIjmA`

Two public CSV requests are made directly from the browser:

1. Day Book/transactions:

   `https://docs.google.com/spreadsheets/d/1ES7TvUJ9-lMeEaEX65TXeufcwar1VsPQPOVofGaIjmA/export?format=csv&gid=1761454938&cachebust=<timestamp>`

2. Current stock/default sheet:

   `https://docs.google.com/spreadsheets/d/1ES7TvUJ9-lMeEaEX65TXeufcwar1VsPQPOVofGaIjmA/export?format=csv&cachebust=<timestamp>`

There is no backend proxy, database, Firebase, Supabase, or authenticated application API in the deployed bundle.

### Gemini

- Endpoint: Google Generative Language API `v1beta`
- Model: `gemini-1.5-flash`
- Request method: browser-side `fetch`, POST JSON
- API key: supplied by the user and stored in `localStorage` under `gemini_api_key`
- Conversation context: last six messages plus generated inventory context
- Generation configuration: temperature `0.7`, maximum output tokens `1024`

## 7. Recovered data models and transformations

### Transaction/day-book model

Parsed CSV fields:

| CSV column | Field | Behavior |
|---|---|---|
| 0 | `date` | Required; parsed as `DD-MM-YYYY` |
| 1 | `product` | Required |
| 2 | `godown` | Defaults to `Unknown` |
| 3 | `type` | Only `In` or `Out` accepted |
| 6 | `qty` | Positive numeric value required |

Derived fields:

- `brand`: first product-name token passed through a large normalization map
- `month`: `Mon YYYY`
- `year`: numeric year
- `week`: `W<n> YYYY`
- `quarter`: `Q<n> YYYY`

### Stock model

| CSV column | Field |
|---|---|
| 0 | `product` |
| 1 | `mrp` |
| 2 | `rate` |
| 3 | `showroom` |
| 4 | `godown3` |
| 5 | `gopalKunj` |
| 7 | `total` |
| 8 | `reqQty` |
| 9 | `minQty` |

All numeric values default to zero. `brand` is derived from the product name.

### Recovered business calculations

- Stock Out = sales
- Stock In = purchases
- Top selling/purchased products aggregate transaction quantity by product
- Brand sales/purchases aggregate by normalized brand
- Monthly, weekly, and quarterly grouping is derived client-side
- Out of stock: `total <= 0`
- Low stock: `total > 0 && minQty > 0 && total <= minQty`
- Needs reorder: `reqQty > 0`
- Stock value: sum of `total * rate`
- Location totals: sums for Showroom, Godown 3, and Gopal Kunj

## 8. Recovered component/feature architecture

Original component names are minified, but behavior and boundaries indicate at least these logical modules:

- Application shell/header/navigation
- Main dashboard/summary cards
- Sales analysis
- Purchase analysis
- Stock/inventory analysis and searchable product table
- Period, brand, godown, and month filters
- Recharts-based trend/distribution charts
- Stock health cards: Total Products, Stock Value, Out of Stock, Low Stock, Needs Reorder
- Floating/minimizable Gemini inventory assistant
- Gemini API-key settings dialog
- Loading, refresh, and error states

No multi-page routing was identified. The application is a single-page dashboard at `/`.

## 9. Probability of recovery

### Exact original source from this computer: **10% or less**

Rationale:

- Exhaustive local and common-history searches found no matching source.
- The current clone was created three months after the production upload.
- No Vercel source map exists.
- The Vercel file endpoint did not yield retained source contents through the authenticated CLI.
- No Git remote/branch/tag contains the source.

Remaining possible paths:

- Another PC or Windows user profile used on 2026-05-06
- An external drive not mounted during this investigation
- Browser download history or a ZIP in cloud storage not synced locally
- Vercel support/internal retention of deployment input files or the uploaded 44.18 MB build cache
- The original AI/code-generation conversation or artifact on another service/account
- A deleted partition recoverable with offline forensic tooling, if the source was once stored on this disk

### Exact build behavior recoverable from deployed artifacts: **90–95%**

The public minified bundle contains almost all client behavior, constants, strings, transformations, and API wiring. Layout and styling are preserved in the compiled CSS and can be compared pixel-for-pixel.

### Maintainable equivalent source recoverable by reconstruction: **95%+**

The app is a client-only dashboard with two CSV data sources and one Gemini request. There is no hidden backend or database schema to reverse-engineer.

## 10. Best reconstruction strategy

Do **not** replace production or begin reconstruction until separately authorized.

When authorized:

1. Preserve the current deployment ID, public bundle, CSS, HTML, response headers, screenshots at desktop/mobile sizes, and representative Google Sheet CSV fixtures.
2. Ask Vercel support whether the 28 deployment inputs or uploaded 44.18 MB build cache can be exported for deployment `dpl_EjLHYR9BeWwSJayfNvUXisV4FnMv`.
3. Check any computer/account used on 2026-05-06 for a folder/package named `bharat-paints-v2`, plus `pnpm-lock.yaml` and Vite 8 projects created around that date.
4. If no source emerges, reconstruct against the recovered exact dependency versions and build command.
5. Split the recovered logic into typed modules: models, CSV parsing, data service, period aggregation, brand mapping, inventory calculations, dashboard, sales, purchases, stock table, filters, charts, and AI assistant.
6. Use captured CSV fixtures to compare every aggregate and classification with production.
7. Use the compiled CSS and production screenshots as visual parity references.
8. Deploy only to a Vercel preview and run side-by-side behavioral and visual comparisons.
9. Promote only after exact parity is demonstrated; retain the current deployment for instant rollback.

## 11. Estimated reconstruction effort

Assuming one experienced React/TypeScript engineer and no new features:

| Work | Estimate |
|---|---:|
| Preserve artifacts, screenshots, fixtures, and parity checklist | 0.5–1 day |
| Recreate project/config/dependency baseline | 0.5 day |
| Reconstruct loaders, parsers, types, brand map, and calculations | 1–2 days |
| Reconstruct dashboard, sales, purchase, stock, filters, and charts | 2–3 days |
| Reconstruct AI assistant and responsive styling | 1–1.5 days |
| Parity testing, visual comparison, edge cases, and preview validation | 1.5–2.5 days |
| **Total** | **6.5–10.5 engineer-days** |

If Vercel or another machine yields the original 28 source files, recovery and verification should fall to approximately **0.5–2 engineer-days**.

## 12. Final recovery status

- Original maintainable production source: **not recovered**
- Production deployment and aliases: **untouched**
- GitHub repository: **untouched**
- Packages installed: **none**
- Deployments/pushes: **none**
- Reconstruction started: **no**
- Authorized output created: `RECOVERY_REPORT.md`

