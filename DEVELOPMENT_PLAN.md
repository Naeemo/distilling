# 知萃 InfoDigest 开发计划

## 项目概览
- **GitHub**: https://github.com/Naeemo/distilling
- **技术栈**: NestJS + Next.js v16 + Prisma + PostgreSQL + Redis
- **定时任务**: 每30分钟检查进度 (ID: 3ad7a065-235c-42a0-bccb-13aff90a13ee)

---

## 当前状态 (2026-03-25)

### ✅ 已完成 (P0)
| 模块 | 状态 | 说明 |
|------|------|------|
| 用户系统 | ✅ | JWT认证、注册/登录、Token刷新 |
| 内容采集 | ✅ | URL抓取、@mozilla/readability正文提取 |
| AI摘要 | ✅ | OpenAI GPT流式响应、Redis缓存24h |
| 阅读器 | ✅ | 摘要/全文切换、高亮笔记(4色) |
| 知识库 | ✅ | 列表、搜索、状态筛选、标签 |
| 复习系统 | ✅ | 简化SM-2算法(1/3/7/14/30天) |
| 阅读进度 | ✅ | 后端API完成，待前端集成 |
| 深色模式 | 🚧 | UI Store+ThemeProvider完成，待集成 |

### 📋 待完成

#### Phase 1: 功能完善 (本周)
- [ ] 阅读器集成阅读进度API
  - 滚动时自动保存进度
  - 进入时恢复上次阅读位置
  - 显示进度条UI
  
- [ ] 深色模式完整集成
  - Dashboard添加主题切换按钮
  - 阅读器页面适配深色样式
  - 所有组件支持 `dark:` 类名

#### Phase 2: 测试验证
- [ ] 数据库迁移 (Prisma migrate)
- [ ] 登录/注册流程联调
- [ ] URL内容采集测试
- [ ] AI摘要流式响应测试
- [ ] 高亮笔记功能测试
- [ ] 复习算法计算验证

#### Phase 3: Google Cloud部署准备
- [ ] Docker化配置
- [ ] Cloud Run部署配置
- [ ] Cloud SQL (PostgreSQL) 配置
- [ ] Memorystore (Redis) 配置
- [ ] Secret Manager配置 (OpenAI Key)

#### Phase 4: 高级功能 (后续迭代)
- [ ] RSS订阅采集
- [ ] 浏览器扩展
- [ ] 移动端适配优化
- [ ] 协作/分享功能

---

## 开发规范

### 提交规范
```
feat: 新功能
fix: 修复
refactor: 重构
docs: 文档
chore: 杂项
```

### 代码标准
- 前端: TypeScript严格模式、React Hooks、Zustand状态管理
- 后端: NestJS模块化、Prisma ORM、Swagger文档

---

## 环境配置

### 本地开发
```bash
# 安装依赖
pnpm install

# 环境变量
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# 数据库迁移
pnpm db:migrate

# 启动开发
pnpm dev
```

### 生产环境
- 前端: Google Cloud Run / Firebase Hosting
- 后端: Google Cloud Run
- 数据库: Cloud SQL for PostgreSQL
- 缓存: Memorystore for Redis

---

## 下次检查
定时任务每30分钟检查进度，下次执行：约30分钟后
