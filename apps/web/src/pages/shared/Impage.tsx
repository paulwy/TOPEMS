import React from 'react';
import { ChatInterface } from '@/components/im/ChatInterface';
import { ChatPageTemplate } from '@/components/templates';

/**
 * IM 即时通讯页面 - ChatPageTemplate 迁移
 *
 * 使用 ChatPageTemplate 的 children 模式包裹 ChatInterface 组件。
 * ChatInterface 内部已包含完整的聊天布局（会话列表 + 消息区 + 输入区），
 * 因此采用 children 透传模式，由模板统一提供 PageContainer 外壳和高度容器。
 */
const IMPage: React.FC = () => {
  return (
    <ChatPageTemplate>
      <ChatInterface />
    </ChatPageTemplate>
  );
};

export default IMPage;
