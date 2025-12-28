#!/bin/bash

# Turborepo Structure Verification Script

echo "🔍 Verifying Turborepo Structure..."
echo ""

# Check root files
echo "✓ Checking root configuration files..."
files_to_check=(
    "turbo.json"
    "tsconfig.base.json"
    "package.json"
    "README.md"
    "MIGRATION.md"
    "TURBOREPO_SETUP.md"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file MISSING!"
    fi
done

echo ""
echo "✓ Checking apps structure..."

# Check apps
apps=("backend" "admin" "mobile")
for app in "${apps[@]}"; do
    if [ -d "apps/$app" ]; then
        echo "  ✅ apps/$app/"
        if [ -f "apps/$app/package.json" ]; then
            echo "     ✅ package.json"
        else
            echo "     ❌ package.json MISSING!"
        fi
    else
        echo "  ❌ apps/$app/ MISSING!"
    fi
done

echo ""
echo "✓ Checking packages structure..."

# Check packages
packages=("ui" "shared" "utils" "config")
for pkg in "${packages[@]}"; do
    if [ -d "packages/$pkg" ]; then
        echo "  ✅ packages/$pkg/"
        if [ -f "packages/$pkg/package.json" ]; then
            echo "     ✅ package.json"
        else
            echo "     ❌ package.json MISSING!"
        fi
    else
        echo "  ❌ packages/$pkg/ MISSING!"
    fi
done

echo ""
echo "✓ Checking backend migration..."

backend_files=(
    "apps/backend/src"
    "apps/backend/config"
    "apps/backend/scripts"
    "apps/backend/.env"
    "apps/backend/datasource.ts"
    "apps/backend/nest-cli.json"
    "apps/backend/jest.config.js"
    "apps/backend/tsconfig.json"
)

for file in "${backend_files[@]}"; do
    if [ -e "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file MISSING!"
    fi
done

echo ""
echo "✓ Checking Turborepo installation..."
if command -v turbo &> /dev/null; then
    echo "  ✅ Turbo CLI installed"
    turbo --version
elif [ -f "node_modules/.bin/turbo" ]; then
    echo "  ✅ Turbo installed locally"
    npx turbo --version
else
    echo "  ❌ Turbo not found!"
fi

echo ""
echo "================================"
echo "✅ Structure verification complete!"
echo "================================"
echo ""
echo "📝 Next steps:"
echo "1. Test backend: npm run backend:dev"
echo "2. Clean up old files (optional)"
echo "3. Read TURBOREPO_SETUP.md for more info"
