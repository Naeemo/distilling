# GCP 部署指南

> 本文档指导你如何将 InfoDigest 部署到 Google Cloud Platform (Cloud Run + Cloud SQL)

---

## 📋 前置条件

- [ ] GCP 账号（https://console.cloud.google.com）
- [ ] 安装 gcloud CLI（https://cloud.google.com/sdk/docs/install）
- [ ] GitHub 仓库访问权限
- [ ] 项目代码已推送到 GitHub

---

## 第一步：GCP 项目初始化

```bash
# 1. 登录 GCP
gcloud auth login

# 2. 创建项目（项目ID全局唯一，建议用 infodigest-你的名字）
gcloud projects create infodigest-prod --name="InfoDigest"

# 3. 设置当前项目
gcloud config set project infodigest-prod

# 4. 启用必要 API
gcloud services enable run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  redis.googleapis.com
```

---

## 第二步：创建 Cloud SQL (PostgreSQL)

```bash
# 创建 PostgreSQL 实例（最便宜的 db-f1-micro 配置）
gcloud sql instances create infodigest-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-east1 \
  --storage-size=10GB \
  --storage-type=HDD

# 设置数据库密码（**记住这个密码**）
gcloud sql users set-password postgres \
  --instance=infodigest-db \
  --password="你的数据库密码"

# 创建数据库
gcloud sql databases create infodigest --instance=infodigest-db

# 记录连接信息（后面会用到）
echo "数据库连接名:"
gcloud sql instances describe infodigest-db --format="value(connectionName)"
```

---

## 第三步：创建 GCP Secrets

```bash
# 设置变量（替换 你的数据库密码）
export DB_PASSWORD="你的数据库密码"
export PROJECT_ID=$(gcloud config get-value project)
export DB_CONNECTION_NAME="${PROJECT_ID}:asia-east1:infodigest-db"

# 1. Database URL Secret
echo -n "postgresql://postgres:${DB_PASSWORD}@localhost/infodigest?host=/cloudsql/${DB_CONNECTION_NAME}" | \
  gcloud secrets create database-url --data-file=-

# 2. StepFun API Key Secret（你的阶跃星辰 API Key）
echo -n "2oR8HSbUc5NMl0pJdbp3Hn2bitwQafnPcOaWLL5R6x83qXjAhzHwyqlwrXmdbX2fD" | \
  gcloud secrets create stepfun-api-key --data-file=-

# 3. JWT Secret（随机生成）
openssl rand -base64 32 | gcloud secrets create jwt-secret --data-file=-

# 4. Redis URL（可选，先用本地模式）
echo -n "redis://localhost:6379" | gcloud secrets create redis-url --data-file=-

# 验证 Secrets 创建成功
gcloud secrets list
```

---

## 第四步：配置 GitHub Secrets

### 4.1 创建 GCP 服务账号

```bash
# 创建服务账号
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployer"

# 授权（允许部署到 Cloud Run 和读取 Secrets）
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# 创建并下载密钥文件
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

# 生成 base64（复制输出，这就是 GCP_SA_KEY）
cat key.json | base64 -w 0

# 清理临时文件
rm key.json
```

### 4.2 在 GitHub 添加 Secrets

访问：`https://github.com/你的用户名/distilling/settings/secrets/actions`

点击 **New repository secret**，添加以下 3 个：

| Secret 名称 | 值 |
|------------|-----|
| `GCP_PROJECT_ID` | 你的 GCP 项目 ID（如 `infodigest-prod`） |
| `GCP_REGION` | `asia-east1` |
| `GCP_SA_KEY` | 上一步复制的 base64 字符串 |

---

## 第五步：部署！

```bash
# 确保代码已提交
git add .
git commit -m "ready for deployment"

# 推送到 main 分支触发自动部署
git push origin main
```

然后访问 GitHub → **Actions** 标签页查看部署进度。

---

## 第六步：验证部署

### 查看部署状态
```bash
# API 服务
gcloud run services describe infodigest-api --region=asia-east1

# 前端服务
gcloud run services describe infodigest-web --region=asia-east1
```

### 访问应用
部署完成后，你会看到类似这样的 URL：

- **API**: `https://infodigest-api-xxx-xxx.asia-east1.run.app`
- **前端**: `https://infodigest-web-xxx-xxx.asia-east1.run.app`

---

## 🔧 常用命令

```bash
# 查看日志
gcloud logging tail "resource.type=cloud_run_revision"

# 重新部署（手动触发）
gcloud run deploy infodigest-api \
  --image asia.gcr.io/$(gcloud config get-value project)/infodigest-api:latest \
  --region=asia-east1

# 更新环境变量
gcloud run services update infodigest-api \
  --set-env-vars KEY=VALUE \
  --region=asia-east1

# 数据库连接（本地调试）
gcloud sql connect infodigest-db --user=postgres
```

---

## 💰 费用预估（每月）

| 服务 | 配置 | 预估费用 |
|------|------|----------|
| Cloud Run | 1Gi, 按需计费 | ~¥50（低流量时可能免费） |
| Cloud SQL | db-f1-micro | ~¥150 |
| Memorystore | 基础版（可选） | ~¥200 |
| Secret Manager | 5 个 secrets | 免费额度内 |
| **总计** | | **~¥400/月** |

> 新用户有 $300 免费额度，够用几个月。

---

## 🐛 常见问题

### 1. 数据库连接失败
检查 `database-url` Secret 格式：
```
postgresql://postgres:密码@localhost/infodigest?host=/cloudsql/项目:地区:实例名
```

### 2. GitHub Actions 失败
- 检查 `GCP_SA_KEY` 是否正确（必须是 base64 编码）
- 确认 Secrets 名称拼写正确

### 3. 部署成功但访问 403
Cloud Run 默认需要认证，检查是否设置了 `--allow-unauthenticated`：
```bash
gcloud run services add-iam-policy-binding infodigest-api \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --region=asia-east1
```

---

## 📚 相关文档

- [Google Cloud Run 文档](https://cloud.google.com/run/docs)
- [Cloud SQL 文档](https://cloud.google.com/sql/docs/postgres)
- [Secret Manager 文档](https://cloud.google.com/secret-manager/docs)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

---

**有问题？** 检查 GitHub Actions 日志，或者运行 `gcloud run services describe` 查看详细状态。
