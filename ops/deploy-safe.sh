#!/bin/bash
# =============================================================================
# Safe Deployment Script — Cloud Run with Traffic Splitting
# =============================================================================
# 
# This script deploys with --no-traffic, allowing testing before shifting traffic.
#
# Usage:
#   ./ops/deploy-safe.sh [broker|frontend|all]
#
# Environment:
#   TAG - Image tag (default: git short SHA)
# =============================================================================

set -e

PROJECT_ID="gemini3-mortgage-concierge"
REGION="us-central1"
REPO_NAME="gemini-mortgage"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

# Get git SHA for tagging
TAG=${TAG:-$(git rev-parse --short HEAD)}
REVISION_SUFFIX="v$(echo $TAG | tr '.' '-')"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 Safe Deployment — Cloud Run with Traffic Splitting"
echo "======================================================"
echo "  Project:  ${PROJECT_ID}"
echo "  Region:   ${REGION}"
echo "  Tag:      ${TAG}"
echo "  Revision: ${REVISION_SUFFIX}"
echo ""

# Check auth
if ! gcloud auth print-access-token &>/dev/null; then
    echo -e "${RED}❌ Not authenticated. Run: gcloud auth login${NC}"
    exit 1
fi

gcloud config set project ${PROJECT_ID} --quiet

# =============================================================================
# Build Images
# =============================================================================

build_broker() {
    echo ""
    echo -e "${YELLOW}☁️  Building: gemini-broker:${TAG}${NC}"
    gcloud builds submit broker/ \
        --tag ${REGISTRY}/gemini-broker:${TAG} \
        --quiet
    echo -e "${GREEN}✅ Built: ${REGISTRY}/gemini-broker:${TAG}${NC}"
}

build_frontend() {
    echo ""
    echo -e "${YELLOW}☁️  Building: gemini-frontend:${TAG}${NC}"
    
    # Get broker URL for frontend config
    BROKER_URL=$(gcloud run services describe gemini-broker --region=${REGION} --format='value(status.url)')
    echo "VITE_BROKER_URL=${BROKER_URL}" > frontend/.env.production
    
    gcloud builds submit frontend/ \
        --tag ${REGISTRY}/gemini-frontend:${TAG} \
        --quiet
    echo -e "${GREEN}✅ Built: ${REGISTRY}/gemini-frontend:${TAG}${NC}"
}

# =============================================================================
# Deploy with NO TRAFFIC
# =============================================================================

deploy_broker() {
    echo ""
    echo -e "${YELLOW}🚀 Deploying: gemini-broker (NO TRAFFIC)${NC}"
    
    # Get agent URLs
    VISION_URL=$(gcloud run services describe gemini-vision --region=${REGION} --format='value(status.url)')
    UNDERWRITER_URL=$(gcloud run services describe gemini-underwriter --region=${REGION} --format='value(status.url)')
    QA_URL=$(gcloud run services describe gemini-qa --region=${REGION} --format='value(status.url)')
    
    gcloud run deploy gemini-broker \
        --image=${REGISTRY}/gemini-broker:${TAG} \
        --region=${REGION} \
        --platform=managed \
        --no-traffic \
        --revision-suffix=${REVISION_SUFFIX} \
        --set-env-vars=VISION_URL=${VISION_URL},UNDERWRITER_URL=${UNDERWRITER_URL},QA_URL=${QA_URL} \
        --set-secrets=DEMO_ACCESS_TOKEN=DEMO_ACCESS_TOKEN:latest \
        --min-instances=1 --max-instances=5 \
        --quiet
    
    # Get revision URL
    REVISION_NAME="gemini-broker-${REVISION_SUFFIX}"
    REVISION_URL=$(gcloud run revisions describe ${REVISION_NAME} --region=${REGION} --format='value(status.url)' 2>/dev/null || echo "")
    
    echo -e "${GREEN}✅ Deployed gemini-broker revision: ${REVISION_NAME}${NC}"
    echo -e "   Revision URL: ${REVISION_URL:-'(use gcloud run revisions describe)'}"
    echo ""
    echo "   Current traffic:"
    gcloud run services describe gemini-broker --region=${REGION} --format='yaml(status.traffic)' | head -10
}

deploy_frontend() {
    echo ""
    echo -e "${YELLOW}🚀 Deploying: gemini-frontend (NO TRAFFIC)${NC}"
    
    BROKER_URL=$(gcloud run services describe gemini-broker --region=${REGION} --format='value(status.url)')
    
    gcloud run deploy gemini-frontend \
        --image=${REGISTRY}/gemini-frontend:${TAG} \
        --region=${REGION} \
        --platform=managed \
        --no-traffic \
        --revision-suffix=${REVISION_SUFFIX} \
        --set-env-vars=VITE_BROKER_URL=${BROKER_URL} \
        --min-instances=1 --max-instances=20 \
        --quiet
    
    REVISION_NAME="gemini-frontend-${REVISION_SUFFIX}"
    
    echo -e "${GREEN}✅ Deployed gemini-frontend revision: ${REVISION_NAME}${NC}"
    echo ""
    echo "   Current traffic:"
    gcloud run services describe gemini-frontend --region=${REGION} --format='yaml(status.traffic)' | head -10
}

# =============================================================================
# Traffic Commands (for manual execution after testing)
# =============================================================================

print_traffic_commands() {
    echo ""
    echo "======================================================"
    echo "📋 NEXT STEPS: Traffic Shifting Commands"
    echo "======================================================"
    echo ""
    echo "# Test the new revision first (replace with actual revision URL):"
    echo "curl -s https://gemini-broker-${REVISION_SUFFIX}-*.run.app/health"
    echo ""
    echo "# Shift 1% traffic to new broker revision:"
    echo "gcloud run services update-traffic gemini-broker \\"
    echo "  --region=${REGION} --platform=managed \\"
    echo "  --to-revisions=gemini-broker-${REVISION_SUFFIX}=1"
    echo ""
    echo "# Shift 10% traffic:"
    echo "gcloud run services update-traffic gemini-broker \\"
    echo "  --region=${REGION} --platform=managed \\"
    echo "  --to-revisions=gemini-broker-${REVISION_SUFFIX}=10"
    echo ""
    echo "# Shift 100% traffic:"
    echo "gcloud run services update-traffic gemini-broker \\"
    echo "  --region=${REGION} --platform=managed \\"
    echo "  --to-revisions=gemini-broker-${REVISION_SUFFIX}=100"
    echo ""
    echo "# ROLLBACK (if issues):"
    OLD_REV=$(gcloud run services describe gemini-broker --region=${REGION} --format='value(status.traffic[0].revisionName)')
    echo "gcloud run services update-traffic gemini-broker \\"
    echo "  --region=${REGION} --platform=managed \\"
    echo "  --to-revisions=${OLD_REV}=100"
}

# =============================================================================
# Main
# =============================================================================

TARGET=${1:-all}

case $TARGET in
    broker)
        build_broker
        deploy_broker
        ;;
    frontend)
        build_frontend
        deploy_frontend
        ;;
    all)
        build_broker
        deploy_broker
        build_frontend
        deploy_frontend
        ;;
    traffic)
        print_traffic_commands
        ;;
    *)
        echo "Usage: $0 [broker|frontend|all|traffic]"
        exit 1
        ;;
esac

print_traffic_commands

echo ""
echo -e "${GREEN}🎉 Safe deployment complete!${NC}"
echo "Remember: New revisions have 0% traffic until you shift it."
