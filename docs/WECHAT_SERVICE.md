# 微信文章解析服务 (we-mp-rss) 调研报告

## 1. 项目概述

### 1.1 项目简介
**we-mp-rss** 是一个开源的微信公众号文章抓取与 RSS 生成服务，为 InfoDigest 提供微信公众号文章解析能力。

- **GitHub**: https://github.com/rachelos/we-mp-rss
- **Stars**: 2.6k+
- **Forks**: 449+
- **License**: 开源项目

### 1.2 核心功能
- 微信公众号内容抓取和解析
- RSS 订阅源生成（支持 RSS 2.0/Atom）
- JSON API 输出
- Webhook 实时推送
- 定时自动更新内容
- 多格式导出（Markdown/PDF/JSON）
- 多用户 token 管理

### 1.3 技术架构
```
后端: Python + FastAPI
前端: Vue 3 + Vite
数据库: SQLite (默认) / MySQL / PostgreSQL
缓存: Redis (可选)
```

---

## 2. 部署步骤

### 2.1 Docker 部署（推荐）

#### 基础部署
```bash
# 创建数据目录
mkdir -p ./data

# 启动服务
docker run -d \
  --name we-mp-rss \
  -p 8001:8001 \
  -v $(pwd)/data:/app/data \
  ghcr.io/rachelos/we-mp-rss:latest
```

#### 带环境变量的完整部署
```bash
docker run -d \
  --name we-mp-rss \
  -p 8001:8001 \
  -e DB=sqlite:///data/db.db \
  -e USERNAME=admin \
  -e PASSWORD=admin@123 \
  -e SECRET_KEY=your-secret-key \
  -e TOKEN_EXPIRE_MINUTES=4320 \
  -e SPAN_INTERVAL=10 \
  -e MAX_PAGE=5 \
  -e ENABLE_JOB=True \
  -v $(pwd)/data:/app/data \
  ghcr.io/rachelos/we-mp-rss:latest
```

#### MySQL 版本部署
```bash
docker run -d \
  --name we-mp-rss \
  -p 8001:8001 \
  -e DB="mysql+pymysql://username:password@host/database?charset=utf8mb4" \
  -e USERNAME=admin \
  -e PASSWORD=admin@123 \
  -v $(pwd)/data:/app/data \
  ghcr.io/rachelos/we-mp-rss:latest
```

### 2.2 升级步骤
```bash
# 停止并删除旧容器
docker stop we-mp-rss
docker rm we-mp-rss

# 拉取最新镜像
docker pull ghcr.io/rachelos/we-mp-rss:latest

# 重新运行（保持原有配置）
docker run -d \
  --name we-mp-rss \
  -p 8001:8001 \
  -v $(pwd)/data:/app/data \
  ghcr.io/rachelos/we-mp-rss:latest
```

### 2.3 访问服务
- **Web UI**: http://localhost:8001
- **API Docs**: http://localhost:8001/api/docs (Swagger UI)
- **RSS Feed**: http://localhost:8001/rss/{feed_id}

---

## 3. 数据库结构

### 3.1 核心数据表

#### feeds 表（公众号信息）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String(255) | 主键，公众号唯一ID |
| mp_name | String(255) | 公众号名称 |
| mp_cover | String(255) | 公众号头像URL |
| mp_intro | String(255) | 公众号简介 |
| status | Integer | 状态: 1=活跃, 2=禁用 |
| sync_time | Integer | 最后同步时间戳 |
| update_time | Integer | 最后更新时间戳 |
| faker_id | String(255) | 微信内部ID |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

#### articles 表（文章信息）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String(255) | 主键，文章唯一ID |
| mp_id | String(255) | 关联公众号ID |
| title | String(1000) | 文章标题 |
| pic_url | String(500) | 封面图片URL |
| url | String(500) | 文章链接 |
| description | Text | 文章摘要 |
| content | Text | 文章内容（Markdown） |
| content_html | Text | 文章内容（HTML） |
| status | Integer | 状态: 1=活跃, 1000=删除 |
| publish_time | Integer | 发布时间戳 |
| created_at | DateTime | 创建时间 |
| updated_at | BigInteger | 更新时间戳 |
| is_read | Integer | 是否已读 |
| is_favorite | Integer | 是否收藏 |

