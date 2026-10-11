# monday clone — build progress

Goal: a working monday.com-style work management app (Next.js 16.4, React 19.3,
Tailwind v4, Zustand + localStorage persistence, no backend). **Status: complete.**

## Done

- [x] Core lib: types, colors, dates, column registry, seed data, templates, store (persist + undo), automations, filters, CSV
- [x] App shell: static frame + browser-only islands, sidebar, top bar, ⌘K palette, notifications, toasts, dialogs
- [x] Board: header, view tabs, toolbar (search / person / filter / sort / hide), automations center, activity log, archive
- [x] Main table: groups, 11 column types, inline editing, add item, summary row, row/column DnD, resize, batch actions
- [x] Subitems: own columns, nested table, item-card tab, My Work, cascade on delete/archive/duplicate/move
- [x] Item card: updates (mentions, likes, replies, pin, edit), info tab, subitems tab, activity log
- [x] Views: Kanban, Calendar, Timeline (Gantt), Chart
- [x] Pages: Home, My Work
- [x] Tests: `npm test` (33 Vitest unit tests), `npm run test:e2e` (27 Playwright e2e tests) — all passing
- [x] Verified: `npm run build`, `npm run lint`, typecheck clean; light/dark/night screenshots reviewed
- [x] README with screenshots (`docs/screenshots/`)

## Ideas for later

- Sync to a real backend (the model in `src/lib/model.ts` is pure and could run on a server)
- Formula / dependency columns, file uploads, board permissions, drag to reorder groups and boards

## Notes

- Data lives in localStorage under key `monday-clone`. Every data-driven part renders
  in the browser only via `<BrowserOnly>` (`use(browser())`, react-dom 19.3) inside
  `<Suspense>`; the root layout is a static frame (see `src/app/layout.tsx`).
- Next keeps up to 3 visited routes mounted but hidden (Activity) — e2e locators
  must use `:visible`.
- Next 16 docs are bundled in `node_modules/next/dist/docs/` — read them before using new APIs.
