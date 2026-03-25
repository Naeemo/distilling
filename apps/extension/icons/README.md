# 图标说明

本扩展需要以下尺寸的图标文件：

- `icon16.png` - 16x16 像素（工具栏图标）
- `icon48.png` - 48x48 像素（扩展管理页面）
- `icon128.png` - 128x128 像素（Chrome 商店）

## 获取图标

### 方案 1：使用设计工具创建

使用 Figma、Sketch 或 Photoshop 创建渐变紫色主题的图标，推荐配色：
- 起始色：`#667eea`
- 结束色：`#764ba2`

### 方案 2：使用在线工具

可以使用以下在线工具生成：
- [Chrome Extension Icon Generator](https://circle-icons.com/)
- [Favicon.io](https://favicon.io/)

### 方案 3：临时使用占位图标

在开发阶段，可以使用纯色方块作为临时图标：

```bash
# 使用 ImageMagick 生成（如果已安装）
convert -size 128x128 xc:'#667eea' -pointsize 20 -fill white -gravity center -annotate +0+0 "ID" icon128.png
convert -size 48x48 xc:'#667eea' -pointsize 10 -fill white -gravity center -annotate +0+0 "ID" icon48.png
convert -size 16x16 xc:'#667eea' -pointsize 6 -fill white -gravity center -annotate +0+0 "I" icon16.png
```

## 图标建议

建议使用简洁的设计，包含：
- 渐变色背景
- 「ID」或「阅」字样（代表 InfoDigest / 阅读）
- 圆角矩形或圆形背景

参考风格：Material Design 或 Fluent Design 的简洁风格。