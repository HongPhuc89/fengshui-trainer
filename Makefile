.PHONY: help up down build restart logs migrate makemigrations createsuperuser fake-data fake-data-clear format shell bash lock sync export-lock swagger-export frontend-install frontend-dev frontend-build pre-commit-install pre-commit-run

COMPOSE_FILE = docker/docker-compose.yml
BACKEND = src/backend
FRONTEND = src/frontend

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

up: ## Start the containers in the background
	docker-compose -f $(COMPOSE_FILE) up -d

# down: ## Stop and remove the containers
# 	docker-compose -f $(COMPOSE_FILE) down

build: ## Build the containers
	docker-compose -f $(COMPOSE_FILE) build

restart: ## Restart the containers
	docker-compose -f $(COMPOSE_FILE) restart

logs: ## Tail the logs from all containers
	docker-compose -f $(COMPOSE_FILE) logs -f

migrate: ## Run Django database migrations
	docker-compose -f $(COMPOSE_FILE) exec web python manage.py migrate

makemigrations: ## Create new Django migrations
	docker-compose -f $(COMPOSE_FILE) exec web python manage.py makemigrations

createsuperuser: ## Create a Django superuser
	docker-compose -f $(COMPOSE_FILE) exec web python manage.py createsuperuser

fake-data: ## Import fake data for development (idempotent)
	docker-compose -f $(COMPOSE_FILE) exec web python manage.py import_fake_data

fake-data-clear: ## Clear and re-import fake data
	docker-compose -f $(COMPOSE_FILE) exec web python manage.py import_fake_data --clear

format: ## Format code using Ruff
	docker-compose -f $(COMPOSE_FILE) exec web ruff format .

lint: ## Lint code using Ruff
	docker-compose -f $(COMPOSE_FILE) exec web ruff check .

shell: ## Open a Django shell
	docker-compose -f $(COMPOSE_FILE) exec web python manage.py shell

bash: ## Open a bash terminal inside the web container
	docker-compose -f $(COMPOSE_FILE) exec web /bin/bash

# --- Backend deps (uv lock) ---
lock: ## Lock backend deps: uv lock (writes uv.lock)
	cd $(BACKEND) && uv lock

lock-upgrade: ## Upgrade all backend deps and re-lock
	cd $(BACKEND) && uv lock --upgrade

sync: ## Install backend deps from lock: uv sync (use after lock)
	cd $(BACKEND) && uv sync

export-lock: ## Export uv.lock to requirements-lock.txt (pip-compatible)
	cd $(BACKEND) && uv export --no-emit-package fengshui-backend --no-dev -o requirements-lock.txt

swagger-export: ## Export OpenAPI schema to postman/api_schema.json
	docker-compose -f $(COMPOSE_FILE) exec -T web python manage.py spectacular --format openapi-json > postman/api_schema.json
	@echo "Schema exported to postman/api_schema.json"

# --- Pre-commit hooks ---
pre-commit-install: ## Install pre-commit hooks (run once after cloning)
	cd $(BACKEND) && uv run pre-commit install

pre-commit-run: ## Run pre-commit hooks on all files
	cd $(BACKEND) && uv run pre-commit run --all-files

# --- Frontend (Vue) ---
frontend-install: ## Install frontend npm dependencies
	cd $(FRONTEND) && npm install

frontend-dev: ## Run frontend dev server (Vite, proxy /api to backend)
	cd $(FRONTEND) && npm run dev

frontend-build: ## Build frontend for production
	cd $(FRONTEND) && npm run build
