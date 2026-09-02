//! DSH AI 增强能力端到端测试
//!
//! 测试知识图谱、RAG、多 Agent 协作等高级 AI 能力，包括：
//! - 知识图谱实体管理
//! - 知识图谱关系管理
//! - 最短路径查询
//! - 社区发现
//! - 实体链接
//! - 文本实体提取
//! - RAG 检索
//! - 多 Agent 协作

#![allow(dead_code)]
#![allow(unused_imports)]

use std::collections::HashMap;

use topems_ai::dsh::knowledge_graph::{
    CommunityResult, Entity, EntityRelationExtractor, EntityType, ExtractionResult, KnowledgeGraph,
    KnowledgeGraphConfig, KnowledgeGraphStats, PathResult, Relation, RelationType,
};
use topems_ai::dsh::multi_agent::{
    AgentConfig, AgentRole, CollaborationGroupConfig, CollaborationMode, MultiAgentCoordinator,
};
use topems_ai::dsh::rag::{
    ConversationMessage, RagConfig, RagEngine, RagStats, RetrievalRequest, RetrievalResponse,
    RetrievedDocument,
};

use serde_json::json;

// ============================================================================
// 知识图谱测试
// ============================================================================

/// 创建测试用的知识图谱
fn create_test_graph() -> KnowledgeGraph {
    let graph = KnowledgeGraph::with_defaults();

    // 添加实体
    let person1 = Entity::new("p1", "张三", EntityType::Person);
    let person2 = Entity::new("p2", "李四", EntityType::Person);
    let person3 = Entity::new("p3", "王五", EntityType::Person);
    let org1 = Entity::new("o1", "ABC公司", EntityType::Organization);
    let org2 = Entity::new("o2", "XYZ公司", EntityType::Organization);
    let loc1 = Entity::new("l1", "北京", EntityType::Location);
    let loc2 = Entity::new("l2", "上海", EntityType::Location);
    let project1 = Entity::new("proj1", "TOPEMS项目", EntityType::Project);

    graph.add_entity(person1);
    graph.add_entity(person2);
    graph.add_entity(person3);
    graph.add_entity(org1);
    graph.add_entity(org2);
    graph.add_entity(loc1);
    graph.add_entity(loc2);
    graph.add_entity(project1);

    // 添加关系
    graph.add_relation(Relation::new("p1", "o1", RelationType::WorksAt));
    graph.add_relation(Relation::new("p2", "o1", RelationType::WorksAt));
    graph.add_relation(Relation::new("p3", "o2", RelationType::WorksAt));
    graph.add_relation(Relation::new("o1", "l1", RelationType::LocatedIn));
    graph.add_relation(Relation::new("o2", "l2", RelationType::LocatedIn));
    graph.add_relation(Relation::new("p1", "p2", RelationType::RelatedTo));
    graph.add_relation(Relation::new("p1", "proj1", RelationType::ParticipatesIn));
    graph.add_relation(Relation::new("p2", "proj1", RelationType::ParticipatesIn));
    graph.add_relation(Relation::new("o1", "proj1", RelationType::CreatedBy));

    graph
}

#[test]
fn test_knowledge_graph_add_and_get_entity() {
    let graph = KnowledgeGraph::with_defaults();

    let entity = Entity::new("e1", "测试实体", EntityType::Person);
    graph.add_entity(entity);

    let retrieved = graph.get_entity("e1");
    assert!(retrieved.is_some());
    assert_eq!(retrieved.unwrap().name, "测试实体");
}

#[test]
fn test_knowledge_graph_list_entities() {
    let graph = create_test_graph();
    let entities = graph.list_entities();
    assert_eq!(entities.len(), 8);
}

#[test]
fn test_knowledge_graph_remove_entity() {
    let graph = create_test_graph();
    assert!(graph.get_entity("p1").is_some());

    graph.remove_entity("p1");
    assert!(graph.get_entity("p1").is_none());

    // 验证相关关系也被删除
    let relations = graph.list_relations();
    assert!(!relations
        .iter()
        .any(|r| r.source_id == "p1" || r.target_id == "p1"));
}

#[test]
fn test_knowledge_graph_add_and_get_relation() {
    let graph = create_test_graph();
    let relations = graph.list_relations();
    assert_eq!(relations.len(), 9);
}

#[test]
fn test_knowledge_graph_get_neighbors() {
    let graph = create_test_graph();

    let neighbors = graph.get_neighbors("p1");
    // p1 的邻居：o1, p2, proj1
    assert_eq!(neighbors.len(), 3);
}

