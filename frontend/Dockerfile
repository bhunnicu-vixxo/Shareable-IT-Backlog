# =============================================================================
# Frontend Dockerfile — Multi-Stage Build
# Stage 1: Build the Vite production bundle
# Stage 2: Serve static files via nginx
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — Build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files for dependency caching
COPY package.json ./

# Install ALL dependencies (devDependencies needed for build tooling)
# Note: Using npm install because package-lock.json is at workspace root (npm workspaces)
RUN npm install

# Copy source files
COPY . .

# Default API URL for production build (nginx proxies /api to backend)
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

# Build the production bundle (tsc -b && vite build)
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — Serve via nginx
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration for SPA routing, gzip, cache headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 (nginx default)
EXPOSE 80

# nginx runs in the foreground
CMD ["nginx", "-g", "daemon off;"]