#### users 表（用户信息）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String(255) | 主键 |
| username | String(50) | 用户名（唯一） |
| password_hash | String(255) | 密码哈希 |
| role | String(20) | 角色: admin/editor/user |
| is_active | Boolean | 是否激活 |
| mp_name | String(255) | 微信昵称 |
| created_at | DateTime | 创建时间 |

#### access_keys 表（API密钥）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String(255) | 主键 |
| user_id | String(255) | 关联用户ID |
| key | String(64) | AK值（唯一） |
| secret | String(64) | SK密钥 |
| name | String(255) | 密钥名称 |
| permissions | Text | 权限列表（JSON） |
| is_active | Boolean | 是否激活 |
| expires_at | DateTime | 过期时间 |
| last_used_at | DateTime | 最后使用时间 |

### 3.2 数据库关系图
```
users (1) ───< (N) access_keys
users (1) ───< (N) feeds
feeds (1) ───< (N) articles
feeds (N) ───> (N) tags
```

---

## 4. API 文档

### 4.1 认证方式
we-mp-rss 支持两种认证方式：

#### 方式一：JWT Token（Web 登录）
```bash
# 登录获取 Token
POST /api/v1/wx/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin&password=admin@123

# 响应
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

#### 方式二：API Key（程序调用）
```bash
# 在 Header 中添加
X-API-Key: your-api-key
X-API-Secret: your-api-secret
```

### 4.2 核心 API 端点

#### 文章管理
```
GET    /api/v1/wx/articles              # 获取文章列表
GET    /api/v1/wx/articles/{id}         # 获取文章详情
POST   /api/v1/wx/articles              # 创建文章
PATCH  /api/v1/wx/articles/{id}         # 更新文章
DELETE /api/v1/wx/articles/{id}         # 删除文章
POST   /api/v1/wx/articles/{id}/refresh # 刷新文章内容
```

**查询参数（文章列表）**:
```
GET /api/v1/wx/articles?mp_id=xxx&page=1&limit=20&kw=关键词

参数说明:
- mp_id: 公众号ID筛选
- page: 页码（默认1）
- limit: 每页数量（默认20）
- kw: 关键词搜索（标题/内容）
- start_time: 开始时间戳
- end_time: 结束时间戳
- is_read: 是否已读筛选
- is_favorite: 是否收藏筛选
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "article_xxx",
        "mp_id": "mp_xxx",
        "title": "文章标题",
        "pic_url": "https://example.com/cover.jpg",
        "url": "https://mp.weixin.qq.com/s/xxx",
        "description": "文章摘要...",
        "content": "Markdown 内容",
        "content_html": "HTML 内容",
        "status": 1,
        "publish_time": 1712345678,
        "created_at": "2024-01-01T00:00:00",
        "is_read": 0,
        "is_favorite": 0
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

#### 公众号管理
```
GET    /api/v1/wx/mps                   # 获取公众号列表
GET    /api/v1/wx/mps/{id}              # 获取公众号详情
POST   /api/v1/wx/mps                   # 添加公众号
DELETE /api/v1/wx/mps/{id}              # 删除公众号
POST   /api/v1/wx/mps/{id}/sync         # 同步公众号文章
```

#### RSS 订阅
```
GET /rss                    # 获取所有公众号 RSS
GET /rss/{feed_id}          # 获取指定公众号 RSS
GET /feed/{feed_id}.xml     # RSS XML 格式
GET /feed/{feed_id}.json    # RSS JSON 格式
```

#### API Key 管理
```
GET    /api/v1/wx/api-keys              # 列出 API Keys
POST   /api/v1/wx/api-keys              # 创建 API Key
POST   /api/v1/wx/api-keys/{id}/regenerate  # 轮换密钥
DELETE /api/v1/wx/api-keys/{id}         # 删除 API Key
```