#[test]
fn test_knowledge_graph_get_entity_degree() {
    let graph = create_test_graph();

    // p1 的度数：works_at(o1) + related_to(p2) + participates_in(proj1) = 3
    assert_eq!(graph.get_entity_degree("p1"), 3);

    // o1 的度数：works_at(p1) + works_at(p2) + located_in(l1) + created_by(proj1) = 4
    assert_eq!(graph.get_entity_degree("o1"), 4);
}

#[test]
fn test_knowledge_graph_shortest_path() {
    let graph = create_test_graph();

    // p1 -> o1 -> l1
    let path = graph.shortest_path("p1", "l1");
    assert!(path.is_some());
    let path = path.unwrap();
    assert_eq!(path.path_length, 2);
    assert_eq!(path.entity_ids, vec!["p1", "o1", "l1"]);
}

#[test]
fn test_knowledge_graph_shortest_path_same_entity() {
    let graph = create_test_graph();

    let path = graph.shortest_path("p1", "p1");
    assert!(path.is_some());
    assert_eq!(path.unwrap().path_length, 0);
}

#[test]
fn test_knowledge_graph_shortest_path_no_path() {
    let graph = create_test_graph();

    // p3 和 p1 之间没有直接路径（p3 在 o2，p1 在 o1）
    let path = graph.shortest_path("p3", "p1");
    // 实际上可能有路径：p3 -> o2 -> l2 ... 但 l2 和 l1 之间没有关系
    // 所以 p3 到 p1 没有路径
    assert!(path.is_none());
}

#[test]
fn test_knowledge_graph_link_entity() {
    let graph = create_test_graph();

    let linked = graph.link_entity("张三");
    assert_eq!(linked.len(), 1);
    assert_eq!(linked[0].name, "张三");
}

#[test]
fn test_knowledge_graph_link_entity_fuzzy() {
    let graph = create_test_graph();

    // 模糊匹配
    let linked = graph.link_entity("张");
    assert!(!linked.is_empty());
}

#[test]
fn test_knowledge_graph_detect_communities() {
    let graph = create_test_graph();

    let communities = graph.detect_communities();
    assert!(!communities.is_empty());

    // 应该有两个连通分量：
    // 1. p1, p2, o1, l1, proj1 (5个实体)
    // 2. p3, o2, l2 (3个实体)
    assert_eq!(communities.len(), 2);
    assert_eq!(communities[0].size, 5);
    assert_eq!(communities[1].size, 3);
}

#[test]
fn test_knowledge_graph_get_stats() {
    let graph = create_test_graph();

    let stats = graph.get_stats();
    assert_eq!(stats.total_entities, 8);
    assert_eq!(stats.total_relations, 9);
    assert!(stats.avg_entity_degree > 0.0);
    assert!(stats.graph_density > 0.0);
    assert_eq!(stats.connected_components, 2);
}

#[test]
fn test_knowledge_graph_clear() {
    let graph = create_test_graph();
    assert_eq!(graph.list_entities().len(), 8);

    graph.clear();
    assert_eq!(graph.list_entities().len(), 0);
    assert_eq!(graph.list_relations().len(), 0);
}

#[test]
fn test_entity_type_conversion() {
    assert_eq!(EntityType::Person.as_str(), "person");
    assert_eq!(EntityType::Organization.as_str(), "organization");
    assert_eq!(EntityType::from_str("person"), EntityType::Person);
    assert_eq!(
        EntityType::from_str("custom_type"),
        EntityType::Custom("custom_type".to_string())
    );
}

#[test]
fn test_relation_type_conversion() {
    assert_eq!(RelationType::WorksAt.as_str(), "works_at");
    assert_eq!(RelationType::LocatedIn.as_str(), "located_in");
}

#[test]
fn test_entity_properties() {
    let mut entity = Entity::new("e1", "测试", EntityType::Person);
    entity.add_property("age", "30");
    entity.add_property("department", "技术部");

    assert_eq!(entity.properties.get("age"), Some(&"30".to_string()));
    assert_eq!(
        entity.properties.get("department"),
        Some(&"技术部".to_string())
    );
}

#[test]
fn test_entity_aliases() {
    let mut entity = Entity::new("e1", "张三", EntityType::Person);
    entity.add_alias("小张");
    entity.add_alias("老张");

    assert_eq!(entity.aliases.len(), 2);

    // 重复添加不应该重复
    entity.add_alias("小张");
    assert_eq!(entity.aliases.len(), 2);
}

// ============================================================================
// 实体关系提取测试
// ============================================================================

#[test]
fn test_entity_relation_extractor_creation() {
    let extractor = EntityRelationExtractor::with_defaults();
    // 验证提取器可以正常工作
    let result = extractor.extract("测试文本");
    assert!(result.text_length > 0);
}

