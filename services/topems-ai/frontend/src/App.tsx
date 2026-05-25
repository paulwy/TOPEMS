import { useState, useEffect, useRef } from 'react';

interface Document {
  id: string;
  title: string;
  content: string;
  created_at: string;
  filename: string;
  path: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDocuments();
    checkApiStatus();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkApiStatus = async () => {
    try {
      // 直接设置为 true，因为我们已经配置了 Ollama
      setApiConfigured(true);
    } catch (err) {
      console.error('Failed to check API status:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/v1/documents');
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReloadDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/documents/reload', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data);
        alert(data.message);
      }
    } catch (err) {
      console.error('Failed to reload documents:', err);
    } finally {
      setLoading(false);
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
      
      const res = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
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
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery }),
      });
      const data = await res.json();
      if (data.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.data.answer,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '抱歉，发生了错误，请稍后重试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
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
        width: '300px', 
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

        <div style={{ padding: '1rem' }}>
          {apiConfigured === false && (
            <div style={{ 
              background: '#fffbeb', 
              border: '1px solid #fcd34d', 
              borderRadius: '0.5rem', 
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.8125rem'
            }}>
              <p style={{ margin: 0, color: '#92400e' }}>
                ⚠️  当前使用模拟 AI
              </p>
              <p style={{ margin: '0.5rem 0 0 0', color: '#b45309' }}>
                请配置 <code>OPENAI_API_KEY</code> 启用真实 AI
              </p>
            </div>
          )}
          {apiConfigured === true && (
            <div style={{ 
              background: '#f0fdf4', 
              border: '1px solid #86efac', 
              borderRadius: '0.5rem', 
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.8125rem'
            }}>
              <p style={{ margin: 0, color: '#166534' }}>
                ✅ 使用真实 AI 服务
              </p>
            </div>
          )}
        </div>

        <div style={{ 
          padding: '0 1rem', 
          flex: 1,
          overflowY: 'auto'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: 600, 
              color: '#475569',
              margin: '0 0 0.75rem 0'
            }}>
              📚 知识库文档
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  background: '#0288D1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500
                }}
              >
                📄 上传文档
              </button>
              <button
                onClick={handleReloadDocuments}
                disabled={loading}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: '#64748b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500
                }}
              >
                🔄 刷新
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
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '0.375rem',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.75rem',
                fontSize: '0.8125rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#166534' }}>📄 {selectedFile.name}</span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
                <button
                  onClick={handleFileUpload}
                  disabled={uploading}
                  style={{
                    marginTop: '0.5rem',
                    width: '100%',
                    padding: '0.5rem',
                    background: uploading ? '#94a3b8' : '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontSize: '0.8125rem'
                  }}
                >
                  {uploading ? '上传中...' : '上传'}
                </button>
              </div>
            )}
          </div>
          
          {loading ? (
            <p style={{ color: '#94a3b8' }}>加载中...</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {documents.map((doc) => (
                <li key={doc.id} style={{ 
                  padding: '0.75rem', 
                  background: '#f8fafc', 
                  borderRadius: '0.375rem',
                  marginBottom: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
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
                  <div style={{ fontWeight: 500, color: '#1e293b' }}>
                    {doc.title}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#64748b',
                    marginTop: '0.25rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {doc.content}
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
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: '#0288D1'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {messages.map((msg, index) => (
                <div key={index} style={{ 
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ 
                    maxWidth: '80%',
                    padding: '1rem 1.25rem',
                    borderRadius: '0.75rem',
                    background: msg.role === 'user' 
                      ? 'linear-gradient(135deg, #0288D1 0%, #0277BD 100%)' 
                      : '#fff',
                    color: msg.role === 'user' ? '#fff' : '#1e293b',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ 
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.6'
                    }}>
                      {msg.content}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      opacity: 0.7, 
                      marginTop: '0.5rem'
                    }}>
                      {msg.role === 'user' ? '你' : 'AI 助手'} · {
                        msg.timestamp.toLocaleTimeString('zh-CN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })
                      }
                    </div>
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
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
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
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入您的问题..."
              style={{ 
                flex: 1, 
                padding: '0.875rem 1.25rem', 
                border: '1px solid #e2e8f0', 
                borderRadius: '0.75rem', 
                fontSize: '1rem',
                outline: 'none',
                transition: 'border 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0288D1'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
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
                padding: '0.875rem 2rem', 
                borderRadius: '0.75rem', 
                cursor: isTyping || !query.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '1rem'
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
