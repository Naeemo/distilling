# InfoDigest 免费部署指南

## 推荐方案：Vercel + Render (完全免费)

### 1. 部署前端到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
cd distilling-project
vercel --prod
```

**或 GitHub 自动部署：**
1. 推送代码到 GitHub
2. 访问 https://vercel.com/new
3. 导入 GitHub 仓库
4. 配置环境变量：`NEXT_PUBLIC_API_URL` = Render 后端地址
5. 自动部署

### 2. 部署后端到 Render

**一键部署：**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

**手动部署：**
1. 访问 https://dashboard.render.com/
2. 点击 "New +" → "Blueprint"
3. 连接 GitHub 仓库
4. 选择 `render.yaml`
5. 自动创建 Web Service + PostgreSQL + Redis

### 3. 数据库选项

| 平台 | 免费额度 | 特点 |
|------|----------|------|
| **Supabase** | 500MB 存储 | 功能最全，有 Dashboard |
| **Neon** | 500MB 存储 | 自动休眠，服务器无关 |
| **Render PostgreSQL** | 1GB 存储 | 与 Render 后端同区域 |

### 4. Redis 选项

| 平台 | 免费额度 | 特点 |
|------|----------|------|
| **Upstash** | 10k 请求/天 | 全球边缘，HTTP API |
| **Render Redis** | 与后端同区域 | 内网延迟低 |

---

## 备选方案

### Railway (一键部署全栈)
```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 初始化项目
cd distilling-project
railway init

# 添加 PostgreSQL 和 Redis
railway add

# 部署
railway up
```

### Fly.io (全球边缘)
```bash
# 安装 Fly CLI
curl -L https://fly.io/install.sh | sh

# 登录
fly auth login

# 创建应用
fly launch

# 创建数据库
fly postgres create
fly redis create

# 部署
fly deploy
```

---

## 环境变量配置

### 后端必需变量
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo
FRONTEND_URL=https://your-frontend.vercel.app
```

### 前端必需变量
```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api/v1
```

---

## 成本对比

| 方案 | 每月成本 | 限制 |
|------|----------|------|
| **Vercel + Render** | $0 | 后端15分钟休眠 |
| **Railway** | $0-5 | 500小时免费额度 |
| **Fly.io** | $0 | 3个共享CPU实例 |
| **Supabase** | $0 | 500MB 数据库 |

---

## 推荐域名配置

1. 在 NameSilo/Namecheap 注册域名 (~$9/年)
2. Cloudflare DNS 管理 (免费 CDN)
3. Vercel/Render 绑定自定义域名

---

## 监控与日志

- **Vercel**: 自带 Analytics 和 Logs
- **Render**: Dashboard 查看日志
- **Railway**: 实时日志流
- **UptimeRobot**: 免费监控 (5分钟间隔)
