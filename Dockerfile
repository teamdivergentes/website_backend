# ================================
# Stage 1: Dependencies
# ================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# ================================
# Stage 2: Builder
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/generated ./generated

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ================================
# Stage 3: Production
# ================================
FROM node:20-alpine AS production

# Labels Docker pour les métadonnées de build
LABEL org.opencontainers.image.title="DVG Web Backend"
LABEL org.opencontainers.image.description="Backend NestJS pour l'application DVG Web - Build unstable (SUCCESS)"
LABEL org.opencontainers.image.version="v1.0.0"
LABEL org.opencontainers.image.revision="abc123"
LABEL org.opencontainers.image.source="https://github.com/teamdivergentes/website_backend"
LABEL org.opencontainers.image.created="2025-09-16 18:48:08 UTC"
LABEL org.opencontainers.image.authors="tellebma"
LABEL org.opencontainers.image.url="https://github.com/teamdivergentes/website_backend"
LABEL org.opencontainers.image.documentation="https://github.com/teamdivergentes/website_backend#readme"
LABEL org.opencontainers.image.licenses="UNLICENSED"
LABEL build.status="SUCCESS"
LABEL build.type="unstable"
LABEL build.image.tag="test-image"
LABEL build.workflow.tag="v1.0.0"
LABEL build.branch="feature/test"
LABEL build.commit="abc123"
LABEL build.actor="tellebma"
LABEL build.nestjs="success"
LABEL build.lint="success"
LABEL build.test="success"
LABEL build.semgrep="success"
LABEL build.time="2025-09-16 18:48:08 UTC"

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma Client for production
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated

# Change ownership to non-root user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]