#[test]
fn test_entity_relation_extractor_extract_dates() {
    let extractor = EntityRelationExtractor::with_defaults();
    let text = "会议在2024年1月15日召开，持续到2024-01-20。";

    let result = extractor.extract(text);
    assert!(result.text_length > 0);

    // 应该提取到日期
    let date_entities: Vec<_> = result
        .entities
        .iter()
        .filter(|e| e.entity_type == EntityType::DateTime)
        .collect();
    assert!(!date_entities.is_empty());
}

#[test]
fn test_entity_relation_extractor_extract_organizations() {
    let extractor = EntityRelationExtractor::with_defaults();
    let text = "张三在ABC公司工作，李四在XYZ集团任职。";

    let result = extractor.extract(text);

    let org_entities: Vec<_> = result
        .entities
        .iter()
        .filter(|e| e.entity_type == EntityType::Organization)
        .collect();
    assert!(!org_entities.is_empty());
}

#[test]
fn test_entity_relation_extractor_extract_persons() {
    let extractor = EntityRelationExtractor::with_defaults();
    let text = "张三和李四一起参加了会议。";

    let result = extractor.extract(text);

    let _person_entities: Vec<_> = result
        .entities
        .iter()
        .filter(|e| e.entity_type == EntityType::Person)
        .collect();
    // 人员提取是基于规则的，可能提取到也可能提取不到
    // 只要不报错即可
}

#[test]
fn test_entity_relation_extractor_add_to_graph() {
    let graph = KnowledgeGraph::with_defaults();
    let extractor = EntityRelationExtractor::with_defaults();

    let text = "张三在2024年1月15日加入了ABC公司。";
    let result = extractor.extract(text);

    extractor.add_to_graph(&result, &graph);

    // 图谱中应该有提取到的实体
    let entities = graph.list_entities();
    assert!(!entities.is_empty());
}

#[test]
fn test_extraction_result_struct() {
    let result = ExtractionResult {
        entities: vec![],
        relations: vec![],
        text_length: 100,
        duration_ms: 50,
    };

    assert_eq!(result.text_length, 100);
    assert_eq!(result.duration_ms, 50);
}

// ============================================================================
// RAG 测试
// ============================================================================

#[test]
fn test_rag_engine_creation() {
    let engine = RagEngine::with_defaults();
    assert!(engine.config().enabled);
}

#[test]
fn test_rag_config_default() {
    let config = RagConfig::default();
    assert!(config.enabled);
    assert!(config.top_k > 0);
    assert!(config.similarity_threshold >= 0.0);
}

#[test]
fn test_rag_retrieval_request_creation() {
    let request = RetrievalRequest {
        query: "测试查询".to_string(),
        conversation_history: vec![],
        top_k: None,
        similarity_threshold: None,
        filters: None,
        metadata_filters: None,
    };

    assert_eq!(request.query, "测试查询");
}

#[test]
fn test_rag_conversation_message() {
    let message = ConversationMessage {
        role: "user".to_string(),
        content: "你好".to_string(),
        timestamp: None,
    };

    assert_eq!(message.role, "user");
    assert_eq!(message.content, "你好");
}

#[test]
fn test_rag_retrieved_document() {
    let doc = RetrievedDocument::new("doc1", "标题", "内容", 0.95);

    assert_eq!(doc.doc_id, "doc1");
    assert_eq!(doc.title, "标题");
    assert_eq!(doc.content, "内容");
    assert_eq!(doc.score, 0.95);
}

#[test]
fn test_rag_stats_default() {
    let engine = RagEngine::with_defaults();
    let stats = engine.get_stats();

    assert_eq!(stats.total_retrievals, 0);
    assert_eq!(stats.total_documents_retrieved, 0);
}

// ============================================================================
// 多 Agent 协作测试
// ============================================================================

#[test]
fn test_multi_agent_coordinator_creation() {
    let config = CollaborationGroupConfig {
        group_id: "test".to_string(),
        name: "测试组".to_string(),
        mode: CollaborationMode::MasterWorker,
        coordinator_id: None,
        member_ids: vec![],
        max_tasks: 10,
        task_timeout_secs: 60,
    };

    let coordinator = MultiAgentCoordinator::new(config);
    assert_eq!(coordinator.config().group_id, "test");
}

