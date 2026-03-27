# 生产环境 Dockerfile - NestJS API
FROM node:20-alpine AS builder

# 安装 pnpm
RUN npm install -g pnpm@9.15.0

WORKDIR /app

# 复制 workspace 清单
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/

# 安装依赖
RUN pnpm install --no-frozen-lockfile

# 复制源代码
COPY . .

# 先生成 Prisma Client，再编译 NestJS
RUN cd apps/api && npx prisma generate

# 构建
RUN pnpm --filter @infodigest/api build

# 生产镜像
FROM node:20-alpine

RUN npm install -g pnpm@9.15.0

WORKDIR /app

# 复制必要文件
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# 只安装生产依赖
RUN pnpm install --prod --no-frozen-lockfile

# 生成 Prisma Client
RUN cd apps/api && npx prisma generate

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/main.js"]
