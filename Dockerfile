FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# npm ci requires an existing/valid package-lock.json; fall back to npm install.
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --omit=dev; fi

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# Use npm ci when lockfile exists, otherwise fall back to npm install.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY tsconfig.json tailwind.config.ts postcss.config.js next.config.js ./
COPY public/ ./public/
COPY src/ ./src/
# Avoid build-time prerendering errors when Supabase env vars are not provided.
# Next can still compile; pages that need Supabase will be served at runtime.
ENV NEXT_PUBLIC_SUPABASE_URL="http://localhost"
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY="local"
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

