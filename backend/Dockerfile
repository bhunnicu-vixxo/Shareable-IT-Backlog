# =============================================================================
# Backend Dockerfile — Multi-Stage Build
# Stage 1: Build TypeScript to JavaScript
# Stage 2: Run production server with minimal dependencies
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — Build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files for dependency caching
COPY package.json package-lock.json ./

# Install ALL dependencies (devDependencies needed for TypeScript compilation)
RUN npm ci

# Copy source files
COPY . .

# Compile TypeScript to JavaScript (tsc -b)
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — Runtime
# ---------------------------------------------------------------------------
FROM node:22-alpine

# Install dumb-init for proper PID 1 signal handling in containers
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy package files and install production-only dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript from build stage
COPY --from=build /app/dist ./dist

# Run as non-root user for security
USER node

# Expose the backend API port
EXPOSE 3000

# Health check — verify the API responds on /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use dumb-init as PID 1 to properly forward signals to Node.js
ENV NODE_ENV=production
CMD ["dumb-init", "node", "dist/server.js"]