### 4.3 Webhook 推送

当有新文章时，we-mp-rss 可以推送 webhook 通知：

**配置环境变量**:
```bash
# 钉钉
DINGDING_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=xxx

# 飞书
FEISHU_WEBHOOK=https://open.feishu.cn/open-apis/bot/v2/hook/xxx

# 企业微信
WECHAT_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx

# 自定义
CUSTOM_WEBHOOK=https://your-webhook-endpoint.com
```

**Webhook 推送格式**:
```json
{
  "mp_name": "公众号名称",
  "title": "文章标题",
  "url": "https://mp.weixin.qq.com/s/xxx",
  "description": "文章摘要",
  "content": "文章内容",
  "publish_time": "2024-01-01 12:00:00"
}
```

---

## 5. InfoDigest 集成方案

### 5.1 架构设计
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   InfoDigest    │────▶│  we-mp-rss API  │────▶│   WeChat MP     │
│                 │◀────│   (Port 8001)   │◀────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   PostgreSQL    │     │   SQLite/MySQL  │
│  (主业务数据库)  │     │ (we-mp-rss数据) │
└─────────────────┘     └─────────────────┘
```

### 5.2 集成方案对比

| 方案 | 描述 | 优点 | 缺点 | 推荐度 |
|------|------|------|------|--------|
| **A. API 轮询** | InfoDigest 定时调用 we-mp-rss API 获取文章 | 实现简单，数据隔离 | 实时性差，有延迟 | ⭐⭐⭐ |
| **B. Webhook 推送** | we-mp-rss 通过 webhook 主动推送新文章 | 实时性好，无轮询开销 | 需要处理推送失败 | ⭐⭐⭐⭐ |
| **C. 数据库直连** | InfoDigest 直接读取 we-mp-rss 数据库 | 查询灵活，性能好 | 耦合度高，维护复杂 | ⭐⭐ |
| **D. RSS 订阅** | InfoDigest 订阅 RSS feed | 标准协议，解耦 | 数据字段有限 | ⭐⭐⭐ |

### 5.3 推荐方案：Webhook + API 混合

#### 数据流设计
```
1. 用户扫码授权微信 → we-mp-rss 获取 token
2. we-mp-rss 定时抓取公众号文章
3. 发现新文章 → 触发 Webhook 推送到 InfoDigest
4. InfoDigest 接收 webhook，存储文章
5. 如 webhook 失败，InfoDigest 定时 API 轮询补偿
```

#### InfoDigest 端实现

**Webhook 接收端点**:
```python
# FastAPI 示例
@app.post("/webhook/wechat-article")
async def receive_wechat_article(
    article: WechatArticle,
    signature: str = Header(...)
):
    # 1. 验证签名
    verify_webhook_signature(signature, article)
    
    # 2. 存储文章
    await save_article({
        "source": "wechat",
        "mp_name": article.mp_name,
        "title": article.title,
        "url": article.url,
        "content": article.content,
        "content_html": article.content_html,
        "publish_time": article.publish_time,
        "raw_data": article.dict()
    })
    
    return {"status": "ok"}
```

**API 轮询补偿**:
```python
# 定时任务（每15分钟执行一次）
async def sync_wechat_articles():
    # 1. 获取上次同步时间
    last_sync = await get_last_sync_time("wechat")
    
    # 2. 调用 we-mp-rss API
    articles = await fetch_wemp_articles(
        start_time=last_sync,
        limit=100
    )
    
    # 3. 存储新文章
    for article in articles:
        if not await article_exists(article.id):
            await save_article(article)
    
    # 4. 更新同步时间
    await update_last_sync_time("wechat")
```

### 5.4 多用户 Token 管理

we-mp-rss 本身支持多用户，每个用户可以授权不同的微信账号：

```
we-mp-rss 用户体系:
├── user_1 (管理员)
│   └── 微信账号: wx_account_1
│       └── 订阅公众号: [公众号A, 公众号B]
├── user_2
│   └── 微信账号: wx_account_2
│       └── 订阅公众号: [公众号C]
└── user_3
    └── 微信账号: wx_account_3
        └── 订阅公众号: [公众号D, 公众号E]
