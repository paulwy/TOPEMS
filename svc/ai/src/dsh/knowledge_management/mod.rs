//! 知识管理模块
//!
//! 提供 AI 驱动的知识管理功能：
//! - 企业知识库（统一知识存储和检索）
//! - 专家发现（根据技能和经验找到合适专家）
//! - 最佳实践推荐（智能推荐相关最佳实践）
//! - 知识图谱构建（自动从文档构建知识图谱）

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

fn default_true() -> bool { true }

/// 知识条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeEntry {
    /// 知识 ID
    pub id: String,
    /// 知识标题
    pub title: String,
    /// 知识内容
    pub content: String,
    /// 知识类型
    pub knowledge_type: KnowledgeType,
    /// 分类
    pub category: String,
    /// 标签
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    /// 关键词
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub keywords: Vec<String>,
    /// 摘要
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    /// 作者
    pub author: KnowledgeAuthor,
    /// 专家评分（0-5）
    pub expert_rating: f32,
    /// 有用投票数
    pub helpful_votes: u32,
    /// 总投票数
    pub total_votes: u32,
    /// 浏览次数
    pub view_count: u32,
    /// 引用次数
    pub reference_count: u32,
    /// 版本号
    pub version: String,
    /// 状态
    pub status: KnowledgeStatus,
    /// 相关知识 ID
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub related_knowledge_ids: Vec<String>,
    /// 附件
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub attachments: Vec<KnowledgeAttachment>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
    /// 最后审核时间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_reviewed_at: Option<String>,
}

/// 知识类型
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum KnowledgeType {
    /// 最佳实践
    BestPractice,
    /// 操作指南
    HowToGuide,
    /// 常见问题
    #[serde(rename = "faq")]
    FAQ,
    /// 技术文档
    TechnicalDoc,
    /// 流程规范
    ProcessSpecification,
    /// 案例分析
    CaseStudy,
    /// 经验总结
    LessonLearned,
    /// 培训材料
    TrainingMaterial,
    /// 政策制度
    Policy,
    /// 其他
    Other,
}

/// 知识状态
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum KnowledgeStatus {
    /// 草稿
    Draft,
    /// 待审核
    PendingReview,
    /// 已发布
    Published,
    /// 已归档
    Archived,
    /// 已废弃
    Deprecated,
}

/// 知识作者
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeAuthor {
    /// 用户 ID
    pub user_id: String,
    /// 用户名称
    pub name: String,
    /// 部门
    #[serde(skip_serializing_if = "Option::is_none")]
    pub department: Option<String>,
    /// 职位
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<String>,
}

/// 知识附件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeAttachment {
    /// 附件 ID
    pub id: String,
    /// 文件名称
    pub file_name: String,
    /// 文件类型
    pub file_type: String,
    /// 文件大小
    pub file_size: u64,
    /// 文件 URL
    pub file_url: String,
}

/// 知识库
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeBase {
    /// 知识库 ID
    pub id: String,
    /// 知识库名称
    pub name: String,
    /// 知识库描述
    pub description: String,
    /// 所属部门
    pub department: String,
    /// 可见范围
    pub visibility: KnowledgeVisibility,
    /// 知识条目数量
    pub entry_count: u32,
    /// 分类列表
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub categories: Vec<String>,
    /// 标签云
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub tag_cloud: HashMap<String, u32>,
    /// 创建者
    pub creator: KnowledgeAuthor,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

/// 知识可见范围
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum KnowledgeVisibility {
    /// 公开
    Public,
    /// 部门内
    Department,
    /// 团队内
    Team,
    /// 私有
    Private,
}

/// 知识检索请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeSearchRequest {
    /// 查询文本
    pub query: String,
    /// 知识库 ID（空表示全部）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub knowledge_base_id: Option<String>,
    /// 知识类型过滤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub knowledge_types: Vec<KnowledgeType>,
    /// 分类过滤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub categories: Vec<String>,
    /// 标签过滤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    /// 分页
    #[serde(default)]
    pub page: u32,
    #[serde(default = "default_page_size")]
    pub page_size: u32,
    /// 是否启用语义搜索
    #[serde(default = "default_true")]
    pub semantic_search_enabled: bool,
    /// 相似度阈值
    #[serde(default = "default_similarity_threshold")]
    pub similarity_threshold: f32,
}

fn default_page_size() -> u32 { 20 }
fn default_similarity_threshold() -> f32 { 0.5 }

/// 知识检索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeSearchResult {
    /// 查询文本
    pub query: String,
    /// 总结果数
    pub total: u32,
    /// 当前页
    pub page: u32,
    /// 每页大小
    pub page_size: u32,
    /// 结果列表
    pub results: Vec<KnowledgeSearchHit>,
    /// 查询建议
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub query_suggestions: Vec<String>,
    /// 相关分类
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub related_categories: Vec<String>,
    /// 相关标签
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub related_tags: Vec<String>,
}

/// 知识检索命中
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeSearchHit {
    /// 知识条目
    pub entry: KnowledgeEntry,
    /// 相似度得分
    pub similarity_score: f32,
    /// 匹配片段
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub matched_snippets: Vec<String>,
    /// 高亮文本
    #[serde(skip_serializing_if = "Option::is_none")]
    pub highlighted_title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub highlighted_content: Option<String>,
}

