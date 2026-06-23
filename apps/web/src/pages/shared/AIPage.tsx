import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, TextField, Menu, MenuItem, Tabs, Tab, Box, Typography,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import {
  Bot,
  Send,
  MessageSquare,
  FileText,
  Brain,
  ChevronLeft,
  Plus,
  Search,
  Clock,
  BookOpen,
  Trash2,
  Settings,
  Loader2,
  Sparkles,
  BarChart3,
  FileSearch,
  Copy,
  Check,
  Wand2,
  BarChart2,
  FileStack,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  vs,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { aiApi } from "@/api/ai";
import { apiLogger } from "@/utils/logger";
import { useAppStore } from "../../store";
import AISettingsModal from "@/components/AISettingsModal";
import {
  AIDocumentGenerator,
  DocumentManager,
  AIAnalyzer,
} from "@/components/ai";

import { ModeToggle } from "@/components/ModeToggle";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastMessage: string;
  updatedAt: Date;
  assistantRole?: AssistantRole;
}

type AssistantRole = "general" | "data" | "document" | "code";

interface AssistantRoleConfig {
  id: AssistantRole;
  name: string;
  description: string;
  icon: React.ReactNode;
  systemPrompt: string;
}

const STORAGE_KEY = "topems_ai_conversations";
const CURRENT_CONVO_KEY = "topems_ai_current_conversation";

const ASSISTANT_ROLES: AssistantRoleConfig[] = [
  {
    id: "general",
    name: "通用助手",
    description: "全能型 AI 助手,可处理各种问题",
    icon: <Sparkles size={16} />,
    systemPrompt: "你是 TOPEMS 智能助手。请根据以下知识库内容回答用户的问题。",
  },
  {
    id: "data",
    name: "数据分析助手",
    description: "专注于数据处理、分析和可视化",
    icon: <BarChart3 size={16} />,
    systemPrompt:
      "你是 TOPEMS 数据分析助手。专注于帮助用户分析数据、生成统计报告、解释数据趋势和提供数据可视化建议。",
  },
  {
    id: "document",
    name: "文档助手",
    description: "帮助理解文档、提取信息和总结内容",
    icon: <FileSearch size={16} />,
    systemPrompt:
      "你是 TOPEMS 文档助手。专注于帮助用户理解文档内容、提取关键信息、总结文档要点和回答与文档相关的问题。",
  },
  {
    id: "code",
    name: "编程助手",
    description: "提供代码审查、调试和最佳实践建议",
    icon: <FileText size={16} />,
    systemPrompt:
      "你是 TOPEMS 编程助手。专注于帮助用户编写、审查和调试代码,提供编程最佳实践建议,并解释技术概念。",
  },
];

const AIPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<
    "chat" | "documents" | "analysis" | "manage"
  >("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [showDocuments, setShowDocuments] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentRole, setCurrentRole] = useState<AssistantRole>("general");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showDocumentGenerator, setShowDocumentGenerator] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 从本地存储加载对话历史
  useEffect(() => {
    const savedConversations = localStorage.getItem(STORAGE_KEY);
    const savedCurrentConvo = localStorage.getItem(CURRENT_CONVO_KEY);

    if (savedConversations) {
      const parsedConversations: Conversation[] = JSON.parse(
        savedConversations,
      ).map((conv: any) => ({
        ...conv,
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
      setConversations(parsedConversations);

      if (
        savedCurrentConvo &&
        parsedConversations.some((conv) => conv.id === savedCurrentConvo)
      ) {
        setCurrentConversationId(savedCurrentConvo);
        const currentConv = parsedConversations.find(
          (conv) => conv.id === savedCurrentConvo,
        );
        if (currentConv) {
          setMessages(currentConv.messages);
          if (currentConv.assistantRole) {
            setCurrentRole(currentConv.assistantRole);
          }
        }
      } else if (parsedConversations.length > 0) {
        const latestConv = parsedConversations[0];
        setCurrentConversationId(latestConv.id);
        setMessages(latestConv.messages);
        if (latestConv.assistantRole) {
          setCurrentRole(latestConv.assistantRole);
        }
      } else {
        createNewConversation();
      }
    } else {
      createNewConversation();
    }

    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 保存对话到本地存储
  const saveConversations = useCallback(
    (updatedConversations: Conversation[]) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConversations));
      setConversations(updatedConversations);
    },
    [],
  );

  // 保存当前对话 ID
  const saveCurrentConversation = useCallback(
    (conversationId: string | null) => {
      if (conversationId) {
        localStorage.setItem(CURRENT_CONVO_KEY, conversationId);
      } else {
        localStorage.removeItem(CURRENT_CONVO_KEY);
      }
      setCurrentConversationId(conversationId);
    },
    [],
  );

  // 创建新对话
  const createNewConversation = useCallback(() => {
    const id = Date.now().toString();
    const welcomeMessage: Message = {
      id: "welcome",
      role: "assistant",
      content: `你好!我是 TOPEMS ${ASSISTANT_ROLES.find((r) => r.id === currentRole)?.name},基于本地知识库为您提供服务。请告诉我有什么可以帮助您的?`,
      timestamp: new Date(),
    };

    const newConversation: Conversation = {
      id,
      title: "新对话",
      messages: [welcomeMessage],
      lastMessage: "新对话已创建",
      updatedAt: new Date(),
      assistantRole: currentRole,
    };

    const updatedConversations = [newConversation, ...conversations];
    saveConversations(updatedConversations);
    saveCurrentConversation(id);
    setMessages([welcomeMessage]);
    setInputText("");
  }, [currentRole, conversations, saveConversations, saveCurrentConversation]);

  const loadDocuments = async () => {
    try {
      const response = await aiApi.listDocuments();
      if (response.success && response.data) {
        const docs =
          "items" in response.data ? response.data.items : response.data;
        setDocuments(docs);
      }
    } catch (err) {
      apiLogger.error("加载文档列表失败:", err);
      addNotification({
        title: "加载失败",
        message: "加载文档列表失败",
        type: "error",
      });
    }
  };

  const handleNewConversation = () => {
    createNewConversation();
  };

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      saveCurrentConversation(conversationId);
      setMessages(conversation.messages);
      if (conversation.assistantRole) {
        setCurrentRole(conversation.assistantRole);
      }
    }
  };

  const handleToggleDocuments = () => {
    setShowDocuments(!showDocuments);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const filteredMessages = messages.filter((msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      if (filteredMessages.length > 0) {
        addNotification({
          title: "搜索结果",
          message: `找到 ${filteredMessages.length} 条匹配结果`,
          type: "success",
        });
      } else {
        addNotification({
          title: "搜索结果",
          message: "未找到匹配结果",
          type: "info",
        });
      }
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    if (confirm("确定要删除这个对话吗?")) {
      const updatedConversations = conversations.filter(
        (c) => c.id !== conversationId,
      );
      saveConversations(updatedConversations);

      if (currentConversationId === conversationId) {
        if (updatedConversations.length > 0) {
          handleSelectConversation(updatedConversations[0].id);
        } else {
          createNewConversation();
        }
      }
    }
  };

  // 切换助手角色
  const handleRoleChange = (role: AssistantRole) => {
    setCurrentRole(role);
    // 更新当前对话的角色
    if (currentConversationId) {
      const updatedConversations = conversations.map((conv) =>
        conv.id === currentConversationId
          ? { ...conv, assistantRole: role }
          : conv,
      );
      saveConversations(updatedConversations);
    }
  };

  // 复制代码
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      addNotification({
        title: "已复制",
        message: "代码已复制到剪贴板",
        type: "success",
      });
    } catch (err) {
      addNotification({
        title: "复制失败",
        message: "无法复制代码",
        type: "error",
      });
    }
  };

  // Markdown 渲染组件
  const MarkdownRenderer = ({
    content,
    isDark,
  }: {
    content: string;
    isDark: boolean;
  }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const codeContent = String(children).replace(/\n$/, "");

            if (!inline && match) {
              return (
                <Box sx={{ position: "relative" }}>
                  <Button
                    onClick={() => handleCopyCode(codeContent)}
                    sx={{
                      position: "absolute",
                      right: 1,
                      top: 1,
                      p: 0.5,
                      borderRadius: 1,
                      bgcolor: "grey.700",
                      color: "grey.300",
                      "&:hover": { bgcolor: "grey.600" },
                      opacity: 0,
                      transition: "opacity 0.2s",
                      ".group:hover &": { opacity: 1 },
                    }}
                    title="复制代码"
                  >
                    {copiedCode === codeContent ? (
                      <Check size={16} color="#4ade80" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </Button>
                  <SyntaxHighlighter
                    style={isDark ? vscDarkPlus : vs}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                    {...props}
                  >
                    {codeContent}
                  </SyntaxHighlighter>
                </Box>
              );
            } else {
              return (
                <code
                  className={className}
                  style={{
                    padding: "0.125rem 0.375rem",
                    borderRadius: "0.25rem",
                    fontSize: "0.875rem",
                    backgroundColor: isDark ? "#374151" : "#f3f4f6",
                    color: isDark ? "#f9a8d4" : "#db2777",
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
          },
          // 其他 Markdown 元素的样式
          h1: ({ ...props }) => (
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 700, mb: 2, mt: 3 }}
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <Typography
              variant="h5"
              component="h2"
              sx={{ fontWeight: 600, mb: 1.5, mt: 2.5 }}
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <Typography
              variant="h6"
              component="h3"
              sx={{ fontWeight: 600, mb: 1, mt: 2 }}
              {...props}
            />
          ),
          p: ({ ...props }) => (
            <Typography
              component="p"
              sx={{ mb: 1.5, lineHeight: 1.625 }}
              {...props}
            />
          ),
          ul: ({ ...props }) => (
            <Box
              component="ul"
              sx={{ pl: 3, mb: 1.5, listStyleType: "disc" }}
              {...props}
            />
          ),
          ol: ({ ...props }) => (
            <Box
              component="ol"
              sx={{ pl: 3, mb: 1.5, listStyleType: "decimal" }}
              {...props}
            />
          ),
          li: ({ ...props }) => (
            <Box component="li" sx={{ mb: 0.5 }} {...props} />
          ),
          blockquote: ({ ...props }) => (
            <Box
              component="blockquote"
              sx={{
                borderLeft: 4,
                borderColor: "divider",
                pl: 2,
                py: 0.5,
                my: 1.5,
                bgcolor: "grey.50",
              }}
              {...props}
            />
          ),
          a: ({ ...props }) => (
            <a
              style={{ color: "#2563eb", textDecoration: "none" }}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          table: ({ ...props }) => (
            <Box sx={{ overflowX: "auto", my: 1.5 }}>
              <table
                style={{
                  minWidth: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid #d1d5db",
                }}
                {...props}
              />
            </Box>
          ),
          thead: ({ ...props }) => (
            <thead style={{ backgroundColor: "#f3f4f6" }} {...props} />
          ),
          th: ({ ...props }) => (
            <th
              style={{
                border: "1px solid #d1d5db",
                padding: "0.5rem 1rem",
                textAlign: "left",
                fontWeight: 600,
              }}
              {...props}
            />
          ),
          td: ({ ...props }) => (
            <td
              style={{
                border: "1px solid #d1d5db",
                padding: "0.5rem 1rem",
              }}
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  const handleSettings = () => {
    setShowSettings(true);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setIsTyping(true);
    setLoading(true);

    try {
      const response = await aiApi.chat({ query: userMessage.content });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.success
          ? (response.data?.answer ?? "抱歉,处理您的请求时出现了问题。")
          : "抱歉,处理您的请求时出现了问题。",
        timestamp: new Date(),
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);

      // 更新或创建对话
      if (currentConversationId) {
        const updatedConversations = conversations.map((conv) => {
          if (conv.id === currentConversationId) {
            // 自动生成标题(使用第一条用户消息或前30个字符)
            const firstUserMessage = finalMessages.find(
              (m) => m.role === "user",
            );
            const title = firstUserMessage
              ? firstUserMessage.content.substring(0, 30) +
                (firstUserMessage.content.length > 30 ? "..." : "")
              : conv.title;

            return {
              ...conv,
              messages: finalMessages,
              title,
              lastMessage:
                assistantMessage.content.substring(0, 50) +
                (assistantMessage.content.length > 50 ? "..." : ""),
              updatedAt: new Date(),
            };
          }
          return conv;
        });
        saveConversations(updatedConversations);
      }

      addNotification({
        title: "回复完成",
        message: "AI已收到回复",
        type: "success",
      });
    } catch (err) {
      apiLogger.error("AI 问答失败:", err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "抱歉,连接 AI 服务时出现了问题,请稍后重试。",
        timestamp: new Date(),
      };

      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);

      if (currentConversationId) {
        const updatedConversations = conversations.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: finalMessages, updatedAt: new Date() }
            : conv,
        );
        saveConversations(updatedConversations);
      }

      addNotification({
        title: "AI服务错误",
        message: "连接AI服务失败",
        type: "error",
      });
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDocumentGenerated = (content: string) => {
    addNotification({
      title: "文档生成成功",
      message: "文档已成功生成",
      type: "success",
    });
    setShowDocumentGenerator(false);
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "grey.50" }}>
      <Box
        sx={{
          width: 288,
          bgcolor: "background.paper",
          borderRight: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              AI 智能助手
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft size={20} />
              </Button>
              <ModeToggle />
            </Box>
          </Box>
          <Tabs
            value={activeTab}
            onChange={(_, v) =>
              setActiveTab(v as "chat" | "documents" | "analysis" | "manage")
            }
            sx={{ width: "100%", mb: 2, display: "flex" }}
          >
            <Tab
              value="chat"
              icon={<MessageSquare size={16} />}
              iconPosition="start"
              label="AI 聊天"
              sx={{ flex: 1, minHeight: 48, fontSize: "0.75rem" }}
            />
            <Tab
              value="documents"
              icon={<Wand2 size={16} />}
              iconPosition="start"
              label="文档生成"
              sx={{ flex: 1, minHeight: 48, fontSize: "0.75rem" }}
            />
            <Tab
              value="analysis"
              icon={<BarChart2 size={16} />}
              iconPosition="start"
              label="文本分析"
              sx={{ flex: 1, minHeight: 48, fontSize: "0.75rem" }}
            />
            <Tab
              value="manage"
              icon={<FileStack size={16} />}
              iconPosition="start"
              label="文档管理"
              sx={{ flex: 1, minHeight: 48, fontSize: "0.75rem" }}
            />
          </Tabs>
          {activeTab === "chat" && (
            <Button onClick={handleNewConversation} sx={{ width: "100%" }}>
              <Plus size={16} style={{ marginRight: 8 }} />
              新对话
            </Button>
          )}
        </Box>

        {activeTab === "chat" && (
          <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Button
              variant="text"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ width: "100%", justifyContent: "flex-start" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {ASSISTANT_ROLES.find((r) => r.id === currentRole)?.icon}
                <Typography variant="body2">
                  {ASSISTANT_ROLES.find((r) => r.id === currentRole)?.name}
                </Typography>
              </Box>
            </Button>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              {ASSISTANT_ROLES.map((role) => (
                <MenuItem
                  key={role.id}
                  onClick={() => {
                    handleRoleChange(role.id);
                    setMenuAnchor(null);
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {role.icon}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {role.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "grey.500" }}>
                        {role.description}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}

        {activeTab === "chat" && (
          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "grey.500", mb: 1.5 }}
            >
              最近对话
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {conversations.map((conv) => (
                <Box
                  key={conv.id}
                  sx={{
                    "& .conv-delete-btn": { opacity: 0 },
                    "&:hover .conv-delete-btn": { opacity: 1 },
                  }}
                >
                  <Box
                    onClick={() => handleSelectConversation(conv.id)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                      "&:hover": { bgcolor: "grey.100" },
                      ...(currentConversationId === conv.id
                        ? {
                            bgcolor: "purple.50",
                            border: 1,
                            borderColor: "purple.200",
                          }
                        : {}),
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1.5,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          {conv.assistantRole &&
                            ASSISTANT_ROLES.find(
                              (r) => r.id === conv.assistantRole,
                            )?.icon}
                          {!conv.assistantRole && (
                            <MessageSquare
                              size={20}
                              color={
                                currentConversationId === conv.id
                                  ? "#a855f7"
                                  : "#9ca3af"
                              }
                            />
                          )}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color:
                                currentConversationId === conv.id
                                  ? "purple.700"
                                  : "text.primary",
                            }}
                          >
                            {conv.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "grey.500",
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {conv.lastMessage}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="text"
                        size="small"
                        className="conv-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        sx={{
                          color: "error.main",
                          "&:hover": {
                            bgcolor: "error.light",
                          },
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "grey.400",
                        mt: 0.5,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Clock size={12} style={{ marginRight: 4 }} />
                      {formatTime(conv.updatedAt)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {activeTab === "documents" && (
          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "grey.500", mb: 1.5 }}
            >
              快速开始
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Card
                sx={{
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                  "&:hover": { bgcolor: "purple.50" },
                }}
                onClick={() => setShowDocumentGenerator(true)}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ p: 1, bgcolor: "purple.100", borderRadius: 2 }}>
                      <Wand2 size={20} color="#9333ea" />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        新建文档
                      </Typography>
                      <Typography variant="caption" sx={{ color: "grey.500" }}>
                        选择模板,AI 自动生成
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}

        <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {activeTab === "chat" && (
              <Button
                variant="text"
                onClick={handleToggleDocuments}
                sx={{ width: "100%", justifyContent: "flex-start" }}
              >
                <BookOpen size={16} style={{ marginRight: 12 }} />
                文档库 ({documents.length})
              </Button>
            )}
            <Button
              variant="text"
              onClick={handleSettings}
              sx={{ width: "100%", justifyContent: "flex-start" }}
            >
              <Settings size={16} style={{ marginRight: 12 }} />
              设置
            </Button>
          </Box>
          {showDocuments && activeTab === "chat" && (
            <Box
              sx={{
                mt: 1,
                p: 1.5,
                bgcolor: "grey.100",
                borderRadius: 2,
                maxHeight: 160,
                overflowY: "auto",
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "grey.500", mb: 1, display: "block" }}
              >
                知识库文档列表:
              </Typography>
              {documents.map((doc) => (
                <Box
                  key={doc.id}
                  sx={{
                    fontSize: "0.875rem",
                    color: "grey.700",
                    py: 0.5,
                    cursor: "pointer",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    "&:hover": { color: "purple.600" },
                  }}
                >
                  • {doc.title}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeTab === "chat" && (
          <>
            <Box
              component="header"
              sx={{
                bgcolor: "background.paper",
                borderBottom: 1,
                borderColor: "divider",
                p: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      background:
                        "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Brain size={24} color="white" />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      TOPEMS{" "}
                      {ASSISTANT_ROLES.find((r) => r.id === currentRole)?.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "success.main" }}>
                      在线
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <TextField
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="搜索对话..."
                    size="small"
                    sx={{ width: 200 }}
                  />
                  <Button variant="text" size="small" onClick={handleSearch}>
                    <Search size={16} />
                  </Button>
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: 3,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: "flex",
                    justifyContent:
                      message.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <Box sx={{ maxWidth: 768, width: "100%" }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.5,
                        flexDirection:
                          message.role === "user" ? "row-reverse" : "row",
                      }}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: "common.white",
                          ...(message.role === "user"
                            ? { bgcolor: "primary.main" }
                            : {
                                background:
                                  "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
                              }),
                        }}
                      >
                        {message.role === "user" ? (
                          <Typography
                            variant="body2"
                            sx={{ color: "common.white" }}
                          >
                            U
                          </Typography>
                        ) : (
                          <Bot size={20} />
                        )}
                      </Box>
                      <Box
                        sx={{
                          borderRadius: 2,
                          p: 2,
                          maxWidth: 672,
                          ...(message.role === "user"
                            ? { bgcolor: "primary.main", color: "common.white" }
                            : {
                                bgcolor: "background.paper",
                                boxShadow: 1,
                              }),
                        }}
                      >
                        {message.role === "user" ? (
                          <Typography
                            sx={{
                              color: "common.white",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {message.content}
                          </Typography>
                        ) : (
                          <MarkdownRenderer
                            content={message.content}
                            isDark={false}
                          />
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            mt: 1,
                            display: "block",
                            color:
                              message.role === "user"
                                ? "rgba(255,255,255,0.8)"
                                : "grey.500",
                          }}
                        >
                          {formatTime(message.timestamp)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}

              {isTyping && (
                <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                  <Box
                    sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        background:
                          "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Bot size={20} color="white" />
                    </Box>
                    <Box
                      sx={{
                        bgcolor: "background.paper",
                        borderRadius: 2,
                        px: 2,
                        py: 1.5,
                        boxShadow: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          display: "inline-flex",
                          animation: "spin 1s linear infinite",
                          "@keyframes spin": {
                            "0%": { transform: "rotate(0deg)" },
                            "100%": { transform: "rotate(360deg)" },
                          },
                        }}
                      >
                        <Loader2 size={16} color="#a855f7" />
                      </Box>
                      <Typography variant="body2" sx={{ color: "grey.600" }}>
                        正在思考...
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Box
              sx={{
                p: 2,
                bgcolor: "background.paper",
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <Box sx={{ maxWidth: 896, mx: "auto" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    bgcolor: "grey.100",
                    borderRadius: 3,
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <Button variant="text" size="small">
                    <Plus size={20} />
                  </Button>
                  <Button variant="text" size="small">
                    <FileText size={20} />
                  </Button>
                  <TextField
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleSend()
                    }
                    placeholder="输入你的问题..."
                    sx={{
                      flex: 1,
                      "& .MuiInputBase-input": {
                        background: "transparent",
                        border: "none",
                      },
                    }}
                    size="small"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputText.trim() || isTyping}
                  >
                    {loading ? (
                      <Box
                        sx={{
                          display: "inline-flex",
                          mr: 1,
                          animation: "spin 1s linear infinite",
                          "@keyframes spin": {
                            "0%": { transform: "rotate(0deg)" },
                            "100%": { transform: "rotate(360deg)" },
                          },
                        }}
                      >
                        <Loader2 size={20} />
                      </Box>
                    ) : (
                      <Send size={20} style={{ marginRight: 8 }} />
                    )}
                    发送
                  </Button>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: "grey.500",
                    textAlign: "center",
                    mt: 1,
                    display: "block",
                  }}
                >
                  AI 基于知识库回答,建议仅作参考
                </Typography>
              </Box>
            </Box>
          </>
        )}

        {activeTab === "documents" && (
          <Box sx={{ flex: 1, p: 3 }}>
            <Card sx={{ height: "100%" }}>
              <CardHeader>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ p: 1, bgcolor: "purple.100", borderRadius: 2 }}>
                      <Wand2 size={24} color="#9333ea" />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        AI 文档生成
                      </Typography>
                      <Typography variant="body2" sx={{ color: "grey.500" }}>
                        选择模板,填写信息,AI 帮你生成专业文档
                      </Typography>
                    </Box>
                  </Box>
                  <Button onClick={() => setShowDocumentGenerator(true)}>
                    <Plus size={16} style={{ marginRight: 8 }} />
                    开始创建
                  </Button>
                </Box>
              </CardHeader>
              <CardContent>
                <Box sx={{ textAlign: "center", py: 6, color: "grey.500" }}>
                  <Wand2
                    size={64}
                    color="#9ca3af"
                    style={{ margin: "0 auto 16px", opacity: 0.5 }}
                  />
                  <Typography>点击"开始创建"选择模板并生成文档</Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === "analysis" && (
          <Box sx={{ flex: 1, p: 3 }}>
            <Card sx={{ height: "100%" }}>
              <CardHeader>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{ p: 1, bgcolor: "blue.100", borderRadius: 2 }}>
                    <BarChart2 size={24} color="#2563eb" />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      AI 文本分析
                    </Typography>
                    <Typography variant="body2" sx={{ color: "grey.500" }}>
                      对文本进行情感分析、分类、实体提取和关键词提取
                    </Typography>
                  </Box>
                </Box>
              </CardHeader>
              <CardContent>
                <AIAnalyzer
                  isOpen={true}
                  onClose={() => setShowAnalyzer(false)}
                  onAnalysisComplete={(results) => {
                    addNotification({
                      title: "分析完成",
                      message: "文本分析已完成",
                      type: "success",
                    });
                  }}
                />
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === "manage" && (
          <Box sx={{ flex: 1, p: 3, overflow: "auto" }}>
            <DocumentManager />
          </Box>
        )}
      </Box>

      <AISettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <AIDocumentGenerator
        isOpen={showDocumentGenerator}
        onClose={() => setShowDocumentGenerator(false)}
        onDocumentGenerated={handleDocumentGenerated}
      />
      <AIAnalyzer
        isOpen={showAnalyzer}
        onClose={() => setShowAnalyzer(false)}
        onAnalysisComplete={(results) => {
          addNotification({
            title: "分析完成",
            message: "文本分析已完成",
            type: "success",
          });
        }}
      />
    </Box>
  );
};

export default AIPage;
