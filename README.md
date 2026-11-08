# HomeLink Africa

Verified stays, cars and days out in Kigali. The front end runs on fixtures
behind `src/lib/repos`; search runs on Meilisearch, with a built-in engine
over the same fixtures when Meilisearch is not running.

Start with `AGENTS.md`, which points at the current milestone.

## Running it

In Docker, which is the house default:

```bash
make up        # web on http://localhost:3100, Meilisearch on :7710
make check     # typecheck, lint and tests, inside the web container
make logs      # follow the web server
make down
make           # list every target
```

The first `make up` installs dependencies into a named volume and takes a few
minutes. After that it starts in seconds. Run `make search-reset` after
editing fixtures so the index is rebuilt.

On the host, with no containers at all:

```bash
make host-install
make host-dev     # uses Meilisearch if it is up, else the built-in engine
make host-test
```

`docker compose up -d meilisearch` starts search on its own for a host dev
server. Both copies of the web app want port 3100; `make up PORT=3101` runs the
container on another one.

## Search

`src/lib/search/parse.ts` turns a sentence into filters: place (with typo
tolerance and landmarks such as "near the convention centre"), bedrooms,
party size, a price ceiling in any of the four currencies, amenities, lease,
dates and sort. The palette (⌘K or `/`) prints that reading as chips before it
shows results, and the results page turns it into ordinary URL parameters.
When nothing matches, constraints are relaxed one at a time and the page says
which one went.

## Map tiles

Maps use OpenStreetMap's standard tiles, which allow light use with
attribution. Production traffic needs a tile provider; set
`NEXT_PUBLIC_MAP_TILES` to its URL template (`{z}`, `{x}`, `{y}`).
