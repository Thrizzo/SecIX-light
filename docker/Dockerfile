# SecIX Light Frontend Dockerfile
# Multi-stage build: Node.js builder + Nginx runtime

# ====== Stage 1: Build ======
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_DEPLOYMENT_MODE=docker
ARG VITE_EDITION=light
ARG VITE_API_BASE_URL=http://localhost:3001
ARG VITE_SUPABASE_URL=http://localhost:3001
ARG VITE_SUPABASE_PUBLISHABLE_KEY=local-dev-key
ARG VITE_SUPABASE_PROJECT_ID=local

# Set environment variables for build
ENV VITE_DEPLOYMENT_MODE=$VITE_DEPLOYMENT_MODE
ENV VITE_EDITION=$VITE_EDITION
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Copy package files
COPY package*.json ./
COPY bun.lockb* ./

# Install dependencies
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ====== Stage 2: Runtime ======
FROM nginx:alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy docker-entrypoint script
COPY docker/docker-entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Default command (nginx)
CMD ["nginx", "-g", "daemon off;"]
