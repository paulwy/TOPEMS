import { useState, useEffect, useRef } from 'react';

// 更新类型定义以匹配新的后端API
interface Document {
  id: string;
  title: string;
  filename: string;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  content_hash: string | null;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'processing' | 'processed' | 'error';
  error_message: string | null;
}

interface SearchResult {
  chunk: {
    id: string;
    document_id: string;
    chunk_index: number;
    content: string;
    embedding: any;
    created_at: string;
    metadata: any;
  };
  document: Document;
  similarity: number;
}

interface ChatResponse {
  answer: string;
  sources: SearchResult[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: SearchResult[];
}

interface ApiResponse<T> {
  code: number;
  success: boolean;
  data: T | null;
  message: string;
  timestamp: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 120000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
};

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetchWithTimeout('/api/v1/documents');
      const data: ApiResponse<Document[]> = await res.json();
      if (data.success && data.data) {
        setDocuments(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('确定要删除这个文档吗？')) return;
    
    try {
      const res = await fetchWithTimeout(`/api/v1/documents/${docId}`, {
        method: 'DELETE',
      });
      const data: ApiResponse<void> = await res.json();
      if (data.success) {
        fetchDocuments();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('删除失败');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const res = await fetchWithTimeout('/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const data: ApiResponse<Document> = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedFile(null);
        fetchDocuments();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
      alert('上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentQuery = query;
    setQuery('');
    setIsTyping(true);

    try {
      const res = await fetchWithTimeout('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery }),
      });
      const data: ApiResponse<ChatResponse> = await res.json();
      if (data.success && data.data) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.data.answer,
          timestamp: new Date(),
          sources: data.data.sources,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      let errorContent = '抱歉，发生了错误，请稍后重试。';
      if (err instanceof Error && err.name === 'AbortError') {
        errorContent = '请求超时，请检查网络连接或稍后重试。';
      }
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: '#fef3c7', color: '#92400e', text: '待处理' },
      processing: { bg: '#dbeafe', color: '#1e40af', text: '处理中' },
      processed: { bg: '#d1fae5', color: '#065f46', text: '已处理' },
      error: { bg: '#fee2e2', color: '#991b1b', text: '处理失败' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 500,
        background: config.bg,
        color: config.color,
      }}>
        {config.text}
      </span>
    );
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      background: '#f8fafc'
    }}>
      {/* 侧边栏 - 知识库 */}
      <div style={{ 
        width: '320px', 
        background: '#fff', 
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #0288D1 0%, #0277BD 100%)',
          color: '#fff'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
            🤖 TOPEMS-AI
          </h2>
          <p style={{ 
            margin: '0.5rem 0 0 0', 
            fontSize: '0.875rem',
            opacity: 0.9
          }}>
            智能知识库
          </p>
        </div>

        <div style={{ 
          padding: '1rem',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'linear-gradient(135deg, #0288D1 0%, #0277BD 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            📄 上传文档
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        {selectedFile && (
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #e2e8f0',
            background: '#f0fdf4',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 500, color: '#166534' }}>
                  📄 {selectedFile.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#4ade80' }}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                }}
              >
                ✕
              </button>
            </div>
            <button
              onClick={handleFileUpload}
              disabled={uploading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: uploading ? '#94a3b8' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {uploading ? '上传中...' : '确认上传'}
            </button>
          </div>
        )}

        <div style={{ 
          padding: '1rem', 
          flex: 1,
          overflowY: 'auto'
        }}>
          <h3 style={{ 
            fontSize: '0.875rem', 
            fontWeight: 600, 
            color: '#475569',
            margin: '0 0 1rem 0'
          }}>
            📚 知识库文档 ({documents.length})
          </h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              加载中...
            </div>
          ) : documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <div>暂无文档，请上传</div>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {documents.map((doc) => (
                <li key={doc.id} style={{ 
                  padding: '1rem', 
                  background: '#f8fafc', 
                  borderRadius: '0.5rem',
                  marginBottom: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid #e2e8f0',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
                onClick={() => {
                  const userMessage: ChatMessage = {
                    role: 'user',
                    content: `请介绍一下 ${doc.title}`,
                    timestamp: new Date(),
                  };
                  setMessages((prev) => [...prev, userMessage]);
                  setQuery(`请介绍一下 ${doc.title}`);
                }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#1e293b', marginBottom: '0.25rem' }}>
                        {doc.title}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#64748b',
                        marginBottom: '0.5rem',
                      }}>
                        {doc.filename}
                      </div>
                      {getStatusBadge(doc.status)}
                      {doc.error_message && (
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>
                          {doc.error_message}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        fontSize: '0.875rem',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#dc2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#94a3b8';
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 主聊天区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 聊天消息区域 */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '2rem'
        }}>
          {messages.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '10vh',
              color: '#64748b'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                💬
              </div>
              <h2 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '0.5rem',
                color: '#1e293b'
              }}>
                你好！我是 TOPEMS 智能助手
              </h2>
              <p style={{ fontSize: '1rem' }}>
                请在下方输入问题，我会根据知识库内容为您解答
              </p>
              
              <div style={{ 
                marginTop: '2rem',
                textAlign: 'left',
                maxWidth: '500px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>
                  快速问题示例：
                </p>
                {[
                  'TOPEMS 是什么？',
                  '化工新材料研发流程是怎样的？',
                  '如何启动 TOPEMS 系统？'
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setQuery(q);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.875rem 1rem',
                      marginBottom: '0.75rem',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: '#0288D1',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f9ff';
                      e.currentTarget.style.borderColor = '#0288D1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: '850px', margin: '0 auto' }}>
              {messages.map((msg, index) => (
                <div key={index} style={{ 
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ 
                    maxWidth: '85%',
                  }}>
                    <div style={{ 
                      padding: '1rem 1.25rem',
                      borderRadius: '0.75rem',
                      background: msg.role === 'user' 
                        ? 'linear-gradient(135deg, #0288D1 0%, #0277BD 100%)' 
                        : '#fff',
                      color: msg.role === 'user' ? '#fff' : '#1e293b',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      marginBottom: msg.sources && msg.sources.length > 0 ? '0.75rem' : 0,
                    }}>
                      <div style={{ 
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.7',
                      }}>
                        {msg.content}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        opacity: 0.7, 
                        marginTop: '0.75rem'
                      }}>
                        {msg.role === 'user' ? '你' : 'AI 助手'} · {
                          msg.timestamp.toLocaleTimeString('zh-CN', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                        }
                      </div>
                    </div>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        padding: '0.75rem',
                      }}>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 600, 
                          color: '#475569', 
                          marginBottom: '0.5rem' 
                        }}>
                          📚 参考来源：
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {msg.sources.slice(0, 3).map((source, i) => (
                            <div key={i} style={{
                              background: '#fff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '0.375rem',
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.75rem',
                              maxWidth: '200px',
                            }}>
                              <div style={{ fontWeight: 500, color: '#0288D1', marginBottom: '0.25rem' }}>
                                {source.document.title}
                              </div>
                              <div style={{ color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {source.chunk.content.substring(0, 100)}...
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'flex-start',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ 
                    padding: '1rem 1.25rem',
                    background: '#fff',
                    borderRadius: '0.75rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <span style={{ 
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#94a3b8',
                      marginRight: '4px',
                      animation: 'typing 1.4s infinite ease-in-out both'
                    }}></span>
                    <span style={{ 
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#94a3b8',
                      marginRight: '4px',
                      animation: 'typing 1.4s infinite ease-in-out both',
                      animationDelay: '0.2s'
                    }}></span>
                    <span style={{ 
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#94a3b8',
                      animation: 'typing 1.4s infinite ease-in-out both',
                      animationDelay: '0.4s'
                    }}></span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div style={{ 
          borderTop: '1px solid #e2e8f0',
          padding: '1.5rem 2rem',
          background: '#fff'
        }}>
          <form onSubmit={handleChat} style={{ 
            display: 'flex', 
            gap: '0.75rem',
            maxWidth: '850px',
            margin: '0 auto'
          }}>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入您的问题..."
              style={{ 
                flex: 1, 
                padding: '1rem 1.25rem', 
                border: '2px solid #e2e8f0', 
                borderRadius: '0.75rem', 
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.2s',
                background: '#f8fafc',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0288D1';
                e.target.style.background = '#fff';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.background = '#f8fafc';
              }}
              disabled={isTyping}
            />
            <button 
              type="submit"
              disabled={isTyping || !query.trim()}
              style={{ 
                background: isTyping || !query.trim() 
                  ? '#94a3b8' 
                  : 'linear-gradient(135deg, #0288D1 0%, #0277BD 100%)', 
                color: '#fff', 
                border: 'none', 
                padding: '1rem 2rem', 
                borderRadius: '0.75rem', 
                cursor: isTyping || !query.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '1rem',
                transition: 'all 0.2s',
              }}
            >
              发送
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default App;
