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
  containerregistry.googleapis.com \
  sqladmin.googleapis.com \
  aiplatform.googleapis.com \
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
# 设置变量（替换为你自己的值）
export DB_PASSWORD="你的数据库密码"
export PROJECT_ID=$(gcloud config get-value project)
export DB_CONNECTION_NAME="${PROJECT_ID}:asia-east1:infodigest-db"

# 1. Database URL Secret
echo -n "postgresql://postgres:${DB_PASSWORD}@localhost/infodigest?host=/cloudsql/${DB_CONNECTION_NAME}" | \
  gcloud secrets create database-url --data-file=-

# 2. JWT Secret（随机生成）
openssl rand -base64 32 | gcloud secrets create jwt-secret --data-file=-

# 3. Redis URL（可选，先用本地模式）
echo -n "redis://localhost:6379" | gcloud secrets create redis-url --data-file=-

# 验证 Secrets 创建成功
gcloud secrets list
```

---

## 第四步：配置 GitHub Actions 权限

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
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# 推送镜像到 Artifact Registry
gcloud artifacts repositories create cloud-run \
  --location=asia-east1 \
  --repository-format=docker \
  --description="Cloud Run deployment images"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# 允许 Cloud Run 运行时调用 Vertex AI Gemini
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/aiplatform.user"

```

GitHub Actions 部署镜像时，镜像地址使用：

```text
asia-east1-docker.pkg.dev/${PROJECT_ID}/cloud-run/infodigest-api:<tag>
asia-east1-docker.pkg.dev/${PROJECT_ID}/cloud-run/infodigest-web:<tag>
```

### 4.2 配置 GitHub OIDC / Workload Identity Federation

推荐做法是不再给 GitHub 保存长期的 `GCP_SA_KEY`，而是使用 GitHub OIDC + GCP Workload Identity Federation。

```bash
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
REPO="你的用户名/distilling"

gcloud iam workload-identity-pools create github-actions \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers create-oidc distilling \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="Distilling GitHub" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.aud=assertion.aud,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository == '${REPO}' && assertion.repository_owner == '你的用户名'"

gcloud iam service-accounts add-iam-policy-binding \
  github-actions@${PROJECT_ID}.iam.gserviceaccount.com \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions/attribute.repository/${REPO}"
```

### 4.3 GitHub 仓库侧需要配置什么？

如果你把 `PROJECT_ID`、`REGION`、`workload_identity_provider` 和 `service_account` 直接写进 workflow，那么 GitHub 仓库侧不需要再额外配置 `GCP_SA_KEY` 这类 Secret。

只要：

- 仓库启用了 GitHub Actions
- workflow job 保留 `permissions: id-token: write`

GitHub 就会在运行时自动签发 OIDC token 给 `google-github-actions/auth` 使用。

---

## 第五步：配置 GitHub Actions 触发方式

仓库现在分成两条工作流：

- `CI`：在日常 `push` / `pull_request` 时只做镜像构建校验，不会部署到 GCP
- `Release Deploy to Google Cloud Run`：只有手动发布 GitHub Release，或手动 `workflow_dispatch` 时才会部署

---

## 第六步：部署！

```bash
# 确保代码已提交
git add .
git commit -m "ready for deployment"

# 推送代码只会触发 CI 构建
git push origin main
```

如果只是日常开发，到这里就结束了。GitHub Actions 会自动跑构建检查，但不会更新 Cloud Run。

如果要正式部署生产环境：

1. 打开 GitHub 仓库
2. 进入 **Releases**
3. 点击 **Draft a new release**
4. 选择或创建部署用 tag
5. 点击 **Publish release**

发布 release 后，再到 GitHub → **Actions** 标签页查看 `Release Deploy to Google Cloud Run` 的执行进度。

说明：
- 当前生产部署只会在 `release.published` 或手动 `workflow_dispatch` 时执行，不会在普通 push 或 PR 上覆盖生产环境。
- 日常 `push` / `pull_request` 只会运行 CI 构建，验证 API 和前端 Docker 镜像都能成功构建。
- 工作流会自动完成 API 部署、前端部署、Cloud SQL 挂载，以及 `infodigest-migrate` 数据库迁移 Job 的创建与执行。
- API 默认使用 Cloud Run 运行时身份直连 Google Cloud Vertex AI Gemini，不需要额外的第三方 LLM API Key。

---

## 第七步：验证部署

### 查看部署状态
```bash
# API 服务
gcloud run services describe infodigest-api --region=asia-east1

# 前端服务
gcloud run services describe infodigest-web --region=asia-east1

# 数据库迁移任务
gcloud run jobs describe infodigest-migrate --region=asia-east1
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

# 手动触发 GitHub Actions 部署
# GitHub -> Actions -> Release Deploy to Google Cloud Run -> Run workflow

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

同时确认 Cloud Run 已挂载 Cloud SQL：
```bash
gcloud run services describe infodigest-api --region=asia-east1 \
  --format="value(spec.template.metadata.annotations.run.googleapis.com/cloudsql-instances)"
```

### 2. GitHub Actions 失败
- 确认 workflow job 包含 `permissions: id-token: write`
- 确认 Workload Identity Provider 允许仓库 `你的用户名/distilling`
- 确认 `github-actions@${PROJECT_ID}.iam.gserviceaccount.com` 已授予 `roles/iam.workloadIdentityUser`
- 确认服务账号本身已授予 `roles/run.admin`、`roles/iam.serviceAccountUser`、`roles/secretmanager.secretAccessor`、`roles/cloudsql.client`、`roles/storage.admin`

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
