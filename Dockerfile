# ================================
# Stage 1: Dependencies (dev + prod)
# ================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy only package files for better caching
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/

# Install ALL dependencies (cached if package-lock unchanged)
RUN npm ci --no-audit --no-fund

# Generate Prisma Client (only once)
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
# Stage 3: Production Dependencies
# ================================
FROM node:20-alpine AS prod-deps

WORKDIR /app

COPY package*.json ./

# Install ONLY production dependencies (no dev deps)
RUN npm ci --only=production --no-audit --no-fund && npm cache clean --force

# ================================
# Stage 4: Production
# ================================
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy production dependencies from prod-deps stage (NOT reinstalling!)
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy package files (needed for node to resolve modules)
COPY package*.json ./

# Copy Prisma files
COPY prisma ./prisma/

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy generated Prisma client to dist/generated
# (compiled code in dist/src/ imports '../generated/prisma' which resolves to dist/generated/prisma)
COPY --from=builder /app/generated ./dist/generated

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Create uploads directory
RUN mkdir -p uploads && chown nestjs:nodejs uploads

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
CMD ["./entrypoint.sh"]
