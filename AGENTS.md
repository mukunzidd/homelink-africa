<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- Everything below sits outside the managed block above, which `next dev`
     replaces by marker. Content here is preserved. -->

# Where the work is

**Read `docs/superpowers/specs/2026-11-08-booking-workspace-design.md` first.**
It is the pass that built the whole product on fixtures (booking flow, trip
cart, every workspace page per role, sign-in, settings, help) and its plan,
`docs/superpowers/plans/2026-11-08-booking-workspace.md`, is built through
Task 47. Its "Review and fixes" section holds what the sweeps found and the
traps behind them, and its **"Open issues"** section lists everything known
to be wrong or unfinished, with evidence and a next step for each: start
there. The whole-branch review ran on 2026-11-09; its Critical and
Important findings are fixed, its minors and rulings are listed there.

**Then `docs/superpowers/specs/2026-08-10-real-data-milestone.md`**, which is
paused behind it. It holds the next milestone, what "done" means for each step,
the scope decisions already taken, and the open ones. It is kept ticked off as
work lands, so it is the fastest way to find out where things stopped.

`docs/superpowers/specs/2026-08-09-ui-milestone.md` is the one before it, and is
finished. Worth reading anyway: it carries the findings from two full browser
sweeps, the arguments behind several decisions that look arbitrary in the code,
and three measuring traps that will otherwise be rediscovered the hard way.

Short version: the app is a front end on fixtures. There is no backend, no auth,
no payments, no realtime. It runs in Docker (`make up`, port 3100). `npm test`
is Vitest over the domain and the fixture repos; `make e2e` walks 15 journeys
in Playwright and `make sweep` opens every screen per role, width, theme and
language and reports what a person would notice. Both need the dev stack, which
compose starts with `HOMELINK_E2E=1` so they can reset the store. The UI milestone finished
the UI and walked every journey in a browser *before* any of that got built, so
the schema is designed against screens people have actually looked at. The
current one puts those same screens on Postgres without moving any of them.
`src/lib/repos/index.ts` is the single swap point; new screens read through
`repos()` like the rest.

The planning documents in `docs/01`–`docs/03` used to describe a
foundations-first sequence the build had not followed. They no longer do:
Product & UX §10 and Technical Plan §11 were rewritten to split Phase 0 into
surfaces-then-foundations and to say why. Phase numbers elsewhere in the code
still refer to the original four, deliberately — several dozen comments say
"Phase 2 replaces this" and renumbering would have invalidated all of them.

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
