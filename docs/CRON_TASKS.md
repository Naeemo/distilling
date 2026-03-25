# InfoDigest 定时任务配置

## 当前任务

### 1. 开发进度跟踪 (daily)
**Schedule**: 0 9 * * * (每天上午9点)
**Action**: 检查开发进度，更新文档，推进待办事项
**Last Run**: 2026-03-25

### 2. CI/CD 状态检查 (4h)
**Schedule**: 0 */4 * * * (每4小时)
**Action**: 检查 GitHub Actions 运行状态
**Status**: 当前 CI 稳定通过

### 3. 微信文章采集检查 (6h)
**Schedule**: 0 */6 * * * (每6小时)
**Action**: 测试微信文章正文提取方案
**Next**: 待 Chrome 扩展测试完成后评估

## 待添加任务

### 邮件转发服务检查 (pending)
待邮件转发功能实现后启用

### 生产环境健康检查 (pending)
待 GCP 部署完成后启用
