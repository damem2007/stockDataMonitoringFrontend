# Changelog

## 2026-09-01

### Frontend

#### Added
- Added a reusable `NotificationCenter` class to centralize notification construction and make future notification sources easier to add.
- Added persisted notification activity events for authenticated alert create/delete actions, with CTAs back to the relevant alert workspace.

#### Changed
- Changed portfolio notifications to classify triggered alerts as red, portfolio inference as red/amber based on impact, and account/activity updates as friendly.
- Changed the notification menu so `What's new` is reserved for system/product updates and no longer mirrors unread trading notifications.
- Changed add-holding, watchlist onboarding, portfolio modal actions, portfolio rename, alert actions, account forms, and instrument chart/header actions to disable with inline loaders while their first click is still processing.
- Changed portfolio row action buttons for Add more, Transfer, and Liquidate so they are disabled while another portfolio action is processing.
- Changed add-holding save to force a scoped workspace sync before returning to Portfolio so new holdings refresh portfolio inference, notifications, and dashboard metrics from the latest saved state.
- Changed add-holding success copy to `Instrument {symbol} has been added to {portfolio_name}` and suppress the follow-up rename toast when both actions happen together.
- Changed allocation colors to assign unique instrument colors from avatar colors first, then generated non-duplicate fallback colors; sector colors now use unique avatar-palette colors by sector.

#### Fixed
- Fixed alert creation so the backend ignores stale client-sent alert IDs and protects alert writes from duplicate primary keys before inserting into the database.
- Fixed alert creation to be idempotent for duplicate create clicks by returning an existing identical alert instead of inserting another record.
- Fixed Add Alert draft state so opening a fresh alert no longer reuses the ID from a previously opened alert.
- Fixed alert modal submission so the create-alert loader waits for the real async save instead of ending immediately.
- Fixed the dedicated login/account submit paths so rejected async actions are caught by the caller after the shared provider reports the toast.

## 2026-08-30

### Frontend

#### Added
- Added a top-nav notification bell that classifies triggered price alerts as red, portfolio recommendations as amber, and account notices as friendly.
- Added CTAs to portfolio inference notes and notification rows when a useful instrument/account destination exists.

#### Changed
- Changed notification IDs to stable alert/account/portfolio-insight identities so previously read items stay read across sessions instead of reappearing when text or trigger time changes.
- Changed the notification dropdown to group items by "What's new", "Today", "This week", "Last 30 days", and "Earlier".
- Changed the registered-user sign-out toast so it only appears when signing out from Watchlist, where the user automatically continues in guest mode.
- Changed the public landing page header/theme toggle layout and mobile spacing so the day/night control stays aligned with the theme.
- Changed initial workspace hydration to load saved portfolio/watchlist data before rendering the dashboard, while avoiding forced live refresh work on the first account load.
- Changed notifications to be available only for authenticated users, with guest sessions continuing without a notification bell.
- Changed portfolio notifications to use a compact amber pointer when dashboard inference needs review, keeping the detailed portfolio analysis in the Portfolio Insights panel.
- Changed notification behavior so the bell badge counts unread items and individual notification line items turn into a muted read state after they are opened.
- Changed the profile pill from a static risk label to a dynamic portfolio behavior indicator with an explanatory tooltip.
- Changed account verification resend so expired links request a new link from the URL token first, only asking for email or username when the token is missing or cannot identify an account.
- Changed portfolio holding summaries to show user-local time with UTC when the quote timestamp crosses the local/UTC date boundary.

#### Fixed
- Fixed Watchlist dashboard position trends disappearing after the holdings-table restyle by adding watchlist table theme-token scope and sparkline color fallbacks.

## 2026-08-29

### Frontend