/// 专家信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expert {
    /// 用户 ID
    pub user_id: String,
    /// 用户名称
    pub name: String,
    /// 头像 URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    /// 部门
    pub department: String,
    /// 职位
    pub position: String,
    /// 技能标签
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub skills: Vec<Skill>,
    /// 专业领域
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub expertise_areas: Vec<String>,
    /// 经验年限
    pub years_of_experience: f32,
    /// 专家评分（0-5）
    pub expert_rating: f32,
    /// 回答问题数
    pub answered_questions: u32,
    /// 知识贡献数
    pub knowledge_contributions: u32,
    /// 帮助人数
    pub helped_users: u32,
    /// 可联系状态
    pub availability: ExpertAvailability,
    /// 响应时间（小时）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub average_response_time_hours: Option<f32>,
    /// 个人简介
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bio: Option<String>,
}

/// 技能
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    /// 技能名称
    pub name: String,
    /// 熟练程度（0-5）
    pub proficiency: f32,
    /// 经验年限
    pub years_of_experience: f32,
    /// 是否认证
    #[serde(default)]
    pub certified: bool,
}

/// 专家可联系状态
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ExpertAvailability {
    /// 在线
    Online,
    /// 忙碌
    Busy,
    /// 离开
    Away,
    /// 离线
    Offline,
    /// 不可联系
    DoNotDisturb,
}

/// 专家发现请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpertDiscoveryRequest {
    /// 查询文本（技能、问题描述等）
    pub query: String,
    /// 部门过滤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub departments: Vec<String>,
    /// 技能过滤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub required_skills: Vec<String>,
    /// 最小专家评分
    #[serde(default)]
    pub min_expert_rating: f32,
    /// 最多返回数量
    #[serde(default = "default_max_experts")]
    pub max_results: u32,
    /// 是否只返回在线专家
    #[serde(default)]
    pub online_only: bool,
}

fn default_max_experts() -> u32 { 10 }

/// 专家发现结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpertDiscoveryResult {
    /// 查询文本
    pub query: String,
    /// 匹配的专家列表
    pub experts: Vec<ExpertMatch>,
    /// 匹配的技能
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub matched_skills: Vec<String>,
    /// 建议的相关专家
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub related_experts: Vec<Expert>,
}

/// 专家匹配
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpertMatch {
    /// 专家信息
    pub expert: Expert,
    /// 匹配得分
    pub match_score: f32,
    /// 匹配的技能
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub matched_skills: Vec<String>,
    /// 匹配原因
    pub match_reason: String,
}

/// 最佳实践
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BestPractice {
    /// 最佳实践 ID
    pub id: String,
    /// 标题
    pub title: String,
    /// 描述
    pub description: String,
    /// 适用场景
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub applicable_scenarios: Vec<String>,
    /// 步骤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub steps: Vec<PracticeStep>,
    /// 预期效果
    pub expected_outcome: String,
    /// 实际效果数据
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub effectiveness_metrics: HashMap<String, serde_json::Value>,
    /// 相关案例
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub related_cases: Vec<String>,
    /// 作者
    pub author: KnowledgeAuthor,
    /// 评分（0-5）
    pub rating: f32,
    /// 采用次数
    pub adoption_count: u32,
    /// 成功率
    pub success_rate: f32,
    /// 分类
    pub category: String,
    /// 标签
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

/// 实践步骤
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PracticeStep {
    /// 步骤序号
    pub order: u32,
    /// 步骤标题
    pub title: String,
    /// 步骤描述
    pub description: String,
    /// 预计耗时（分钟）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_duration_minutes: Option<u32>,
    /// 所需工具/资源
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub required_resources: Vec<String>,
    /// 注意事项
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub tips: Vec<String>,
}

/// 最佳实践推荐请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BestPracticeRecommendationRequest {
    /// 场景描述
    pub scenario: String,
    /// 业务领域
    #[serde(skip_serializing_if = "Option::is_none")]
    pub business_domain: Option<String>,
    /// 当前遇到的问题
    #[serde(skip_serializing_if = "Option::is_none")]
    pub problem: Option<String>,
    /// 已有资源/约束
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub context: HashMap<String, serde_json::Value>,
    /// 最多推荐数量
    #[serde(default = "default_max_recommendations")]
    pub max_results: u32,
}

fn default_max_recommendations() -> u32 { 5 }

/// 最佳实践推荐结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BestPracticeRecommendationResult {
    /// 场景描述
    pub scenario: String,
    /// 推荐的最佳实践
    pub recommendations: Vec<BestPracticeRecommendation>,
    /// 推荐理由摘要
    pub recommendation_summary: String,
}

/// 最佳实践推荐
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BestPracticeRecommendation {
    /// 最佳实践
    pub best_practice: BestPractice,
    /// 推荐得分
    pub recommendation_score: f32,
    /// 匹配度
    pub match_percentage: f32,
    /// 推荐理由
    pub reason: String,
    /// 适用性评估
    pub applicability_assessment: String,
    /// 预期收益
    pub expected_benefits: Vec<String>,
    /// 实施建议
    #[serde(skip_serializing_if = "Option::is_none")]
    pub implementation_suggestion: Option<String>,
}

