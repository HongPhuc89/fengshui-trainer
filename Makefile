.PHONY: help up down build restart logs migrate makemigrations createsuperuser fake-data fake-data-clear format shell bash lock sync export-lock swagger-export frontend-install frontend-dev frontend-build frontend-deploy pre-commit-install pre-commit-run mobile-install mobile-dev mobile-build-apk mobile-build-apk-release mobile-clean mobile-analyze db-restore

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

collectstatic: ## Update admin css
	docker-compose -f $(COMPOSE_FILE) exec web python manage.py collectstatic

download_from_supabase: ## Download avatars and pdf file from Supabase and update the database
	docker-compose -f $(COMPOSE_FILE) exec web python manage.py download_from_supabase

encrypt-chapters: ## Encrypt chapters that have file_path but no encrypted_cdn_url
	docker-compose -f $(COMPOSE_FILE) exec web python manage.py encrypt_chapters

encrypt-chapters-force: ## Re-encrypt ALL chapters (increments encryption_version)
	docker-compose -f $(COMPOSE_FILE) exec web python manage.py encrypt_chapters --force

createsuperuser: ## Create a Django superuser
	docker-compose -f $(COMPOSE_FILE) exec web python manage.py createsuperuser

DB_BACKUP ?= data/backup.sql.gz

db-restore: ## Restore database from backup file (default: data/backup.sql.gz — override: make db-restore DB_BACKUP=path/to/file.sql.gz)
	gunzip -c $(DB_BACKUP) | docker-compose -f $(COMPOSE_FILE) exec -T db psql -U postgres -d fengshui_dev

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

frontend-deploy: ## Build and deploy frontend to Firebase Hosting
	cd $(FRONTEND) && npm run deploy

# --- Mobile (Flutter) ---
MOBILE = src/mobile
# Default env file — override: make mobile-dev ENV=env.staging.json
MOBILE_ENV ?= env.dev.json

mobile-install: ## Install Flutter dependencies
	cd $(MOBILE) && flutter pub get

mobile-dev: ## Run Flutter app (dev env — uses src/mobile/env.dev.json)
	cd $(MOBILE) && flutter run --dart-define-from-file=$(MOBILE_ENV)

mobile-build-apk: ## Build debug APK using env.dev.json
	cd $(MOBILE) && flutter build apk --debug --dart-define-from-file=$(MOBILE_ENV)

mobile-build-apk-release: ## Build release APK — requires ENV= (e.g. make mobile-build-apk-release ENV=env.prod.json)
	cd $(MOBILE) && flutter build apk --release --dart-define-from-file=$(MOBILE_ENV)

mobile-clean: ## Clean Flutter build cache
	cd $(MOBILE) && flutter clean && flutter pub get

mobile-analyze: ## Run Flutter static analysis
	cd $(MOBILE) && flutter analyze --no-fatal-infos
