export type MemoryEntryType = 'user_query' | 'action_result' | 'system_event';
export type Sentiment = 'positive' | 'negative' | 'neutral';
export type Intent =
  'query' | 'command' | 'exploration' | 'confirmation' | 'correction' | 'social' | 'unclear';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ConversationContext {
  messages: ConversationMessage[];
  entities: Entity[];
  topics: string[];
  sentiment: Sentiment;
  intent: Intent;
  summary?: string;
}

export interface Entity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'number' | 'product' | 'action';
  value: string;
  confidence: number;
}

export interface MemoryEntry {
  id: string;
  type: MemoryEntryType;
  content: string;
  timestamp: number;
  importance: number;
  metadata?: Record<string, unknown>;
}

export interface ContextWindow {
  maxMessages: number;
  maxTokens: number;
  summaryThreshold: number;
}

export interface ContextEvent {
  type:
    | 'input_processed'
    | 'context_updated'
    | 'memory_stored'
    | 'memory_retrieved'
    | 'context_summarized'
    | 'entity_extracted'
    | 'intent_detected';
  message: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

type ContextListener = (event: ContextEvent) => void;

const DEFAULT_WINDOW: ContextWindow = {
  maxMessages: 50,
  maxTokens: 4000,
  summaryThreshold: 30,
};

const IMPORTANCE_WEIGHTS = {
  user_query: 1.0,
  action_result: 0.7,
  system_event: 0.4,
};

export class ContextEngine {
  private static instance: ContextEngine;
  private conversations = new Map<string, ConversationContext>();
  private memories = new Map<string, MemoryEntry>();
  private listeners = new Set<ContextListener>();
  private window: ContextWindow;
  private memoryCounter = 0;
  private contextCounter = 0;

  private constructor() {
    this.window = { ...DEFAULT_WINDOW };
  }

  static getInstance(): ContextEngine {
    if (!ContextEngine.instance) {
      ContextEngine.instance = new ContextEngine();
    }
    return ContextEngine.instance;
  }

  on(listener: ContextListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ContextEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  setWindow(window: Partial<ContextWindow>): void {
    this.window = { ...this.window, ...window };
  }

  processInput(
    sessionId: string,
    input: string,
    role: 'user' | 'assistant' | 'system' = 'user'
  ): ConversationContext {
    let context = this.conversations.get(sessionId);

    if (!context) {
      context = this.createContext(sessionId);
      this.conversations.set(sessionId, context);
    }

    const message: ConversationMessage = {
      id: `msg-${Date.now()}-${this.contextCounter++}`,
      role,
      content: input,
      timestamp: Date.now(),
    };

    context.messages.push(message);

    const entities = this.extractEntities(input);
    context.entities = [
      ...context.entities.filter((e) => !entities.some((ne) => ne.name === e.name)),
      ...entities,
    ];

    const intent = this.detectIntent(input);
    context.intent = intent;

    const sentiment = this.analyzeSentiment(input);
    context.sentiment = sentiment;

    const topics = this.extractTopics(input);
    context.topics = this.mergeTopics(context.topics, topics);

    if (context.messages.length > this.window.summaryThreshold) {
      this.summarizeContext(sessionId);
    }

    if (context.messages.length > this.window.maxMessages) {
      this.trimContext(context);
    }

    this.emit({
      type: 'input_processed',
      message: `输入已处理: ${input.slice(0, 50)}...`,
      timestamp: Date.now(),
      details: { intent, sentiment, entities: entities.length },
    });

    return { ...context };
  }

  getContext(sessionId: string): ConversationContext | undefined {
    return this.conversations.get(sessionId);
  }

  summarizeContext(sessionId: string): string {
    const context = this.conversations.get(sessionId);
    if (!context) return '';

    const recentMessages = context.messages.slice(-10);
    const olderMessages = context.messages.slice(0, -10);

    const summaryParts: string[] = [];

    if (olderMessages.length > 0) {
      const userMessages = olderMessages.filter((m) => m.role === 'user');
      const assistantMessages = olderMessages.filter((m) => m.role === 'assistant');

      summaryParts.push(
        `历史对话: ${userMessages.length} 条用户消息, ${assistantMessages.length} 条助手消息`
      );

      if (context.entities.length > 0) {
        summaryParts.push(
          `涉及实体: ${context.entities
            .map((e) => e.value)
            .slice(0, 5)
            .join(', ')}`
        );
      }

      if (context.topics.length > 0) {
        summaryParts.push(`主题: ${context.topics.slice(0, 3).join(', ')}`);
      }
    }

    const summary = summaryParts.join('; ');
    context.summary = summary;

    this.emit({
      type: 'context_summarized',
      message: `上下文已总结: ${summary}`,
      timestamp: Date.now(),
      details: { messageCount: context.messages.length },
    });

    return summary;
  }

  extractEntities(input: string): Entity[] {
    const entities: Entity[] = [];
    const words = input.split(/[\s,，。.!？；;：:、\(\)（）\[\]【】"'""''`~]/);

    const datePatterns = [
      /\d{4}年\d{1,2}月\d{1,2}日/g,
      /\d{4}[-/]\d{1,2}[-/]\d{1,2}/g,
      /\d{1,2}:\d{2}/g,
    ];

    for (const pattern of datePatterns) {
      const matches = input.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            name: match,
            type: 'date',
            value: match,
            confidence: 0.95,
          });
        }
      }
    }

