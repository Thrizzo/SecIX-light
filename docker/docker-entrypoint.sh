#!/bin/sh
# Runtime configuration script for nginx docker-entrypoint.d
# Replaces environment variables in the built JavaScript files
# This script runs BEFORE nginx starts (part of docker-entrypoint.d)

set -e

# Define the directory containing the built files
BUILD_DIR=/usr/share/nginx/html

echo "Applying runtime configuration..."

# Configure nginx upstream for /api proxy
# - docker-compose: api
# - kubernetes: secix-light-api
NGINX_CONF=/etc/nginx/conf.d/default.conf
API_UPSTREAM="${RUNTIME_API_UPSTREAM:-api}"
if [ -f "$NGINX_CONF" ]; then
    echo "Setting API_UPSTREAM to '$API_UPSTREAM'..."
    sed -i "s|__RUNTIME_API_UPSTREAM__|$API_UPSTREAM|g" "$NGINX_CONF"
fi

# Determine deployment mode - default to docker if API_URL is set but mode isn't specified
DEPLOYMENT_MODE="${RUNTIME_DEPLOYMENT_MODE:-}"
if [ -z "$DEPLOYMENT_MODE" ] && [ -n "$RUNTIME_API_URL" ]; then
    DEPLOYMENT_MODE="docker"
fi

# Create/update runtime-config.js with actual runtime values
# This is the primary method for configuring the frontend in self-hosted mode
RUNTIME_CONFIG="$BUILD_DIR/runtime-config.js"
cat > "$RUNTIME_CONFIG" << EOF
window.__RUNTIME_CONFIG__ = {
  apiUrl: "${RUNTIME_API_URL:-}",
  supabaseUrl: "${RUNTIME_SUPABASE_URL:-}",
  supabaseAnonKey: "${RUNTIME_SUPABASE_ANON_KEY:-}",
  deploymentMode: "${DEPLOYMENT_MODE:-}",
  EDITION: "${RUNTIME_EDITION:-light}"
};
EOF
echo "Created runtime-config.js:"
cat "$RUNTIME_CONFIG"

# Also replace placeholders in bundled JS files (fallback for older builds)
if [ -n "$RUNTIME_SUPABASE_URL" ]; then
    echo "Setting SUPABASE_URL in JS bundles..."
    find $BUILD_DIR -type f -name '*.js' -exec sed -i "s|__RUNTIME_SUPABASE_URL__|$RUNTIME_SUPABASE_URL|g" {} \;
fi

if [ -n "$RUNTIME_SUPABASE_ANON_KEY" ]; then
    echo "Setting SUPABASE_ANON_KEY in JS bundles..."
    find $BUILD_DIR -type f -name '*.js' -exec sed -i "s|__RUNTIME_SUPABASE_ANON_KEY__|$RUNTIME_SUPABASE_ANON_KEY|g" {} \;
fi

if [ -n "$RUNTIME_API_URL" ]; then
    echo "Setting API_URL in JS bundles..."
    find $BUILD_DIR -type f -name '*.js' -exec sed -i "s|__RUNTIME_API_URL__|$RUNTIME_API_URL|g" {} \;
fi

# Log which mode is active
if [ -n "$RUNTIME_API_URL" ]; then
    echo "Self-hosted mode enabled - using REST API at: $RUNTIME_API_URL"
else
    echo "Docker mode - using internal API proxy"
fi

echo "Runtime configuration complete"
# Do NOT start nginx here - this script runs as part of docker-entrypoint.d
# nginx is started by the container's CMD
