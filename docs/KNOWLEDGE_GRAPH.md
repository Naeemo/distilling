# 知识图谱与文章关联分析

## 功能概述

回答核心问题：**"这篇文章在信息世界里处于什么位置？"**

文章不是孤岛。要真正理解一篇文章，需要知道：
- 它属于哪个主题簇
- 与哪些文章观点相似或冲突
- 引用了谁、被谁引用
- 在信息演进的时间线上处于什么位置

## 核心概念

### 1. 内容洞察 (ContentInsight)
每篇文章的深度分析结果：

| 字段 | 说明 |
|------|------|
| `topics` | 主题标签及置信度 |
| `keyEntities` | 关键实体（人名、组织、地点）|
| `sentiments` | 情感分析 |
| `stance` | 立场：支持/批判/中立/探索 |
| `keyClaims` | 核心主张 |
| `qualityScore` | 质量评分 0-1 |
| `credibilityScore` | 可信度评分 0-1 |
| `embedding` | 向量嵌入（用于相似度）|

### 2. 关联关系 (ContentRelation)

```typescript
enum RelationType {
  SIMILAR_TOPIC      // 主题相似
  CONTRADICTORY      // 观点冲突
  SUPPORTIVE         // 观点支持
  REFERENCED         // 引用关系
  SEQUEL             // 后续报道
  SAME_AUTHOR        // 同作者
  SHARED_ENTITY      // 共享实体
  TEMPORAL_CHAIN     // 时间线
  CAUSAL             // 因果关系
  BROADER_CONTEXT    // 更广上下文
  NARROWER_FOCUS     // 更聚焦角度
}
```

### 3. 信息位置 (ContentPosition)

**GET /api/v1/knowledge-graph/contents/:id/position**

返回：
```json
{
  "position": {
    "domain": "tech",           // 领域
    "level": "deep",            // 深度: surface/intermediate/deep
    "audience": "professional", // 受众
    "informationDensity": 0.75  // 信息密度
  },
  "networkStats": {
    "relatedCount": 12,         // 关联文章数
    "similarTopics": 5,         // 相似主题
    "contradictoryCount": 2,    // 对立观点
    "supportiveCount": 3,       // 支持观点
    "entityConnections": 8      // 实体连接
  },
  "topicClusters": [
    { "name": "AI", "relevance": 0.92, "articleCount": 45 }
  ],
  "role": {
    "type": "synthesis",        // source/synthesis/commentary/breaking
    "importance": 0.8,
    "uniqueness": 0.6
  }
}
```

## API 端点

### 内容洞察
- `POST /api/v1/knowledge-graph/contents/:id/insight` - 分析文章
- `GET /api/v1/knowledge-graph/contents/:id/insight` - 获取洞察

### 关联管理
- `POST /api/v1/knowledge-graph/relations` - 创建关联
- `GET /api/v1/knowledge-graph/contents/:id/relations` - 获取关联列表

### 知识图谱
- `GET /api/v1/knowledge-graph/graph` - 获取图谱数据（力导向图）
- `GET /api/v1/knowledge-graph/contents/:id/position` - 获取信息位置
- `GET /api/v1/knowledge-graph/contents/:id/discover` - 自动发现关联

## 前端展示建议

### 1. 知识图谱可视化
使用 D3.js 或 Cytoscape.js 展示：
- 节点：文章，大小代表质量，颜色代表主题
- 边：关联关系，粗细代表强度，颜色代表类型
- 力导向布局：自动排列节点

### 2. 信息位置卡片
在文章详情页展示：
```
┌─────────────────────────────┐
│  📍 信息位置                  │
│  领域: 科技 > AI              │
│  深度: 深度分析               │
│  受众: 专业人士               │
│                             │
│  🕸️ 关联网络 (12篇文章)       │
│  ● 相似 5  ⚔️ 对立 2  ✓ 支持 3 │
│                             │
│  🎭 角色: 综合论述            │
│  重要度: ████████░░ 80%      │
│  独特性: ██████░░░░ 60%      │
└─────────────────────────────┘
```

### 3. 关联文章推荐
在文章底部展示：
- **相似视角**：观点相近的文章
- **不同声音**：观点对立的文章
- **延伸阅读**：更广/更聚焦的文章
- **时间线**：相关事件的发展

## 数据库模型

见 `apps/api/prisma/schema.prisma`：
- `ContentInsight` - 内容洞察
- `ContentRelation` - 关联关系
- `TopicCluster` - 主题聚类
- `ClusterContent` - 聚类内容关联

## 实现状态

- ✅ 数据库模型
- ✅ API 端点
- ✅ 关联分析算法
- ✅ 信息位置计算
- ✅ 自动关联发现
- ⏳ 前端可视化组件