    const numberMatch = input.match(/\d+(\.\d+)?%?/g);
    if (numberMatch) {
      for (const num of numberMatch) {
        entities.push({
          name: num,
          type: 'number',
          value: num,
          confidence: 0.9,
        });
      }
    }

    const actionWords = [
      '创建',
      '删除',
      '更新',
      '查询',
      '生成',
      '发送',
      '获取',
      '执行',
      '运行',
      '启动',
      '停止',
      '导入',
      '导出',
      '下载',
      '创建',
      '提交',
      '审批',
      '批准',
      '拒绝',
      '分配',
      '指派',
      'create',
      'delete',
      'update',
      'query',
      'generate',
      'send',
      'get',
      'execute',
      'run',
      'start',
      'stop',
      'import',
      'export',
      'download',
    ];

    for (const word of actionWords) {
      if (input.includes(word)) {
        entities.push({
          name: word,
          type: 'action',
          value: word,
          confidence: 0.8,
        });
      }
    }

    const productHints = /(?:订单|客户|产品|员工|部门|项目|任务|报告|数据|系统|模块|订单|客户)/;
    const productMatch = input.match(productHints);
    if (productMatch) {
      entities.push({
        name: productMatch[0],
        type: 'product',
        value: productMatch[0],
        confidence: 0.7,
      });
    }

    for (const word of words) {
      if (word.length >= 2 && /^[\u4E00-\u9FFF]+$/.test(word)) {
        const isAlreadyAdded = entities.some((e) => e.value === word);
        if (!isAlreadyAdded) {
          entities.push({
            name: word,
            type: 'organization',
            value: word,
            confidence: 0.4,
          });
        }
      }
    }

    return entities;
  }

  detectIntent(input: string): Intent {
    const lower = input.toLowerCase();

    if (/^(请|帮我|我想|我要|需要|请帮|please|help|can you|i want|i need)/i.test(input)) {
      if (/(创建|生成|发送|执行|运行|create|generate|send|execute|run)/.test(lower)) {
        return 'command';
      }
      return 'command';
    }

    if (
      /^[?？]|(什么是|是什么|如何|怎么|为什么|哪个|哪里|what|how|why|when|where|which)/i.test(input)
    ) {
      return 'query';
    }

    if (/(浏览|探索|查看|看看|browse|explore|look|view|show)/.test(lower)) {
      return 'exploration';
    }

    if (/(对|好的|确认|同意|批准|是|是的|correct|right|yes|ok|confirm|approve)/.test(lower)) {
      return 'confirmation';
    }

    if (/(错|不对|更正|修改|调整|错误|wrong|incorrect|change|modify|update|fix)/.test(lower)) {
      return 'correction';
    }

    if (/(谢谢|感谢|你好|再见|hi|hello|thanks|thank you|bye|goodbye)/.test(lower)) {
      return 'social';
    }

    return 'unclear';
  }

