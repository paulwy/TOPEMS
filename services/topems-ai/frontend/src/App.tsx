import { useState, useEffect, useRef } from 'react';
import './index.css';

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

interface ChunkInfo {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  created_at: string;
  metadata: any;
}

interface SearchResult {
  chunk: ChunkInfo;
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
      const res = await fetchWithTimeout(`/api/v1/documents/delete?id=${docId}`, {
        method: 'GET',
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

  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; color: string; text: string }> = {
      pending: { bg: 'bg-yellow-100', color: 'text-yellow-800', text: '待处理' },
      processing: { bg: 'bg-blue-100', color: 'text-blue-800', text: '处理中' },
      processed: { bg: 'bg-green-100', color: 'text-green-800', text: '已处理' },
      error: { bg: 'bg-red-100', color: 'text-red-800', text: '处理失败' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* 侧边栏 - 知识库 */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
          <h2 className="text-xl font-bold">🤖 TOPEMS-AI</h2>
          <p className="text-sm opacity-90 mt-1">智能知识库</p>
        </div>

        <div className="p-4 border-b border-slate-200">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:from-primary-700 hover:to-primary-800 transition-all"
          >
            📄 上传文档
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {selectedFile && (
          <div className="p-4 border-b border-slate-200 bg-green-50">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-medium text-green-800">📄 {selectedFile.name}</div>
                <div className="text-sm text-green-600">{formatFileSize(selectedFile.size)}</div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-red-600 hover:text-red-700 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <button
              onClick={handleFileUpload}
              disabled={uploading}
              className="w-full py-2.5 bg-green-600 text-white rounded-md font-medium disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? '上传中...' : '确认上传'}
            </button>
          </div>
        )}

        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-600 mb-4">📚 知识库文档 ({documents.length})</h3>
          
          {loading ? (
            <div className="text-center py-8 text-slate-400">加载中...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-2">📭</div>
              <div>暂无文档，请上传</div>
            </div>
          ) : (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-300"
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
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 mb-1">{doc.title}</div>
                      <div className="text-xs text-slate-500 mb-2">{doc.filename}</div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        {doc.file_size !== null && (
                          <span className="text-xs text-slate-400">{formatFileSize(doc.file_size)}</span>
                        )}
                      </div>
                      {doc.error_message && (
                        <div className="text-xs text-red-500 mt-2">{doc.error_message}</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.id);
                      }}
                      className="text-slate-400 hover:text-red-500 p-1 transition-colors"
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
      <div className="flex-1 flex flex-col">
        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-y-auto p-8">
          {messages.length === 0 ? (
            <div className="text-center mt-20">
              <div className="text-8xl mb-4">💬</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">你好！我是 TOPEMS 智能助手</h2>
              <p className="text-slate-500 mb-8">请在下方输入问题，我会根据知识库内容为您解答</p>
              
              <div className="max-w-md mx-auto">
                <p className="text-left text-sm font-medium text-slate-600 mb-3">快速问题示例：</p>
                {[
                  'TOPEMS 是什么？',
                  '化工新材料研发流程是怎样的？',
                  '如何启动 TOPEMS 系统？'
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuery(q)}
                    className="w-full text-left px-4 py-3 mb-3 bg-white border border-slate-200 rounded-lg text-primary-600 hover:bg-blue-50 hover:border-primary-500 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[85%]">
                    <div
                      className={`px-4 py-3 rounded-xl shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-tr-sm'
                          : 'bg-white text-slate-800 rounded-tl-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      <div
                        className={`text-xs mt-2 opacity-70 ${
                          msg.role === 'user' ? 'text-white' : 'text-slate-500'
                        }`}
                      >
                        {msg.role === 'user' ? '你' : 'AI 助手'} ·{' '}
                        {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-xs font-semibold text-slate-600 mb-2">📚 参考来源：</div>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.slice(0, 3).map((source, i) => (
                            <div
                              key={i}
                              className="bg-white border border-slate-200 rounded-md px-3 py-2 max-w-xs"
                            >
                              <div className="font-medium text-primary-600 text-sm mb-1">
                                {source.document.title}
                              </div>
                              <div className="text-xs text-slate-500 line-clamp-2">
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
                <div className="flex justify-start mb-6">
                  <div className="px-4 py-3 bg-white rounded-xl shadow-sm rounded-tl-sm">
                    <span className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-typing"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-typing" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-typing" style={{ animationDelay: '0.4s' }}></span>
                    </span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t border-slate-200 p-4 bg-white">
          <form onSubmit={handleChat} className="max-w-4xl mx-auto flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入您的问题..."
              className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-lg outline-none transition-all focus:bg-white focus:border-primary-500"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={isTyping || !query.trim()}
              className={`px-8 py-3 rounded-xl font-semibold text-white transition-all ${
                isTyping || !query.trim()
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800'
              }`}
            >
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
