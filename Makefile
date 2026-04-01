.PHONY: start stop dev build logs db-reset setup

start: ## Start database and dev server
	docker compose up -d
	pnpm dev

stop: ## Stop everything
	docker compose down

dev: ## Start dev server only (assumes database is running)
	pnpm dev

build: ## Build for production
	pnpm build

logs: ## Show database logs
	docker compose logs -f

setup: ## First-time setup
	cp -n .env.example .env || true
	docker compose up -d
	pnpm install

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
