# 移动端快捷指令

这个仓库当前没有提供独立的移动应用。

## 现在已有的方式

更实际的移动端路径有两种：

- 把链接或分享文本粘贴到 Web 应用
- 使用文档中附带的 iOS 快捷指令参考配置

参考快捷指令文件在这里：

- [/assets/ios-shortcut-config.json](/assets/ios-shortcut-config.json)

## 什么时候适合使用快捷指令

以下情况下适合这条流程：

- 你经常通过 iPhone 或 iPad 收集内容
- 你想要一条轻量的交接路径进入 InfoDigest
- 你可以接受先复制一次 Integration Token 到快捷指令里

## 需要有什么预期

这个快捷指令是基于同一套 Integration Token 流程构建的参考材料，不是完整支持的一方移动产品。

更准确地说，它是：

- 一个起点
- 一种验证移动端友好采集的方式
- 一座接入同一资料库的桥梁，而资料库仍由 Web 应用承载

## 设置方式

使用前请先：

1. 登录 Web 应用
2. 打开 `Dashboard -> Integrations`
3. 生成一个 Integration Token
4. 把这个 Token 填进快捷指令初始化问题里

快捷指令请求的是 Next.js 暴露的受控入口，再由 Next.js 转发到内部 API。Nest API 不直接对快捷指令开放。

## 最稳妥的兜底方式

如果快捷指令不适合你的设置，最可靠的替代方式仍然是：

1. 复制链接或分享文本
2. 打开 Web 应用
3. 粘贴到 Quick Collect
