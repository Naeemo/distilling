# 知萃 InfoDigest

AI驱动的信息消化工具 - MVP版本

## 技术栈

- **后端**: NestJS + Prisma + PostgreSQL + Redis
- **前端**: Next.js v16 + React v19 + Tailwind CSS v4
- **部署**: Google Cloud (计划中)

## 核心功能

### ✅ P0 - 已完成
- [x] 用户系统（邮箱注册/登录，JWT认证）
- [x] 内容采集（URL抓取，正文提取）
- [x] AI摘要（快速/详细摘要，流式响应）
- [x] 阅读器（摘要/全文切换，高亮笔记）
- [x] 知识库管理（列表、搜索、标签、归档）
- [x] 复习系统（简化SM-2算法）

### 🚧 P1 - 开发中
- [ ] 阅读进度保存
- [ ] 深色模式
- [ ] 导出功能

## 本地开发

```bash
# 克隆项目
git clone https://github.com/Naeemo/distilling.git
cd distilling

# 安装依赖 (使用 pnpm)
pnpm install

# 配置环境变量
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# 启动数据库和 Redis
docker-compose up -d

# 数据库迁移
pnpm db:migrate

# 启动开发服务器
pnpm dev
```

访问:
- 前端: http://localhost:3000
- 后端 API: http://localhost:3001
- API 文档: http://localhost:3001/api/docs

## 项目结构

```
distilling/
├── apps/
│   ├── web/              # Next.js v16 前端
│   │   ├── app/          # App Router
│   │   ├── components/   # React 组件
│   │   ├── lib/          # 工具函数
│   │   ├── stores/       # Zustand 状态管理
│   │   └── types/        # TypeScript 类型
│   └── api/              # NestJS 后端
│       ├── src/
│       │   ├── modules/  # 业务模块
│       │   └── prisma/   # 数据库 Schema
│       └── prisma/
├── docker-compose.yml    # 本地开发环境
└── turbo.json           # Turborepo 配置
```

## 技术亮点

- **Monorepo**: Turborepo + pnpm workspace
- **前端**: Next.js 16 + React 19 + Tailwind CSS 4
- **状态管理**: Zustand (轻量级，支持持久化)
- **后端**: NestJS + Prisma + Swagger
- **AI**: OpenAI GPT + 流式响应 (SSE)

## API 文档

启动后端后访问: `/api/docs` 查看 Swagger UI

## License

MIT