  analyzeSentiment(input: string): Sentiment {
    const positiveWords = [
      '好',
      '棒',
      '优秀',
      '喜欢',
      '满意',
      '赞',
      '完美',
      '谢谢',
      '感谢',
      'good',
      'great',
      'excellent',
      'like',
      'love',
      'happy',
      'perfect',
      'thanks',
    ];

    const negativeWords = [
      '差',
      '不好',
      '糟糕',
      '讨厌',
      '失望',
      '失败',
      '错误',
      '问题',
      'bug',
      'bad',
      'terrible',
      'hate',
      'disappointed',
      'fail',
      'wrong',
      'problem',
      'issue',
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    const lower = input.toLowerCase();

    for (const word of positiveWords) {
      if (lower.includes(word)) positiveScore++;
    }

    for (const word of negativeWords) {
      if (lower.includes(word)) negativeScore++;
    }

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  getMemory(query?: string, limit: number = 20): MemoryEntry[] {
    let entries = Array.from(this.memories.values());

    if (query) {
      const lower = query.toLowerCase();
      entries = entries.filter(
        (e) => e.content.toLowerCase().includes(lower) || e.type.toLowerCase().includes(lower)
      );
    }

    return entries
      .sort((a, b) => b.importance - a.importance || b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  storeMemory(
    type: MemoryEntryType,
    content: string,
    importance?: number,
    metadata?: Record<string, unknown>
  ): MemoryEntry {
    const entry: MemoryEntry = {
      id: `mem-${Date.now()}-${this.memoryCounter++}`,
      type,
      content,
      timestamp: Date.now(),
      importance: importance ?? IMPORTANCE_WEIGHTS[type] ?? 0.5,
      metadata,
    };

    this.memories.set(entry.id, entry);

    this.emit({
      type: 'memory_stored',
      message: `记忆已存储: ${type}`,
      timestamp: Date.now(),
      details: { importance: entry.importance },
    });

    return entry;
  }

  listSessions(): string[] {
    return Array.from(this.conversations.keys());
  }

  deleteSession(sessionId: string): boolean {
    return this.conversations.delete(sessionId);
  }

  clearMemories(): void {
    this.memories.clear();
  }

  getMemoryStats(): {
    total: number;
    byType: Record<MemoryEntryType, number>;
    avgImportance: number;
  } {
    const entries = Array.from(this.memories.values());
    const byType: Record<MemoryEntryType, number> = {
      user_query: 0,
      action_result: 0,
      system_event: 0,
    };

    for (const entry of entries) {
      byType[entry.type]++;
    }

    const avgImportance =
      entries.length > 0 ? entries.reduce((sum, e) => sum + e.importance, 0) / entries.length : 0;

    return { total: entries.length, byType, avgImportance };
  }

  private createContext(_sessionId: string): ConversationContext {
    return {
      messages: [],
      entities: [],
      topics: [],
      sentiment: 'neutral',
      intent: 'unclear',
    };
  }

  private trimContext(context: ConversationContext): void {
    const excess = context.messages.length - this.window.maxMessages;
    const removed = context.messages.splice(0, excess);

    for (const msg of removed) {
      this.storeMemory(msg.role === 'user' ? 'user_query' : 'action_result', msg.content, 0.3);
    }
  }

  private extractTopics(input: string): string[] {
    const topics = new Set<string>();

    const topicKeywords: Record<string, string[]> = {
      技术: ['代码', '编程', 'bug', '错误', 'api', '接口', '函数', 'code', 'function'],
      业务: ['订单', '客户', '销售', '采购', '库存', 'order', 'customer', 'sale'],
      人事: ['员工', '部门', '考勤', '薪资', '请假', 'employee', 'attendance'],
      财务: ['金额', '预算', '成本', '发票', '金额', 'money', 'budget', 'cost'],
      报表: ['报告', '统计', '数据', '分析', 'report', 'data', 'analysis'],
      沟通: ['通知', '消息', '邮件', '会议', 'notify', 'message', 'email', 'meeting'],
    };

    const lower = input.toLowerCase();

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
        topics.add(topic);
      }
    }

    if (topics.size === 0 && input.length > 0) {
      topics.add('general');
    }

    return Array.from(topics);
  }

  private mergeTopics(existing: string[], newTopics: string[]): string[] {
    const merged = new Set([...existing, ...newTopics]);
    return Array.from(merged);
  }
}

export const contextEngine = ContextEngine.getInstance();
