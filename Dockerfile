# ==================== DEPENDENCIES STAGE ====================
FROM node:20-alpine AS deps

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ==================== BUILD STAGE ====================
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments cho environment variables
# Mặc định là production URL, override bằng --build-arg nếu cần
ARG NEXT_PUBLIC_API_URL=https://sites.likepion.com/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js
RUN pnpm build

# ==================== PRODUCTION STAGE ====================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Tạo user non-root để chạy app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static files
COPY --from=builder /app/public ./public

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/ || exit 1

CMD ["node", "server.js"]
