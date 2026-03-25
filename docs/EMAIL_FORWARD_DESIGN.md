# 邮件转发接口设计

## 概述

用户可以通过发送邮件到专属邮箱地址来保存公众号文章。

## 工作流程

```
用户发送邮件 → 邮件服务器接收 → 触发 Webhook → 解析邮件 → 
提取 URL → 抓取内容 → 创建内容记录 → 发送确认通知
```

## 接口设计

### 1. 获取专属邮箱地址

```http
GET /api/v1/users/me/email-forwarding
Authorization: Bearer {token}
```

响应：
```json
{
  "email": "save-a1b2c3d4@infodigest.app",
  "enabled": true,
  "createdAt": "2024-01-15T08:30:00Z"
}
```

### 2. 重新生成邮箱地址

```http
POST /api/v1/users/me/email-forwarding/regenerate
Authorization: Bearer {token}
```

### 3. Webhook 接收邮件

```http
POST /webhooks/email-forwarding
Content-Type: application/json
X-Webhook-Secret: {secret}

{
  "to": "save-a1b2c3d4@infodigest.app",
  "from": "user@example.com",
  "subject": "文章标题",
  "text": "邮件正文...",
  "html": "<p>邮件正文...</p>",
  "attachments": []
}
```

## 邮件解析规则

### 链接提取

1. **优先从正文提取**
   - 查找第一个 `https://mp.weixin.qq.com/*` 链接
   - 如果没有，查找任意 `http(s)://*` 链接

2. **备用方案**
   - 从邮件主题中提取标题
   - 从邮件正文第一行提取标题

### 内容创建逻辑

```typescript
async function processEmail(email: IncomingEmail) {
  // 1. 查找用户
  const user = await findUserByEmailAlias(email.to);
  if (!user) throw new Error('User not found');
  
  // 2. 提取链接
  const url = extractUrl(email.text || email.html);
  
  if (url) {
    // 3a. 有链接 - 创建 URL 内容
    const content = await createContentFromUrl({
      userId: user.id,
      url,
      title: email.subject || undefined,
      sourceType: 'EMAIL_FORWARD',
      metadata: {
        forwardedFrom: email.from,
        forwardedAt: new Date(),
      }
    });
    
    // 4. 添加邮件正文作为笔记（如果有额外内容）
    const noteText = extractNoteText(email.text, url);
    if (noteText) {
      await addContentNote(content.id, noteText);
    }
  } else {
    // 3b. 无链接 - 创建纯文本内容
    const content = await createTextContent({
      userId: user.id,
      title: email.subject || '邮件内容',
      contentText: email.text,
      sourceType: 'EMAIL_FORWARD',
    });
  }
  
  // 5. 发送确认邮件（可选）
  await sendConfirmation(email.from, content);
}
```

## 数据库变更

### 新增表：email_aliases

```sql
CREATE TABLE email_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_alias VARCHAR(255) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_aliases_alias ON email_aliases(email_alias);
CREATE INDEX idx_email_aliases_user ON email_aliases(user_id);
```

### contents 表添加字段

```sql
ALTER TABLE contents 
ADD COLUMN source_type VARCHAR(50) DEFAULT 'WEB',
ADD COLUMN metadata JSONB DEFAULT '{}';

-- source_type 枚举: WEB, RSS, NEWSLETTER, MANUAL, EMAIL_FORWARD, API
```

## 邮件服务集成

### 方案 A: Mailgun

```typescript
// Webhook 处理
app.post('/webhooks/mailgun', express.urlencoded(), async (req, res) => {
  const { recipient, sender, subject, 'body-plain': text, 'body-html': html } = req.body;
  
  await processEmail({
    to: recipient,
    from: sender,
    subject,
    text,
    html,
  });
  
  res.send('OK');
});
```

### 方案 B: SendGrid

```typescript
app.post('/webhooks/sendgrid', express.json(), async (req, res) => {
  const email = req.body[0];
  
  await processEmail({
    to: email.to[0].email,
    from: email.from.email,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
  
  res.send('OK');
});
```

### 方案 C: AWS SES + S3

```typescript
// SES 接收规则将邮件存入 S3
// Lambda 触发处理
export const handler = async (event: S3Event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  
  const email = await s3.getObject({ Bucket: bucket, Key: key }).promise();
  const parsed = await parseEmail(email.Body as Buffer);
  
  await processEmail({
    to: parsed.to[0].address,
    from: parsed.from.address,
    subject: parsed.subject,
    text: parsed.text,
    html: parsed.html,
  });
};
```

## 安全配置

1. **Webhook 验证**
   - 使用签名验证（Mailgun/SendGrid 提供）
   - 或 IP 白名单

2. **邮箱别名生成**
   - 使用随机字符串（16位）
   - 格式: `save-{alias}@infodigest.app`

3. **速率限制**
   - 每个邮箱别名: 每小时最多 20 封邮件
   - 超过限制则返回 429

## 错误处理

### 邮件回复模板

**成功处理:**
```
主题: 已保存: [文章标题]

您的文章已成功保存到知萃。

标题: [文章标题]
链接: [原始链接]
查看: https://infodigest.app/reader/[id]
```

**处理失败:**
```
主题: 保存失败: [错误原因]

很抱歉，我们无法处理您的邮件。

原因: [具体错误]
建议: [解决建议]

如果您认为这是一个错误，请联系 support@infodigest.app
```

常见错误原因:
- 无法访问链接（文章已被删除或限制访问）
- 未找到可识别的 URL
- 达到保存限额
- 内容已存在

## 实现优先级

1. P0: 基础邮件接收和链接提取
2. P0: 微信文章抓取
3. P1: 确认邮件回复
4. P1: 速率限制
5. P2: 邮件笔记添加
6. P2: 多服务商支持
