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
COPY package.json package-lock.json ./

# Install ALL dependencies (devDependencies needed for build tooling)
RUN npm ci

# Copy source files
COPY . .

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
