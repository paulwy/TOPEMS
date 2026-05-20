import { useState, useEffect } from 'react';

interface FileItem {
  id: string;
  name: string;
  created_at: string;
}

function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/v1/files');
      const data = await res.json();
      if (data.success) {
        setFiles(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#1E88E5', marginBottom: '1rem' }}>
        📁 TOPEMS-DOC 文档管理
      </h1>
      
      <div style={{ background: '#f5f7fa', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
        <p style={{ margin: '0.25rem 0' }}><strong>服务状态：</strong> <span style={{ color: '#4CAF50' }}>✅ 运行中</span></p>
        <p style={{ margin: '0.25rem 0' }}><strong>数据库：</strong> PostgreSQL</p>
        <p style={{ margin: '0.25rem 0' }}><strong>缓存：</strong> Redis</p>
      </div>

      <h2 style={{ color: '#333', marginTop: '1.5rem' }}>文件列表</h2>
      {loading ? (
        <p>加载中...</p>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          {files.length === 0 ? (
            <p>暂无文件</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {files.map((file) => (
                <li key={file.id} style={{ 
                  background: '#fff', 
                  padding: '0.75rem', 
                  borderBottom: '1px solid #eee',
                  borderRadius: '0.25rem',
                  marginBottom: '0.5rem'
                }}>
                  📄 {file.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
