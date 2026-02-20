# Multi-stage build for Alpha Groups backend
# This Dockerfile optimizes for production deployment

# ============================================================================
# STAGE 1: BUILD
# ============================================================================
# Install dependencies and compile TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# ============================================================================
# STAGE 2: PRODUCTION
# ============================================================================
# Minimal runtime image with only production dependencies
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Copy migration files and runner
COPY migrations ./migrations
COPY scripts/migrate.js ./scripts/migrate.js
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run migrations then start server
CMD ["sh", "./entrypoint.sh"]
