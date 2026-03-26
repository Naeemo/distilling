# 知萃智能分析框架 v2.0

## 核心问题
传统分析：固定结构、一视同仁、缺乏判断力
目标分析：方法论适配、动态输出、智能过滤

## 多维度内容分类

### 1. 信息类型识别 (Information Type)
| 类型 | 特征 | 适用方法论 |
|------|------|-----------|
| breaking | 突发新闻、时效性强 | 新闻学5W1H + 信源验证 |
| analysis | 深度分析、观点文章 | 逻辑学论证结构 + 证据链评估 |
| research | 学术/研究报告 | 科学方法复现性 + 引用网络 |
| opinion | 评论/随笔 | 修辞分析 + 立场识别 |
| data | 数据报告/财报 | 统计学显著性 + 趋势分析 |
| tutorial | 教程/指南 | 知识结构 + 可操作性评估 |
| noise | 低信息熵内容 | 快速过滤，不入库 |

### 2. 重要性评估 (Significance)
```
重要性 = f(信源权威性, 信息新颖性, 用户相关性, 时间衰减)
```
- **核心文章** (high): 深度分析，完整知识图谱节点
- **参考文章** (medium): 摘要+关键实体，轻量关联
- **噪声** (low): 仅标题+标签，或完全忽略

### 3. 动态输出结构

#### 3.1 核心文章输出
```typescript
interface CoreAnalysis {
  // 元数据
  infoType: 'breaking' | 'analysis' | 'research' | ...;
  significance: 'high' | 'medium' | 'low';
  
  // 内容层 (根据类型变化)
  content: {
    // news: 5W1H
    // analysis: 论点-论据-结论
    // research: 假设-方法-结果-局限
    // data: 关键指标+趋势+异常
    [key: string]: any;
  };
  
  // 认知层
  epistemology: {
    claims: Claim[];           // 核心主张
    evidence: Evidence[];      // 证据链
    confidence: number;        // 可信度评分
    biases: Bias[];           // 识别到的偏见
  };
  
  // 网络层
  network: {
    entities: Entity[];        // 关键实体 (人/组织/概念)
    relations: Relation[];     // 实体关系
    citations: Citation[];     // 引用网络
    contradictions: Conflict[]; // 与已有知识的冲突
  };
  
  // 行动层
  action: {
    followups: string[];       // 建议跟进阅读
    factChecks: string[];      // 需要验证的点
    expiresAt?: Date;          // 时效性过期时间
  };
}
```

#### 3.2 轻量文章输出
```typescript
interface LightAnalysis {
  infoType: string;
  significance: 'medium' | 'low';
  summary: string;           // 一句话摘要
  keyEntities: string[];     // 仅实体名称
  tags: string[];
  // 无深层分析
}
```

### 4. 智能过滤机制

#### 4.1 噪声检测 (信息论)
```
信息熵 H(X) = -Σ p(x) log p(x)

低熵指标:
- 重复内容 > 70%
- 常见词密度过高
- 缺乏具体实体/数据
- 情绪化词汇占比高
```

#### 4.2 决策流程
```
输入文章
    ↓
[类型分类器] → infoType
    ↓
[重要性评估] → significance
    ↓
    ├─ high → [核心分析流程] → 完整知识图谱节点
    ├─ medium → [轻量分析] → 摘要+标签
    └─ low → [噪声过滤] → 丢弃或仅存档标题
```

### 5. 方法论实现

#### 5.1 新闻学 - 5W1H
```typescript
const journalismMethod = {
  who: extractActors(),      // 谁参与
  what: extractEvent(),      // 发生什么
  when: extractTime(),       // 时间
  where: extractLocation(),  // 地点
  why: extractCause(),       // 原因
  how: extractProcess(),     // 过程
  
  // 信源验证
  sources: validateSources(),
  credibility: scoreCredibility(),
};
```

#### 5.2 逻辑学 - 论证分析
```typescript
const logicMethod = {
  // 识别论证结构
  premises: extractPremises(),
  conclusion: extractConclusion(),
  argumentType: classifyArgument(), // 演绎/归纳/类比
  
  // 逻辑谬误检测
  fallacies: detectFallacies(),
  
  // 证据强度
  evidenceStrength: assessEvidence(),
};
```

#### 5.3 信息论 - 价值评估
```typescript
const informationMethod = {
  entropy: calculateEntropy(),      // 信息熵
  novelty: compareWithExisting(),   // 新颖性
  compression: compressibility(),   // 可压缩度(冗余)
  signalToNoise: snr(),             // 信噪比
};
```

### 6. 知识图谱动态构建

#### 6.1 不是每篇文章都创建完整节点
- **核心文章**: 实体+关系+证据链
- **轻量文章**: 仅标签关联
- **噪声**: 不入图谱

#### 6.2 冲突检测与处理
```typescript
interface Conflict {
  type: 'contradiction' | 'update' | 'perspective';
  existingClaim: Claim;
  newClaim: Claim;
  resolution: 'flag' | 'merge' | 'branch';
}
```

### 7. 实现优先级

1. **类型分类器** - 基于标题+首段+URL模式
2. **重要性评估** - 多维度评分模型
3. **核心分析流程** - 适配不同类型
4. **轻量分析** - 快速路径
5. **噪声过滤** - 信息熵计算
6. **冲突检测** - 与已有知识对比

### 8. 技术实现

```typescript
// 新的分析服务
class SmartAnalysisService {
  async analyze(content: Content): Promise<AnalysisResult> {
    // 1. 快速分类
    const type = await this.classify(content);
    
    // 2. 重要性评估
    const significance = await this.assessSignificance(content, type);
    
    // 3. 路由到不同分析流程
    switch (significance) {
      case 'high':
        return this.coreAnalysis(content, type);
      case 'medium':
        return this.lightAnalysis(content, type);
      case 'low':
        return { action: 'discard', reason: 'low_significance' };
    }
  }
}
```