#### Added
- Added a system-aware Day/Night theme provider with a top-nav theme toggle.
- Added holding row expanders with performance summaries and links to \`/portfolio/{symbol}/summary\`.
- Added execution plan expanders with links to \`/portfolio/{symbol}/signal\`.
- Added a public \`/account-verification\` page for account verification email links.
- Added a guest avatar dropdown with account creation and sign-out actions.

#### Changed
- Changed the workspace shell and top navigation to use the full browser width with matching gutters.
- Changed loader, toast, portfolio dashboard, and instrument Summary/Signal/Chart styling to use shared theme tokens.
- Changed portfolio instrument Summary, Signal, and Chart tabs to a much more advanced UI/UX structure while preserving live data wiring.
- Changed the shared instrument header, portfolio position metrics, position actions, controls, and tab strip to match the rounded dark UI/UX treatment.
- Changed ML Model, Backtest, Fit with portfolio, News, Correlation, Alerts, and Data Sources to use the same shared instrument panel theme.
- Changed portfolio instrument metrics so Unrealized P/L remains in the desktop row instead of wrapping into unused whitespace.

#### Fixed
- Fixed low-contrast holding action buttons by overriding global button sizing and strengthening icon-button contrast.
- Fixed Summary empty-state token scoping so the tab no longer falls back to an unstyled light appearance.
- Fixed the missing divider between portfolio position actions and instrument controls.


## 2026-08-28

### Frontend

#### Added
- Added a dedicated `/login` screen with sign-in, account creation, and a `Use as guest` path back into the browser-local watchlist workflow.
- Added portfolio rename support so the portfolio dashboard can represent a named account/container.
- Added portfolio CRUD actions for adding more stock, transferring a holding, and liquidating a holding.
- Added the same Add more stock / Transfer / Liquidate actions to portfolio instrument detail pages.
- Added purchase/activity history on the portfolio dashboard so original buys, transfers, liquidations, and notes are visible.
- Added dynamic mini position charts to portfolio holding rows using synced portfolio trend data.
- Added account profile, security/password, subscription, and invoice screens backed by the new account APIs.
- Added the dark StockSignal portfolio theme across the app shell, including the portfolio hero range selector and themed sector exposure bars.

#### Changed
- Changed portfolio onboarding copy and action labels from creating a dashboard to saving holdings into a named portfolio.
- Changed protected-route redirects to use the real `/login` route while leaving guest-capable watchlist flows available after sign-out.
- Changed frontend refresh interval handling to read `NEXT_PUBLIC_REFRESH_INTERVAL_SECOND` or `NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS`.
- Changed the instrument chart viewport so each selected date range keeps today/current time as the upper bound while supporting wheel zoom, drag panning, and larger readable candlesticks.
- Changed the portfolio dashboard hero chart to aggregate synced holding trend data when a dedicated portfolio value-history series is not available.

#### Fixed
- Fixed the half-implemented portfolio rename provider path that could leave `renamePortfolio` orphaned during builds.
- Fixed session restoration so expired JWTs are cleared client-side and the user can continue as guest or sign in again.
- Fixed a chart regression where the new Yahoo-style chart referenced missing zoom-domain helpers at runtime.

## 2026-08-20

### Frontend

#### Added
- Added a scoped 30-second dashboard sync loop that refreshes only the instruments already in the current workspace/watchlist instead of scanning broad market lists.
- Added immediate guest watchlist sync after local save/add actions so computed prices, daily move, and trends populate without waiting for the interval.
- Added watchlist headers and dynamic mini trend charts based on fetched close-price series.
- Added a readable News tab card layout with source, publication time, title, clean summary, sentiment, matched aliases, and source links.
- Added an interpreted Data Sources tab that renders price history, profile, earnings, and news provenance in tables instead of raw JSON.
- Added richer ML Model and Backtest panels that interpret RSI14, ADX14, directional indicators, MACD histogram, validation, and walk-forward results.
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
- Changed the `Sync Workspace` action to call the scoped sync endpoint while leaving the manual button visible.
- Changed portfolio and watchlist mini charts to read from live 5-minute sync data while deeper analysis continues to use the longer analytical history.
- Changed the instrument chart toward a Yahoo Finance-style layout with a right-side price scale, light plot well, vertical gridlines, current-price marker, OHLC strip, and volume underlay.
- Changed sign-out behavior so guest-capable pages can continue after logout, while protected portfolio/account routes redirect to the existing landing-page sign-in flow.
- Changed protected-route redirects from missing `/login` routes to `/?signin=1&next=...`.
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
- Updated frontend API base URL to `http://192.168.1.67:8020`.
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
- Changed the default frontend dev script to clear generated Next.js artifacts before startup and bind to `192.168.1.67:8520`; added `dev:fast` for incremental local starts.

#### Fixed
- Fixed the custom chart so the Y-axis renders price labels and the X-axis labels are generated from the selected date range ending at the current time/today.
- Fixed the News tab horizontal overflow by replacing the generic table with a vertical source-card list.
- Fixed watchlist rows that stayed at `Sync pending` after guest/local changes by syncing scoped instruments immediately.
- Cleared the stale generated Next.js build output that caused `Cannot find module './833.js'` and verified a clean production build.
- Fixed recurring `Cannot find module './833.js'` dev-server failures by making `npm run dev` start from a clean generated Next.js cache.
- Fixed Add holding so React click events are not accidentally stored as ticker symbols, preventing the `trim is not a function` crash during holding onboarding.
- Removed the stale `Step 2` label from portfolio/watchlist onboarding because signed-in users can move directly between Watchlist and Portfolio dashboards.
- Fixed a React hydration mismatch by replacing render-time random ticker datalist IDs with React `useId`.
- Fixed stale focused-instrument responses so a slower previous analysis request can no longer render `SNDK` details under an `INTC` header.
