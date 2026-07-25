# AI模块技术文档

## 1. 概述

AI（人工智能）模块是TOPEMS平台的核心模块之一，提供机器学习、深度学习、自然语言处理、计算机视觉等AI能力，帮助企业实现智能化决策和自动化流程。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 预测分析 | 需求预测、销售预测、设备故障预测 |
| 智能推荐 | 产品推荐、内容推荐、个性化服务 |
| 图像识别 | 质检检测、目标识别、异常检测 |
| 自然语言处理 | 文本分类、情感分析、智能问答 |
| 模型管理 | 模型训练、模型部署、模型监控 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      AI模块架构                             │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/                                                │
│  │   └── AiPage.tsx         # AI主页面                   │
│  └── components/                                           │
│      └── ai/                                               │
│          ├── ModelCard.tsx   # 模型卡片                  │
│          └── PredictionForm.tsx # 预测表单               │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── ai.ts                # AI API客户端                   │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + Python ML Services)                     │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── prediction.rs     # 预测服务                     │
│  │   ├── recommendation.rs # 推荐服务                    │
│  │   ├── image.rs          # 图像识别                    │
│  │   └── nlp.rs            # 自然语言处理                 │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心功能详解

### 2.1 预测分析

**功能说明**：基于历史数据进行预测分析。

**数据模型**：

```typescript
interface Prediction {
  id: string;                    // 预测ID
  model_id: string;              // 模型ID
  model_name: string;            // 模型名称
  type: 'demand' | 'sales' | 'fault' | 'quality'; // 预测类型
  input_data: Record<string, any>; // 输入数据
  result: PredictionResult;      // 预测结果
  confidence: number;            // 置信度(%)
  created_at: string;            // 创建时间
}

interface PredictionResult {
  value: number;                 // 预测值
  unit: string;                  // 单位
  range: [number, number];       // 预测范围
  trend: 'up' | 'down' | 'stable'; // 趋势
  explanation: string;           // 解释说明
}
```

### 2.2 智能推荐

**功能说明**：基于用户行为和偏好提供个性化推荐。

**数据模型**：

```typescript
interface Recommendation {
  id: string;                    // 推荐ID
  user_id: string;               // 用户ID
  type: 'product' | 'content' | 'service'; // 推荐类型
  items: RecommendationItem[];   // 推荐项
  strategy: string;              // 推荐策略
  created_at: string;            // 创建时间
}

interface RecommendationItem {
  id: string;                    // 推荐项ID
  item_id: string;               // 物品ID
  item_name: string;             // 物品名称
  score: number;                 // 推荐分数
  reason: string;                // 推荐理由
}
```

### 2.3 图像识别

**功能说明**：基于图像进行目标检测和识别。

**数据模型**：

```typescript
interface ImageAnalysis {
  id: string;                    // 分析ID
  image_url: string;             // 图像URL
  type: 'quality' | 'object' | 'defect'; // 分析类型
  results: DetectionResult[];    // 检测结果
  confidence: number;            // 整体置信度
  created_at: string;            // 创建时间
}

interface DetectionResult {
  id: string;                    // 检测结果ID
  label: string;                 // 标签
  confidence: number;            // 置信度(%)
  bounding_box: [number, number, number, number]; // 边界框 [x, y, width, height]
  severity?: 'low' | 'medium' | 'high'; // 严重程度
}
```

### 2.4 自然语言处理

**功能说明**：处理和分析文本数据。

**数据模型**：

```typescript
interface NlpAnalysis {
  id: string;                    // 分析ID
  text: string;                  // 输入文本
  type: 'classification' | 'sentiment' | 'qa' | 'summary'; // 分析类型
  result: NlpResult;             // 分析结果
  created_at: string;            // 创建时间
}

interface NlpResult {
  classification?: {
    category: string;            // 分类类别
    confidence: number;          // 置信度
  };
  sentiment?: {
    score: number;               // 情感分数 (-1到1)
    label: 'positive' | 'negative' | 'neutral'; // 情感标签
  };
  answer?: string;               // 问答答案
  summary?: string;              // 摘要
}
```

### 2.5 模型管理

**功能说明**：管理AI模型的训练和部署。

**数据模型**：

```typescript
interface Model {
  id: string;                    // 模型ID
  name: string;                  // 模型名称
  type: 'classification' | 'regression' | 'clustering' | 'nlp'; // 模型类型
  status: 'training' | 'trained' | 'deployed' | 'retired'; // 状态
  accuracy: number;              // 准确率
  last_trained_at: string;       // 最后训练时间
  deployed_at?: string;          // 部署时间
  created_at: string;            // 创建时间
}
```

---

## 3. API接口文档

### 3.1 预测分析接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 创建预测 | POST | `/api/v1/ai/predictions` |
| 获取预测结果 | GET | `/api/v1/ai/predictions/:id` |
| 获取预测历史 | GET | `/api/v1/ai/predictions` |

### 3.2 智能推荐接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取推荐 | GET | `/api/v1/ai/recommendations` |
| 刷新推荐 | POST | `/api/v1/ai/recommendations/refresh` |

### 3.3 图像识别接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 分析图像 | POST | `/api/v1/ai/image/analyze` |
| 批量分析 | POST | `/api/v1/ai/image/batch` |

### 3.4 自然语言处理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 文本分类 | POST | `/api/v1/ai/nlp/classify` |
| 情感分析 | POST | `/api/v1/ai/nlp/sentiment` |
| 智能问答 | POST | `/api/v1/ai/nlp/qa` |
| 文本摘要 | POST | `/api/v1/ai/nlp/summary` |

### 3.5 模型管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取模型列表 | GET | `/api/v1/ai/models` |
| 创建模型 | POST | `/api/v1/ai/models` |
| 训练模型 | POST | `/api/v1/ai/models/:id/train` |
| 部署模型 | PUT | `/api/v1/ai/models/:id/deploy` |
| 删除模型 | DELETE | `/api/v1/ai/models/:id` |

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11  
**作者**: TOPEMS开发团队