FROM node:20-alpine AS deps

RUN npm install -g pnpm@9.15.0

WORKDIR /app/apps/web

COPY apps/web/package.json ./

RUN pnpm install --no-frozen-lockfile

FROM node:20-alpine AS builder

RUN npm install -g pnpm@9.15.0

WORKDIR /app/apps/web

COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web ./
COPY apps/api/prisma ../api/prisma

ARG NEXT_PUBLIC_API_URL
ARG BETTER_AUTH_SECRET=build-time-secret
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ENV NODE_ENV=production

RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 8080

CMD ["node", "apps/web/server.js"]
