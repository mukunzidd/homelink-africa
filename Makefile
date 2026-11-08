# The documented way to drive HomeLink. `make` alone lists the targets.
#
# Docker is the default: `make up` runs the web app and Meilisearch, and the
# check targets run inside the web container so they see the same Linux
# toolchain CI will. The `host-*` targets are for working without containers;
# search then falls back to the built-in engine.

SHELL      := /bin/bash
COMPOSE    := docker compose
EXEC       := $(COMPOSE) exec web
MEILI_KEY  := homelink-dev-master-key-not-a-secret
PORT       ?= 3100

.DEFAULT_GOAL := help
.PHONY: help up down restart logs ps sh install test test-watch lint typecheck check build \
        search-reset host-install host-dev host-test

help: ## List the targets
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  \033[1m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Start web and Meilisearch, wait until they answer
	HOMELINK_PORT=$(PORT) $(COMPOSE) up -d --wait
	@echo
	@echo "  HomeLink     http://localhost:$(PORT)"
	@echo "  Meilisearch  http://localhost:7710  (key: $(MEILI_KEY))"

down: ## Stop the stack
	$(COMPOSE) down

restart: ## Restart the web container
	$(COMPOSE) restart web

logs: ## Follow logs; `make logs svc=meilisearch` for another service
	$(COMPOSE) logs -f $(or $(svc),web)

ps: ## Show container status
	$(COMPOSE) ps

sh: ## Shell inside the web container
	$(EXEC) bash

install: ## Reinstall dependencies inside the container, after the lockfile changes
	$(EXEC) sh -c "npm ci --no-audit --no-fund && cp package-lock.json node_modules/.lock-snapshot"

test: ## Run the test suite in the container
	$(EXEC) npx vitest run

test-watch: ## Tests in watch mode, in the container
	$(EXEC) npx vitest

lint: ## ESLint, in the container
	$(EXEC) npx eslint src

typecheck: ## TypeScript, in the container
	$(EXEC) npx tsc --noEmit -p .

check: typecheck lint test ## Typecheck, lint and test

build: ## Production build, in a throwaway container so the dev server keeps running
	$(COMPOSE) run --rm --no-deps web npx next build

search-reset: ## Drop the search index; the app rebuilds it on the next search
	-curl -sf -X DELETE -H "Authorization: Bearer $(MEILI_KEY)" http://localhost:7710/indexes/supply >/dev/null
	$(COMPOSE) restart web

host-install: ## npm ci on the host, no containers
	npm ci

host-dev: ## Dev server on the host; uses Meilisearch if it is running, else the built-in engine
	MEILI_URL=http://127.0.0.1:7710 MEILI_MASTER_KEY=$(MEILI_KEY) npx next dev -p $(PORT)

host-test: ## Tests on the host
	npx vitest run