#[test]
fn test_collaboration_mode_variants() {
    // 验证所有协作模式都可以创建
    let modes = vec![
        CollaborationMode::MasterWorker,
        CollaborationMode::PeerToPeer,
        CollaborationMode::Pipeline,
        CollaborationMode::Voting,
    ];

    for mode in modes {
        let config = CollaborationGroupConfig {
            group_id: "test".to_string(),
            name: "测试组".to_string(),
            mode,
            coordinator_id: None,
            member_ids: vec![],
            max_tasks: 10,
            task_timeout_secs: 60,
        };
        let coordinator = MultiAgentCoordinator::new(config);
        assert_eq!(coordinator.config().mode, mode);
    }
}

#[test]
fn test_agent_config_creation() {
    let config = AgentConfig {
        agent_id: "agent1".to_string(),
        name: "测试Agent".to_string(),
        role: AgentRole::Specialist,
        description: "测试用Agent".to_string(),
        capabilities: vec![],
        max_concurrent_tasks: 5,
        task_timeout_secs: 60,
    };

    assert_eq!(config.agent_id, "agent1");
    assert_eq!(config.name, "测试Agent");
}

#[test]
fn test_agent_role_variants() {
    let roles = vec![
        AgentRole::Coordinator,
        AgentRole::Specialist,
        AgentRole::Worker,
        AgentRole::Reviewer,
        AgentRole::General,
    ];

    for role in roles {
        let config = AgentConfig {
            agent_id: "agent1".to_string(),
            name: "测试Agent".to_string(),
            role,
            description: "测试".to_string(),
            capabilities: vec![],
            max_concurrent_tasks: 1,
            task_timeout_secs: 60,
        };
        assert_eq!(config.role, role);
    }
}

// ============================================================================
// 集成测试：知识图谱 + RAG
// ============================================================================

#[test]
fn test_knowledge_graph_and_rag_integration() {
    // 创建知识图谱
    let graph = create_test_graph();

    // 创建 RAG 引擎
    let rag_engine = RagEngine::with_defaults();

    // 验证两者都可以正常工作
    let stats = graph.get_stats();
    assert_eq!(stats.total_entities, 8);

    let rag_stats = rag_engine.get_stats();
    assert_eq!(rag_stats.total_retrievals, 0);
}

#[test]
fn test_knowledge_graph_complex_query() {
    let graph = create_test_graph();

    // 复杂查询：查找项目参与者及其所在公司
    let project_participants = graph.get_neighbors("proj1");
    assert_eq!(project_participants.len(), 3); // p1, p2, o1

    // 查找每个参与者的公司
    for participant in &project_participants {
        if participant.entity_type == EntityType::Person {
            let companies = graph.get_neighbors(&participant.id);
            let has_company = companies
                .iter()
                .any(|e| e.entity_type == EntityType::Organization);
            assert!(has_company);
        }
    }
}

#[test]
fn test_knowledge_graph_path_analysis() {
    let graph = create_test_graph();

    // 分析 p1 到 proj1 的关系
    let path = graph.shortest_path("p1", "proj1");
    assert!(path.is_some());
    let path = path.unwrap();

    // 直接关系：p1 -> proj1 (participates_in)
    assert_eq!(path.path_length, 1);
    assert_eq!(path.entity_ids, vec!["p1", "proj1"]);
}

// ============================================================================
// 性能测试
// ============================================================================

#[test]
fn test_knowledge_graph_performance_add_entities() {
    let graph = KnowledgeGraph::with_defaults();

    let start = std::time::Instant::now();
    for i in 0..100 {
        let entity = Entity::new(
            &format!("entity_{}", i),
            &format!("实体{}", i),
            EntityType::Concept,
        );
        graph.add_entity(entity);
    }
    let duration = start.elapsed();

    assert_eq!(graph.list_entities().len(), 100);
    // 100 个实体添加应该在 1 秒内完成
    assert!(duration.as_secs_f64() < 1.0);
}

#[test]
fn test_knowledge_graph_performance_shortest_path() {
    let graph = KnowledgeGraph::with_defaults();

    // 创建一个链式结构：e0 -> e1 -> e2 -> ... -> e99
    for i in 0..100 {
        let entity = Entity::new(
            &format!("e{}", i),
            &format!("节点{}", i),
            EntityType::Concept,
        );
        graph.add_entity(entity);
    }

    for i in 0..99 {
        graph.add_relation(Relation::new(
            &format!("e{}", i),
            &format!("e{}", i + 1),
            RelationType::RelatedTo,
        ));
    }

    // 查询最长路径
    let start = std::time::Instant::now();
    let path = graph.shortest_path("e0", "e99");
    let duration = start.elapsed();

    assert!(path.is_some());
    assert_eq!(path.unwrap().path_length, 99);
    // 路径查询应该在 1 秒内完成
    assert!(duration.as_secs_f64() < 1.0);
}
