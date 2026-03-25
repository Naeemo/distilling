# 知萃 InfoDigest

AI驱动的信息消化工具 - MVP版本

## 技术栈

- **后端**: NestJS + Prisma + PostgreSQL + Redis
- **前端**: Next.js v16 + React v19 + Tailwind CSS v4
- **部署**: Docker + Docker Compose

## 项目结构

```
distilling/
├── apps/
│   ├── web/                    # Next.js v16 前端
│   └── api/                    # NestJS 后端
├── packages/
│   ├── shared-types/           # 共享类型
│   └── eslint-config/          # 共享ESLint配置
├── docker-compose.yml          # 本地开发环境
└── turbo.json                  # Turborepo配置
```

## 核心功能

### P0 - 必须实现
- [ ] 用户系统（邮箱注册/登录，JWT认证）
- [ ] 内容采集（URL抓取，正文提取）
- [ ] AI摘要（快速/详细摘要，流式响应）
- [ ] 阅读器（摘要/全文切换，高亮笔记）
- [ ] 知识库管理（列表、搜索、标签、归档）
- [ ] 复习系统（简化SM-2算法）

## 开发环境启动

```bash
# 安装依赖
npm install

# 启动数据库和Redis
docker-compose up -d

# 数据库迁移
npm run db:migrate

# 开发模式
npm run dev
```

## API 文档

启动后访问: http://localhost:3001/api/docs
