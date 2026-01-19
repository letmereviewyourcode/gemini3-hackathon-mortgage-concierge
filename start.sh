#!/bin/bash
# Gemini Mortgage Concierge - Standalone Start Script
# For Gemini 3 AI Developer Competition

set -e

echo "🚀 Starting Gemini Mortgage Concierge"
echo "=================================="

# Check for .env
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env with your GEMINI_API_KEY"
    exit 1
fi

# Check for GEMINI_API_KEY
if ! grep -q "GEMINI_API_KEY=." .env 2>/dev/null; then
    echo "❌ GEMINI_API_KEY not set in .env"
    exit 1
fi

echo "✅ Environment configured"

# Install dependencies if needed
install_if_needed() {
    if [ ! -d "$1/node_modules" ]; then
        echo "📦 Installing $1 dependencies..."
        (cd "$1" && npm install --silent)
    fi
}

install_if_needed "agents/property-vision"
install_if_needed "agents/underwriter"
install_if_needed "agents/qa-agent"
install_if_needed "broker"

echo "✅ Dependencies installed"

# Kill any existing processes
pkill -f "property-vision" 2>/dev/null || true
pkill -f "underwriter" 2>/dev/null || true
pkill -f "qa-agent" 2>/dev/null || true
pkill -f "gemini-mortgage-broker" 2>/dev/null || true

sleep 1

# Start agents
echo ""
echo "🤖 Starting Agents..."

(cd agents/property-vision && npm start > ../../property-vision.log 2>&1 &)
echo "   ✓ Property Vision Agent (port ${VISION_PORT:-4023})"

(cd agents/underwriter && npm start > ../../underwriter.log 2>&1 &)
echo "   ✓ Underwriter Agent (port ${UNDERWRITER_PORT:-4001})"

(cd agents/qa-agent && npm start > ../../qa-agent.log 2>&1 &)
echo "   ✓ QA Agent (port ${QA_PORT:-4024})"

sleep 2

(cd broker && npm start > ../broker.log 2>&1 &)
echo "   ✓ Broker (port ${BROKER_PORT:-4020})"

sleep 2

echo ""
echo "=================================="
echo "🎉 Gemini Mortgage Concierge Started!"
echo ""
echo "📍 Broker:          http://localhost:${BROKER_PORT:-4020}"
echo "📍 Property Vision: http://localhost:${VISION_PORT:-4023}"
echo "📍 Underwriter:     http://localhost:${UNDERWRITER_PORT:-4001}"
echo "📍 QA Agent:        http://localhost:${QA_PORT:-4024}"
echo ""
echo "🔍 Health Check:    curl http://localhost:${BROKER_PORT:-4020}/health"
echo "📋 Logs:            tail -f *.log"
echo ""
echo "🛑 To stop: pkill -f 'property-vision|underwriter|qa-agent|gemini-mortgage'"
