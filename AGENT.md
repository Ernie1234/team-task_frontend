# AGENT.md: Team Task web app

Guidance for AI coding agents (and humans) working in this repository.

## Project

Team Task is a real-time team workspace: ClickUp-style tasks, Slack-style chat, Notion-style notes and a Notion Calendar-style calendar with Google Calendar sync. Two repositories, usually checked out side by side:

- `frontend/`: this repo, the React web app ([team-task_frontend](https://github.com/Ernie1234/team-task_frontend))
- `backend/`: the API ([team-task_backend](https://github.com/Ernie1234/team-task_backend)), Bun + Express + MongoDB + Socket.IO

## Commands

```bash
bun install          # dependencies (bun.lock is the lockfile)
bun run dev          # dev server on http://localhost:5173 (API on :3000)
npx tsc -b           # type-check
bun run lint         # ESLint (4 react-refresh warnings in shadcn files are expected)
bun run build        # type-check + production build
```

Before finishing any change: type-check, lint and build must pass.

## Stack and conventions

- React 18, TypeScript, Vite, Tailwind CSS 3, shadcn/ui (Radix primitives in `src/components/ui`).
- **Server state:** TanStack Query. One hook file per area in `src/hooks/api` (`use-tasks.ts`, `use-notes.ts`, `use-calendar.ts`…). Mutations update the cache optimistically and roll back on error.
- **API calls** live in `src/lib/api.ts`; types in `src/types/api.type.ts`.
- **Live updates:** `src/lib/socket.ts` forwards server events; listen with `socketService.on(event, cb)` in a hook and invalidate or patch the query cache.
- **URL state** (filters, view, open item) uses `nuqs`.
- **Zustand:** selectors must never return a new array or object each call (use shared constants such as `NO_TYPERS`), or React re-renders forever.
- **Theming:** use design tokens only (`bg-primary`, `text-primary`, `from-primary to-primary-2`, `bg-sidebar`, `text-muted-foreground`…). No hard-coded brand colours such as `violet-500`; status and priority colours in `src/lib/task-meta.ts` are the exception. Tokens are computed in `src/lib/appearance.ts`.
- **Page layout:** use `PageHeader` and `SectionCard` (`src/components/shared/page-header.tsx`) and `StatCard`, so pages look the same. Full-height pages (chat, notes, calendar) are listed in `layout/app.layout.tsx`.
- **Heavy code loads lazily:** the BlockNote editor (`components/editor/rich-editor.tsx`) is only imported through `React.lazy`.
- **Global dialogs** (event editor, settings) are opened through stores (`use-event-dialog.ts`, `useAppearanceStore().openSettings`).
- Copy in the UI: sentence case, plain verbs, explain errors and how to fix them.

## Git and commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <summary>

<optional body: what changed and why, wrapped at 72 characters>
```

- **Types:** `feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `build`, `ci`, `chore`, `revert`. Breaking changes: `feat!:` plus a `BREAKING CHANGE:` footer.
- **Summary:** imperative mood ("add", not "added"), lowercase, no full stop, 72 characters at most.
- **Scope** (optional) is the feature area: `tasks`, `chat`, `notes`, `calendar`, `auth`, `account`, `theme`, `dashboard`, `notifications`, `api`.
- One logical change per commit. Use the body for the why and a short bullet list when a commit touches several areas.
- **Never add co-author trailers or AI attribution** (no `Co-Authored-By:` lines, no "Generated with…" lines) to commits or pull requests.
- Author: `Ernie1234 <anumahjoshuaeneye@gmail.com>`.
- Never commit `.env`, secrets, `uploads/`, `logs/`, `node_modules/` or build output.
- Default branch is `master`. Remotes use SSH, so pushing happens from the developer's own machine.

Examples:

```
feat(calendar): add two-way google calendar sync
fix(tasks): keep subtask counts when filtering by assignee
docs: tick off redis sessions in the roadmap
```

## README upkeep (required)

The READMEs double as the project's feature list and roadmap, and they are what employers read.

- When a feature ships, add it under **Features** as `- [x]`.
- When a roadmap item is done, change its `- [ ]` to `- [x]` in the frontend README **and**, if it is listed there, the backend README.
- Keep environment variables, scripts and setup steps in the READMEs in sync with the code.
- Make the README update in the same push as the feature (its own `docs:` commit is fine).
