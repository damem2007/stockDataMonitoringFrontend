# Changelog

## 2026-08-20

### Frontend

#### Added
- Added browser-local guest workspace storage for watchlist instruments and alerts; guest data is identified only by local browser storage and disappears when that storage is cleared.
- Added a chart-type menu modeled after the reference chart controls, with Line, Candle, Baseline, Mountain, and Bar options.
- Added point-hover chart tooltips with date/time, OHLC, and volume values.
- Added explicit ticker/company suggestion menus for watchlist and onboarding inputs, replacing browser datalist behavior.
- Added the redesigned landing page flow from `landing_page_recommendation.html`, including capability chips, symmetric Watchlist/Portfolio cards, delayed portfolio sign-in fields, and a single guest workspace CTA that changes between `Create workspace` and `Open workspace` based on browser-local watchlist storage.
- Added an eye-icon password visibility toggle in place of text-only `Show` / `Hide` controls.
- Added the proposed Watchlist dashboard layout from `watchlist_ia_recommendation.html`: top navigation, filters-only sidebar, enriched watchlist rows, current-price/change placeholders, signal badges, sparklines, and explicit `View signal` drill-down actions.
- Added the proposed Portfolio dashboard layout from `portfolio_dashboard_corrected.html`: aggregate cards, allocation donut, return/loss bars, category exposure, portfolio-level execution plan rows, and inference notes.
- Added the proposed contextual instrument page structure from `consolidated_navigation_in_context.html`: Watchlist/Portfolio breadcrumb, instrument-scoped tabs, portfolio-only holding metrics, `Sync Instrument`, and instrument-level alert creation.
- Added a `Fit with portfolio` tab that explains selected-instrument signal/regime context against portfolio allocation and unrealized P/L when the ticker is an active holding.
- Added CAD/USD currency handling, with TSX instruments formatted in CAD.
- Added full-screen loading overlays during workspace sync, onboarding save, temporary comparison loading, alerts, and sign-in.
- Added instrument-level navigation for Summary, Signal, Chart, ML Model, Backtest, Fit with Portfolio, News, Correlation, Alerts, and Data Sources.
- Added interpreted panels for ML Model, Correlation, Backtest, and Portfolio Risk instead of raw JSON-only output.
- Added intraday 1D chart support with time-of-day x-axis labels.
- Added API-backed ticker autocomplete for onboarding and left-panel ticker entry.
- Added a workspace-level Portfolio Dashboard as the parent view for logged-in users, with holdings, metrics, allocation, returns, sector exposure, inference notes, and execution plans.
- Added a workspace-level Watchlist Dashboard for guest/watchlist research.
- Added click-through instrument drill-down from portfolio/watchlist rows.
- Added a full-width Alerts board with add-alert action and modal alert creation.
- Added a filters-only watchlist sidebar using the visual language of `/Users/damidahunsi/ba_artifacts_auto/frontend`.
- Added toast notifications for API, sign-in, alert, and instrument persistence errors so failures surface without taking over dashboard content.
- Added a project-native password field to the sign-in form without introducing external UI dependencies.

#### Changed
- Changed guest workflow semantics: guests can search, analyze, and maintain a local watchlist, but database-saved watchlists and portfolio dashboards require sign-in.
- Changed guest workspace identity to browser-local storage only; the landing page now uses one workspace CTA that opens saved local watchlist data when present.
- Changed ticker entry so typed symbols remain authoritative; autocomplete suggestions now complement typing and only take over when selected or when a fresh company-name search result is available.
- Changed landing and sidebar wording from ambiguous “existing workspace” language to explicit local-browser and signed-in account persistence.
- Changed unsigned startup behavior to show the redesigned landing choice screen first; signed-in users still open directly into their dashboard.
- Changed instrument Intent and Strategy from read-only fields into persisted selectors using the existing `Intent` and `Strategy` values that drive analysis, execution plans, and recommendations.
- Changed the dashboard hierarchy so Watchlist and Portfolio are parent dashboards, while Summary, Signal, Chart, Alerts, ML Model, Correlation, News, Backtest, Fit with Portfolio, and Data Sources are instrument-level child views.
- Changed the left-side experience from a duplicated ticker navigation rail into a filters/add/remove watchlist sidebar, with instrument drill-down now initiated from Watchlist and Portfolio rows.
- Changed Portfolio so `Add holding` and `Sync Workspace` live in the Portfolio header, while `Sync Instrument` lives only on the selected instrument page.
- Changed Watchlist promotion so `Add to portfolio` appears on watchlist rows instead of inside the Portfolio dashboard.
- Changed portfolio execution plans into a compact portfolio-level table that reads existing `build_signal()` output across holdings and links each row into its instrument detail page.
- Changed frontend dev port to `8520` to avoid conflicts with the existing local app.
- Updated frontend API base URL to `http://127.0.0.1:8020`.
- Changed trading onboarding so book cost is displayed as a computed value from `average purchase price * shares`.
- Changed dashboard startup so the app opens directly into the usable dashboard workflow after initial load.
- Changed chart analysis requests so 1D range uses intraday Yahoo history.
- Confirmed the frontend runtime remains Node/npm only via `npm run dev`.
- Changed instrument navigation so Portfolio is no longer a child menu item under a selected ticker.
- Changed selected instrument header action from `Sync Workspace` to `Sync Instrument`; workspace sync now lives on the Portfolio dashboard.
- Changed `Add holding` into a Portfolio dashboard action instead of a selected-instrument header action.
- Changed watchlist rows so signed-in users can promote a ticker into the portfolio onboarding workflow.
- Changed onboarding Back behavior so dashboard-launched portfolio/watchlist edits return to the originating dashboard view instead of the landing workflow.
- Changed portfolio/watchlist onboarding to use draft rows instead of replacing the active workspace instruments while the user is still editing.
- Changed onboarding exit wording to `Back to start` only for launch-screen onboarding and `Cancel` for dashboard-launched onboarding, removing the false wizard implication.
- Changed newly added shell/sidebar/auth utility files to project-native stock-dashboard code and removed copied BA-project dependencies and placeholder module routes.
- Changed frontend auth role typing to support `superadmin`, `admin`, `user`, and `guest`.
- Removed unused component/lib artifacts that were not wired into the stock dashboard workflow.
- Changed the default frontend dev script to clear generated Next.js artifacts before startup and bind to `127.0.0.1:8520`; added `dev:fast` for incremental local starts.

#### Fixed
- Cleared the stale generated Next.js build output that caused `Cannot find module './833.js'` and verified a clean production build.
- Fixed recurring `Cannot find module './833.js'` dev-server failures by making `npm run dev` start from a clean generated Next.js cache.
- Fixed Add holding so React click events are not accidentally stored as ticker symbols, preventing the `trim is not a function` crash during holding onboarding.
- Removed the stale `Step 2` label from portfolio/watchlist onboarding because signed-in users can move directly between Watchlist and Portfolio dashboards.
- Fixed a React hydration mismatch by replacing render-time random ticker datalist IDs with React `useId`.
- Fixed stale focused-instrument responses so a slower previous analysis request can no longer render `SNDK` details under an `INTC` header.