```

**InfoDigest 映射设计**:
```python
# 用户绑定表
class WechatBinding:
    user_id: str              # InfoDigest 用户ID
    wemp_user_id: str         # we-mp-rss 用户ID
    wemp_api_key: str         # API Key
    wemp_api_secret: str      # API Secret
    wx_account: str           # 微信账号标识
    status: str               # active/inactive
    created_at: datetime
```

---

## 6. 风险评估

### 6.1 微信授权 Token 过期

#### Token 有效期
- **Access Token**: 2 小时（7200 秒）
- **Refresh Token**: 理论上永久有效，但可能被微信回收
- **实际经验**: 部分用户反馈 Token 可能在 16-30 分钟内提前失效

#### 应对策略
```yaml
# we-mp-rss 配置
config.yaml:
  # 自动检查授权状态，默认开启
  enable_job: True
  
  # 授权过期时发送二维码通知
  send_code: True
  
  # 定时任务执行间隔（秒）
  interval: 10
```

**InfoDigest 端建议**:
1. 监控 webhook 推送状态，如长时间无推送，可能授权已过期
2. 提供用户重新授权入口
3. 授权过期前主动提醒用户

### 6.2 "小黑屋" 封号风险

#### 风险来源
| 行为 | 风险等级 | 后果 |
|------|----------|------|
| 高频抓取文章 | 高 | 触发微信风控，限制接口访问 |
| 短时间内大量请求 | 高 | IP 被封禁 |
| 使用非正常渠道获取 Token | 极高 | 微信账号永久封禁 |
| 批量操作多个公众号 | 中 | 被判定为营销号/机器人 |

#### 安全策略
```yaml
# we-mp-rss 安全配置
config.yaml:
  # 抓取间隔（秒）- 建议不低于 10 秒
  span_interval: 10
  
  # 最大线程数 - 建议不超过 2
  threads: 1
  
  # 第一次添加时采集的最大页数
  max_page: 5
  
  # 是否采集内容（仅抓取元数据可降低风险）
  gather:
    content: True
    model: web  # web/api/app
    content_auto_check: True
    content_auto_interval: 59  # 分钟
```

**InfoDigest 端建议**:
1. **控制抓取频率**: 每个公众号每天抓取不超过 2-3 次
2. **错峰抓取**: 避免整点触发，使用随机时间偏移
3. **多账号分散**: 重要公众号分散到多个微信账号
4. **监控异常**: 监控抓取失败率，超过阈值暂停抓取

### 6.3 服务稳定性

#### 潜在问题
| 问题 | 影响 | 概率 |
|------|------|------|
| we-mp-rss 服务崩溃 | 文章抓取中断 | 中 |
| 微信接口变更 | 抓取失败 | 低 |
| 数据库损坏 | 数据丢失 | 低 |
| 服务器重启 | 服务中断 | 高 |

#### 高可用方案
```yaml
# Docker Compose 部署示例
version: '3'
services:
  we-mp-rss:
    image: ghcr.io/rachelos/we-mp-rss:latest
    restart: always
    ports:
      - "8001:8001"
    volumes:
      - ./data:/app/data
    environment:
      - DB=mysql+pymysql://user:pass@mysql/we_mp_rss?charset=utf8mb4
      - ENABLE_JOB=True
      - LOG_LEVEL=INFO
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mysql:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: we_mp_rss
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

### 6.4 数据安全

#### 风险点
- 微信授权信息存储
- 文章内容版权
- 用户隐私数据

#### 建议措施
1. **数据加密**: 数据库敏感字段加密存储
2. **访问控制**: API Key 定期轮换，最小权限原则
3. **数据脱敏**: 不存储用户微信openid等敏感信息
4. **合规声明**: 用户协议中明确数据使用范围

---

## 7. 运维监控

