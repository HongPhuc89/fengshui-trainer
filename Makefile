.PHONY: help up down build restart logs migrate makemigrations createsuperuser format shell bash

COMPOSE_FILE = docker/docker-compose.yml

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

format: ## Format code using Ruff
	docker-compose -f $(COMPOSE_FILE) exec web ruff format .

lint: ## Lint code using Ruff
	docker-compose -f $(COMPOSE_FILE) exec web ruff check .

shell: ## Open a Django shell
	docker-compose -f $(COMPOSE_FILE) exec web python manage.py shell

bash: ## Open a bash terminal inside the web container
	docker-compose -f $(COMPOSE_FILE) exec web /bin/bash
