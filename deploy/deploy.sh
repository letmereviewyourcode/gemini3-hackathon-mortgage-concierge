#!/bin/bash
# =============================================================================
# Gemini Mortgage Concierge — Cloud Run Deployment Script (Cloud Build Version)
# =============================================================================

set -e

PROJECT_ID="gemini3-mortgage-concierge"
REGION="us-central1"
REPO_NAME="gemini-mortgage"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "🚀 Gemini Mortgage Concierge — Cloud Run Deployment (Cloud Build)"
echo "=============================================================="

# Check auth
if ! gcloud auth print-access-token &>/dev/null; then
    echo -e "${RED}❌ Not authenticated.${NC}"
    exit 1
fi

gcloud config set project ${PROJECT_ID}
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

# =============================================================================
# Build and Deploy Services
# =============================================================================

# --- QA Agent ---
echo ""
echo "☁️  Building: gemini-qa (Cloud Build)"
gcloud builds submit agents/qa-agent/ --tag ${REGISTRY}/gemini-qa:latest --quiet

echo "🚀 Deploying: gemini-qa"
gcloud run deploy gemini-qa \
    --image=${REGISTRY}/gemini-qa:latest \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
    --min-instances=0 --max-instances=3 \
    --quiet

QA_URL=$(gcloud run services describe gemini-qa --region=${REGION} --format='value(status.url)')
echo -e "${GREEN}✅ gemini-qa deployed: ${QA_URL}${NC}"

# --- Vision Agent ---
echo ""
echo "☁️  Building: gemini-vision (Cloud Build)"
gcloud builds submit agents/property-vision/ --tag ${REGISTRY}/gemini-vision:latest --quiet

echo "🚀 Deploying: gemini-vision"
gcloud run deploy gemini-vision \
    --image=${REGISTRY}/gemini-vision:latest \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
    --min-instances=0 --max-instances=5 \
    --quiet

VISION_URL=$(gcloud run services describe gemini-vision --region=${REGION} --format='value(status.url)')
echo -e "${GREEN}✅ gemini-vision deployed: ${VISION_URL}${NC}"

# --- Underwriter Agent ---
echo ""
echo "☁️  Building: gemini-underwriter (Cloud Build)"
gcloud builds submit agents/underwriter/ --tag ${REGISTRY}/gemini-underwriter:latest --quiet

echo "🚀 Deploying: gemini-underwriter"
gcloud run deploy gemini-underwriter \
    --image=${REGISTRY}/gemini-underwriter:latest \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
    --set-env-vars=QA_URL=${QA_URL} \
    --min-instances=0 --max-instances=5 \
    --quiet

UNDERWRITER_URL=$(gcloud run services describe gemini-underwriter --region=${REGION} --format='value(status.url)')
echo -e "${GREEN}✅ gemini-underwriter deployed: ${UNDERWRITER_URL}${NC}"

# --- Broker ---
echo ""
echo "☁️  Building: gemini-broker (Cloud Build)"
gcloud builds submit broker/ --tag ${REGISTRY}/gemini-broker:latest --quiet

echo "🚀 Deploying: gemini-broker"
gcloud run deploy gemini-broker \
    --image=${REGISTRY}/gemini-broker:latest \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --set-env-vars=VISION_URL=${VISION_URL},UNDERWRITER_URL=${UNDERWRITER_URL},QA_URL=${QA_URL} \
    --min-instances=1 --max-instances=5 \
    --quiet

BROKER_URL=$(gcloud run services describe gemini-broker --region=${REGION} --format='value(status.url)')
echo -e "${GREEN}✅ gemini-broker deployed: ${BROKER_URL}${NC}"

# --- Frontend ---
echo ""
echo "☁️  Building: gemini-frontend (Cloud Build)"

# Update nginx.conf in frontend dir (copied earlier or we modify the one in deploy then copy over)
# Actually, I copied deploy/nginx.conf to frontend/nginx.conf in the previous step
sed -i.bak "s|\${BROKER_URL}|${BROKER_URL}|g" frontend/nginx.conf

# Modify Dockerfile to use local nginx.conf
sed -i.bak "s|deploy/nginx.conf|nginx.conf|g" frontend/Dockerfile

gcloud builds submit frontend/ \
    --tag ${REGISTRY}/gemini-frontend:latest \
    --substitutions=_VITE_BROKER_URL=${BROKER_URL} \
    --quiet

# We need to ensure VITE_BROKER_URL is passed as build arg.
# Cloud Build doesn't automatically pass substitutions to docker build args unless specified in cloudbuild.yaml or via --build-arg if using Docker functionality directly?
# gcloud builds submit detects a Dockerfile.
# To pass build args with gcloud builds submit: --transitive-build-args="VITE_BROKER_URL=${BROKER_URL}" (only works for Kaniko?)
# Actually, the simplest way for Dockerfile and gcloud builds submit (which uses docker build behind the scenes) is difficult with build-args for single command.
# I will rewrite the Frontend Dockerfile to accept the ARG, but I need to pass it.
# Alternative: Write the .env file relevant for build before submitting?

echo "VITE_BROKER_URL=${BROKER_URL}" > frontend/.env.production

gcloud builds submit frontend/ --tag ${REGISTRY}/gemini-frontend:latest --quiet

echo "🚀 Deploying: gemini-frontend"
gcloud run deploy gemini-frontend \
    --image=${REGISTRY}/gemini-frontend:latest \
    --region=${REGION} \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=1 --max-instances=10 \
    --quiet

FRONTEND_URL=$(gcloud run services describe gemini-frontend --region=${REGION} --format='value(status.url)')
echo -e "${GREEN}✅ gemini-frontend deployed: ${FRONTEND_URL}${NC}"

echo ""
echo "🎉 Deployment Complete!"
echo "📱 Public Demo URL: ${FRONTEND_URL}"