### 7.1 关键指标监控
```python
# 建议监控指标
METRICS = {
    # 服务健康
    "service_up": 1,  # 0/1
    
    # 抓取指标
    "articles_fetched_total": 100,
    "articles_fetch_failed": 5,
    "fetch_duration_seconds": 2.5,
    
    # 授权状态
    "auth_status": 1,  # 0=过期, 1=正常
    "token_refresh_count": 3,
    
    # 数据库
    "db_connection_active": 5,
    "db_query_duration": 0.1,
}
```

### 7.2 日志配置
```yaml
# config.yaml
log:
  file: /var/log/we-mp-rss.log
  level: INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
```

### 7.3 告警规则
```yaml
# 告警建议
alerts:
  - name: 服务宕机
    condition: service_up == 0
    severity: critical
    
  - name: 抓取失败率过高
    condition: (articles_fetch_failed / articles_fetched_total) > 0.1
    severity: warning
    
  - name: 授权过期
    condition: auth_status == 0
    severity: critical
    
  - name: 抓取延迟过高
    condition: fetch_duration_seconds > 30
    severity: warning
```

---

## 8. 总结与建议

### 8.1 部署建议
1. **生产环境**: 使用 MySQL + Docker Compose 部署
2. **数据备份**: 每日自动备份数据库
3. **监控告警**: 接入 Prometheus/Grafana 监控

### 8.2 集成建议
1. **首选方案**: Webhook + API 轮询混合模式
2. **容错设计**: Webhook 失败时自动切换轮询补偿
3. **数据映射**: 建立 we-mp-rss 用户与 InfoDigest 用户绑定表

### 8.3 风险缓解
1. **控制频率**: 抓取间隔不小于 10 秒，单号日抓取不超过 3 次
2. **多账号策略**: 重要公众号分散到多个微信账号
3. **授权管理**: 建立授权过期监控和自动提醒机制
4. **服务冗余**: 部署多个 we-mp-rss 实例，负载均衡

### 8.4 下一步行动
1. [ ] 搭建 we-mp-rss 测试环境
2. [ ] 测试扫码授权流程
3. [ ] 开发 InfoDigest Webhook 接收端
4. [ ] 实现 API 轮询补偿逻辑
5. [ ] 部署生产环境并接入监控

---

## 附录

### A. 环境变量完整列表

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| APP_NAME | we-mp-rss | 应用名称 |
| SERVER_NAME | we-mp-rss | 服务名称 |
| WEB_NAME | WeRSS微信公众号订阅助手 | 前端显示名称 |
| DB | sqlite:///data/db.db | 数据库连接 |
| REDIS_URL | - | Redis 连接（可选） |
| SECRET_KEY | we-mp-rss | JWT 密钥 |
| PORT | 8001 | 服务端口 |
| DEBUG | False | 调试模式 |
| USERNAME | admin | 默认用户名 |
| PASSWORD | admin@123 | 默认密码 |
| TOKEN_EXPIRE_MINUTES | 4320 | 登录会话有效期（分钟） |
| SPAN_INTERVAL | 10 | 抓取间隔（秒） |
| MAX_PAGE | 5 | 首次抓取最大页数 |
| THREADS | 1 | 最大线程数 |
| ENABLE_JOB | True | 启用定时任务 |
| RSS_BASE_URL | - | RSS 域名地址 |
| RSS_FULL_CONTEXT | True | 显示全文 |
| DINGDING_WEBHOOK | - | 钉钉 Webhook |
| FEISHU_WEBHOOK | - | 飞书 Webhook |
| WECHAT_WEBHOOK | - | 企业微信 Webhook |

### B. 常用命令

```bash
# 查看日志
docker logs -f we-mp-rss

# 进入容器
docker exec -it we-mp-rss sh

# 备份数据
cp -r ./data ./data_backup_$(date +%Y%m%d)

# 数据库导出（SQLite）
sqlite3 ./data/db.db ".dump" > backup.sql

# 重启服务
docker restart we-mp-rss
```

### C. 参考链接
- [we-mp-rss GitHub](https://github.com/rachelos/we-mp-rss)
- [微信开放文档](https://developers.weixin.qq.com/doc/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
