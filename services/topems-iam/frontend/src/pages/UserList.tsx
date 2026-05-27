import { useState, useEffect } from 'react';
import { userApi, type User } from '../api';

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const data = await userApi.list();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>用户列表</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>用户名</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>邮箱</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>姓名</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>状态</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>创建时间</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.username}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.email}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.name}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.status}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                {new Date(user.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}