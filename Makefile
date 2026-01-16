.PHONY: dev dev-admin backend admin mobile install clean help

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(CYAN)Quiz Game Makefile Commands:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

install: ## Install all dependencies
	@echo "$(CYAN)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

dev: ## Run mobile app (React Native)
	@echo "$(CYAN)Starting backend...$(NC)"
	npm run backend:dev
	@echo "$(CYAN)Starting mobile app...$(NC)"
	cd apps/mobile && npm start

backend: ## Run backend only
	@echo "$(CYAN)Starting backend...$(NC)"
	npm run backend:dev

dev-admin: ## Run backend and admin dashboard simultaneously
	@echo "$(CYAN)Starting backend...$(NC)"
	npm run backend:dev
	@echo "$(CYAN)Starting admin dashboard...$(NC)"
	cd apps/admin && npm run dev

admin: ## Run admin dashboard only
	@echo "$(CYAN)Starting admin dashboard...$(NC)"
	cd apps/admin && npm run dev

mobile: ## Run mobile app only (React Native)
	@echo "$(CYAN)Starting mobile app...$(NC)"
	cd apps/mobile && npm start

flutter-web: ## Run Flutter web app
	@echo "$(CYAN)Starting Flutter web app...$(NC)"
	@echo "$(YELLOW)Flutter Web:$(NC) http://localhost:5000"
	@echo ""
	cd apps/mobile_flutter && flutter run -d web-server --web-port 5000

flutter-mobile: ## Run Flutter mobile app
	@echo "$(CYAN)Starting Flutter mobile app...$(NC)"
	cd apps/mobile_flutter && flutter run

flutter-clean: ## Clean Flutter build artifacts
	@echo "$(CYAN)Cleaning Flutter build artifacts...$(NC)"
	cd apps/mobile_flutter && flutter clean
	@echo "$(GREEN)✓ Flutter cleaned$(NC)"

flutter-build-apk: ## Build Flutter release APK
	@echo "$(CYAN)Building Flutter release APK...$(NC)"
	cd apps/mobile_flutter && flutter build apk --release --dart-define=API_BASE_URL=https://book-api.hongphuc.top/api/
	@echo "$(GREEN)✓ Build complete: apps/mobile_flutter/build/app/outputs/flutter-apk/app-release.apk$(NC)"

flutter-install-apk: ## Install and launch Flutter APK on device
	@echo "$(CYAN)Uninstalling old app...$(NC)"
	adb uninstall com.quizgame.mobile_flutter || true
	@echo "$(CYAN)Installing new APK...$(NC)"
	adb install apps/mobile_flutter/build/app/outputs/flutter-apk/app-release.apk
	@echo "$(CYAN)Launching app...$(NC)"
	adb shell monkey -p com.quizgame.mobile_flutter -c android.intent.category.LAUNCHER 1
	@echo "$(GREEN)✓ Installation complete$(NC)"

flutter-deploy-apk: flutter-build-apk flutter-install-apk ## Build, install and launch Flutter APK

flutter-pub-get: ## Install Flutter dependencies
	@echo "$(CYAN)Installing Flutter dependencies...$(NC)"
	cd apps/mobile_flutter && flutter pub get
	@echo "$(GREEN)✓ Flutter dependencies installed$(NC)"

flutter-format: ## Format all Flutter code
	@echo "$(CYAN)Formatting Flutter code...$(NC)"
	cd apps/mobile_flutter && dart format lib/ test/ --line-length 80
	@echo "$(GREEN)✓ Flutter code formatted$(NC)"

flutter-analyze: ## Analyze Flutter code
	@echo "$(CYAN)Analyzing Flutter code...$(NC)"
	cd apps/mobile_flutter && flutter analyze
	@echo "$(GREEN)✓ Flutter analysis complete$(NC)"

flutter-fix: ## Auto-fix Flutter code issues
	@echo "$(CYAN)Auto-fixing Flutter code issues...$(NC)"
	cd apps/mobile_flutter && dart fix --apply
	@echo "$(GREEN)✓ Flutter fixes applied$(NC)"

build: ## Build all applications
	@echo "$(CYAN)Building all applications...$(NC)"
	npm run build
	@echo "$(GREEN)✓ Build complete$(NC)"

build-backend: ## Build backend only
	@echo "$(CYAN)Building backend...$(NC)"
	npm run backend:build
	@echo "$(GREEN)✓ Backend build complete$(NC)"

lint: ## Run linter on all applications
	@echo "$(CYAN)Running linter...$(NC)"
	npm run lint

format: ## Format code
	@echo "$(CYAN)Formatting code...$(NC)"
	npm run format
	@echo "$(GREEN)✓ Code formatted$(NC)"

format-check: ## Check code formatting
	@echo "$(CYAN)Checking code formatting...$(NC)"
	npm run format:check

test: ## Run tests
	@echo "$(CYAN)Running tests...$(NC)"
	npm run test

clean: ## Clean all node_modules and build artifacts
	@echo "$(CYAN)Cleaning project...$(NC)"
	npm run clean
	@echo "$(GREEN)✓ Project cleaned$(NC)"

migration-run: ## Run database migrations
	@echo "$(CYAN)Running database migrations...$(NC)"
	npm run backend:migration:run
	@echo "$(GREEN)✓ Migrations complete$(NC)"

migration-generate: ## Generate new migration
	@echo "$(CYAN)Generating migration...$(NC)"
	npm run backend:migration:generate

deploy: ## Deploy backend to VPS from local
	@echo "$(CYAN)Deploying backend to VPS...$(NC)"
	npm run deploy

create-admin: ## Create admin user
	@echo "$(CYAN)Creating admin user...$(NC)"
	cd apps/backend && npm run create:admin

deploy-admin: ## Deploy admin to Firebase Hosting
	@echo "$(CYAN)Deploying admin to Firebase...$(NC)"
	./deploy-admin.sh
