# Stage 1: Install dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Mock Postgres URL for Next.js static compilation / client generation during build phase
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
RUN npm run build

# Stage 3: Production server
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install prisma globally for the entrypoint script
RUN npm install -g prisma@7.8.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set up persistent data directory for SQLite
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data && chmod -R 777 /app/data

# Copy standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# IMPORTANT: Ensure prisma and seed script dependencies are available for the entrypoint
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules ./node_modules

COPY entrypoint.sh ./entrypoint.sh

USER root
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

CMD ["./entrypoint.sh"]

