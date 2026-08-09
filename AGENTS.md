<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- Everything below sits outside the managed block above, which `next dev`
     replaces by marker. Content here is preserved. -->

# Where the work is

**Read `docs/superpowers/specs/2026-08-09-ui-milestone.md` before starting.** It
holds the current milestone, what "done" means for each step, the scope
decisions already taken, and the open ones. It is kept ticked off as work lands,
so it is the fastest way to find out where things stopped.

Short version: the app is a front end on fixtures. There is no backend, no auth,
no payments, no realtime — `package.json` has four dependencies. The current
milestone finishes the UI and walks every journey in a browser *before* any of
that gets built, so the schema is designed against screens people have actually
looked at. `src/lib/repos/index.ts` is the single swap point where fixtures
become a database later; new screens read through `repos()` like the rest.

The planning documents in `docs/01`–`docs/03` describe a foundations-first
sequence the build has not followed. That divergence is deliberate; rewriting
those documents to match is the last step of the milestone, not a fix to make
along the way.

## House conventions

- **Measure, do not assume.** Layout claims get checked against the rendered
  page, not the CSS. Headless Chrome is available and `--screenshot` works. Two
  bugs in the header survived review because the arithmetic looked right.
- **Look at every image before committing it.** Subjects get verified by opening
  the file, never trusted from a filename or an ID. This has caught wrong
  continents and a wrongly-licensed file.
- **Commit messages carry the reasoning**, especially why an obvious-looking
  alternative was rejected. Several files here are the way they are because the
  tidier version was tried and measured worse; that argument lives in the log.