/// 知识图谱
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraph {
    /// 图谱 ID
    pub id: String,
    /// 图谱名称
    pub name: String,
    /// 图谱描述
    pub description: String,
    /// 节点列表
    pub nodes: Vec<KnowledgeGraphNode>,
    /// 关系列表
    pub edges: Vec<KnowledgeGraphEdge>,
    /// 节点统计
    pub node_statistics: HashMap<String, u32>,
    /// 关系统计
    pub edge_statistics: HashMap<String, u32>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

/// 知识图谱节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphNode {
    /// 节点 ID
    pub id: String,
    /// 节点标签
    pub label: String,
    /// 节点类型
    pub node_type: String,
    /// 节点属性
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub properties: HashMap<String, serde_json::Value>,
    /// 节点权重（0-1）
    pub weight: f32,
    /// 社区 ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub community_id: Option<String>,
}

/// 知识图谱关系
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphEdge {
    /// 关系 ID
    pub id: String,
    /// 源节点 ID
    pub source_node_id: String,
    /// 目标节点 ID
    pub target_node_id: String,
    /// 关系类型
    pub relation_type: String,
    /// 关系标签
    pub label: String,
    /// 关系权重（0-1）
    pub weight: f32,
    /// 关系属性
    #[serde(skip_serializing_if = "HashMap::is_empty")]
    pub properties: HashMap<String, serde_json::Value>,
}

/// 知识图谱构建请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphConstructionRequest {
    /// 文档 ID 列表
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub document_ids: Vec<String>,
    /// 文档内容列表
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub documents: Vec<String>,
    /// 实体类型过滤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub entity_types: Vec<String>,
    /// 关系类型过滤
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub relation_types: Vec<String>,
    /// 图谱名称
    #[serde(skip_serializing_if = "Option::is_none")]
    pub graph_name: Option<String>,
    /// 是否启用社区检测
    #[serde(default = "default_true")]
    pub community_detection_enabled: bool,
    /// 是否计算节点重要性
    #[serde(default = "default_true")]
    pub node_importance_enabled: bool,
}

/// 知识图谱构建结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeGraphConstructionResult {
    /// 构建的图谱
    pub graph: KnowledgeGraph,
    /// 提取的实体统计
    pub entity_extraction_stats: EntityExtractionStats,
    /// 构建耗时（毫秒）
    pub construction_time_ms: u64,
    /// 处理的文档数
    pub documents_processed: u32,
}

/// 实体提取统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityExtractionStats {
    /// 总实体数
    pub total_entities: u32,
    /// 唯一实体数
    pub unique_entities: u32,
    /// 总关系数
    pub total_relations: u32,
    /// 按类型统计实体数
    pub entities_by_type: HashMap<String, u32>,
    /// 按类型统计关系数
    pub relations_by_type: HashMap<String, u32>,
    /// 平均置信度
    pub average_confidence: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_knowledge_type_serialization() {
        let best_practice = KnowledgeType::BestPractice;
        let json = serde_json::to_string(&best_practice).unwrap();
        assert_eq!(json, "\"best_practice\"");

        let faq = KnowledgeType::FAQ;
        let json = serde_json::to_string(&faq).unwrap();
        assert_eq!(json, "\"faq\"");
    }

    #[test]
    fn test_knowledge_status() {
        let draft = KnowledgeStatus::Draft;
        let published = KnowledgeStatus::Published;
        let archived = KnowledgeStatus::Archived;

        assert_ne!(draft, published);
        assert_ne!(published, archived);
    }

    #[test]
    fn test_expert_availability() {
        let online = ExpertAvailability::Online;
        let busy = ExpertAvailability::Busy;
        let offline = ExpertAvailability::Offline;

        assert_ne!(online, busy);
        assert_ne!(busy, offline);
    }

    #[test]
    fn test_knowledge_visibility() {
        let public = KnowledgeVisibility::Public;
        let private = KnowledgeVisibility::Private;

        assert_ne!(public, private);
    }

    #[test]
    fn test_knowledge_graph_node() {
        let node = KnowledgeGraphNode {
            id: "node-1".to_string(),
            label: "测试节点".to_string(),
            node_type: "concept".to_string(),
            properties: HashMap::new(),
            weight: 0.8,
            community_id: Some("community-1".to_string()),
        };

        assert_eq!(node.id, "node-1");
        assert_eq!(node.weight, 0.8);
    }

    #[test]
    fn test_knowledge_graph_edge() {
        let edge = KnowledgeGraphEdge {
            id: "edge-1".to_string(),
            source_node_id: "node-1".to_string(),
            target_node_id: "node-2".to_string(),
            relation_type: "related_to".to_string(),
            label: "相关".to_string(),
            weight: 0.6,
            properties: HashMap::new(),
        };

        assert_eq!(edge.source_node_id, "node-1");
        assert_eq!(edge.target_node_id, "node-2");
    }
}
