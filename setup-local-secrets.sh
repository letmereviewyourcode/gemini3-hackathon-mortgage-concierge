#!/bin/bash
echo "🔐 Setting up Local Developer Secrets..."

# Create .env.local if not exists
if [ ! -f .env.local ]; then
    touch .env.local
fi

# Add/Update DEMO_ACCESS_TOKEN
if grep -q "DEMO_ACCESS_TOKEN" .env.local; then
    # OS agnostic replacement
    sed -i.bak 's/DEMO_ACCESS_TOKEN=.*/DEMO_ACCESS_TOKEN=GeminiJudge2026/' .env.local && rm .env.local.bak
else
    echo "DEMO_ACCESS_TOKEN=GeminiJudge2026" >> .env.local
fi

echo "✅ Secret added to .env.local"
echo "   Run 'npm run dev' to use it."
