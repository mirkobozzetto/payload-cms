.PHONY: start stop dev build logs setup format lint typecheck check

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

format: ## Format code with Prettier
	pnpm exec prettier --write "src/**/*.ts"

lint: ## Lint and fix with ESLint
	pnpm exec eslint src/ --fix

typecheck: ## Run TypeScript type checker
	pnpm exec tsc --noEmit

check: ## Run all checks (format + lint + typecheck)
	pnpm exec prettier --write "src/**/*.ts"
	pnpm exec eslint src/ --fix
	pnpm exec tsc --noEmit

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
