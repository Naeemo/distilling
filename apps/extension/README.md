# InfoDigest Chrome 扩展

一键保存微信公众号文章到 InfoDigest。

## 功能特性

- 一键提取微信公众号文章标题、作者、正文
- 自动调用 InfoDigest API 保存内容
- 支持网页端自动 Token 同步
- 错误处理和自动重试机制
- 美观的弹窗界面

## 安装方法

### 开发模式安装

先构建扩展资源：

```bash
pnpm --filter @infodigest/extension build
```

1. 打开 Chrome 浏览器，进入 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `apps/extension` 文件夹

### 登录与 Token

1. 先在 InfoDigest Web 应用中登录
2. Web 端会自动把 Access Token 同步到扩展
3. 打开扩展弹窗后即可直接保存文章

## 使用方法

1. 打开任意微信公众号文章（`mp.weixin.qq.com` 域名）
2. 点击浏览器工具栏的 InfoDigest 图标
3. 确认文章信息无误后，点击「保存到 InfoDigest」
4. 等待保存完成提示

## 项目结构

```
extension/
├── manifest.json          # 扩展配置文件（Manifest V3）
├── src/
│   ├── content.ts         # 内容脚本 - 提取微信文章
│   ├── background.ts      # 后台服务 - 调用 API
│   ├── popup.html         # 弹窗界面
│   └── popup.ts           # 弹窗逻辑
├── dist/                  # 编译产物（build 后生成）
└── README.md
```

## 开发

### 构建

```bash
# 在仓库根目录安装依赖
pnpm install

# 编译 TypeScript 并复制 popup.html
pnpm --filter @infodigest/extension build
```

### TypeScript 配置

扩展源码位于 `src/`，构建产物输出到 `dist/`，`manifest.json` 直接引用 `dist/*.js` 与 `dist/popup.html`。

## API 接口

### 保存内容

```http
POST http://localhost:3001/api/v1/contents
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://mp.weixin.qq.com/s/...",
  "title": "文章标题",
  "contentText": "文章内容纯文本",
  "sourceType": "WEB"
}
```

## 注意事项

1. **CORS 问题**：确保 InfoDigest API 服务器允许来自 Chrome 扩展的跨域请求
2. **Token 安全**：Token 存储在浏览器的本地存储中，请勿在公共电脑上使用
3. **网络问题**：如果保存失败，扩展会自动重试 3 次

## 故障排除

### 扩展图标显示灰色

- 确保当前页面是微信公众号文章（`mp.weixin.qq.com`）

### 提示「未登录」

- 先确认已经在 InfoDigest Web 端完成登录
- 刷新 Web 页面，等待 Token 自动同步到扩展

### 保存失败

- 检查网络连接
- 确认 Token 有效
- 查看控制台日志获取详细错误信息

## 技术栈

- Manifest V3
- TypeScript
- Chrome Extension API

## 许可证

MIT
