# Chrome 扩展测试指南

## 自动测试 (Playwright)

使用 Playwright 控制真实 Chrome 浏览器测试扩展。

### 准备

```bash
# 安装仓库依赖
pnpm install

# 构建扩展
pnpm --filter @infodigest/extension build
```

### 运行测试

```bash
# 测试默认文章
pnpm --filter @infodigest/api exec ts-node ../../scripts/test-extension.ts

# 测试指定微信文章
pnpm --filter @infodigest/api exec ts-node ../../scripts/test-extension.ts "https://mp.weixin.qq.com/s?__biz=xxx&mid=xxx"
```

### 测试过程

1. 启动真实 Chrome 浏览器
2. 加载扩展 (manifest v3)
3. 导航到微信文章
4. 执行内容提取逻辑
5. 输出提取结果和验证报告

### 预期输出

```
📄 提取结果
============================================================
✅ 成功: true
📰 标题: 文章标题
✍️  作者: 作者名
📝 内容长度: 1234 字符

✅ 验证结果:
  ✓ 标题: 通过
  ✓ 内容: 通过

🎉 所有测试通过！扩展工作正常。
```

---

## 手动测试

如果不想使用 Playwright，可以手动测试：

### 1. 加载扩展

1. 打开 Chrome，进入 `chrome://extensions/`
2. 开启右上角"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 先执行一次 `pnpm --filter @infodigest/extension build`
5. 选择 `apps/extension` 目录

### 2. 测试提取

1. 打开任意微信公众号文章
2. 点击工具栏扩展图标
3. 观察弹窗是否显示文章信息
4. 点击"保存到 InfoDigest"
5. 检查后端是否收到数据

---

## 故障排查

### 无法提取正文

微信有反爬机制，如果无法提取：
- 检查是否在文章页面停留足够时间
- 尝试刷新页面后再点击扩展
- 检查控制台是否有 JavaScript 错误

### 跨域问题

如果后端报 CORS 错误：
- 确保后端 `main.ts` 中 CORS 配置包含 `chrome-extension://*`
- 或使用背景脚本转发请求 (已实现)

### 扩展图标不显示

检查 `manifest.json` 中图标路径：
```json
"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```
