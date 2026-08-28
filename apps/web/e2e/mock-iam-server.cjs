/**
 * Mock IAM 服务器
 *
 * 提供端到端测试所需的 IAM 登录端点，返回 mock token。
 * 运行在端口 8000，与 testUtils.ts 中的 API_URL 一致。
 */

const http = require('http');

const PORT = 8000;

// Mock 用户数据库
const USERS = {
  admin: { password: 'admin123', role: 'superadmin' },
  admin_admin: { password: 'admin123', role: 'admin' },
  hr_admin: { password: 'admin123', role: 'hr_admin' },
  employee: { password: 'admin123', role: 'employee' },
};

// 生成 mock JWT token
function generateMockToken(username, role) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: username,
    role,
    tenant_id: 'test-tenant',
    user_id: `user_${username}`,
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 小时过期
    iat: Math.floor(Date.now() / 1000),
  })).toString('base64url');
  const signature = 'mock-signature-for-testing';
  return `${header}.${payload}.${signature}`;
}

// 解析请求体
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 登录端点
  if (req.method === 'POST' && req.url === '/api/core/iam/auth/login') {
    try {
      const body = await parseBody(req);
      const { username, password } = body;

      const user = USERS[username];
      if (!user || user.password !== password) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 401, message: '用户名或密码错误', data: null }));
        return;
      }

      const token = generateMockToken(username, user.role);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 0,
        message: '登录成功',
        data: {
          access_token: token,
          token,
          user: {
            id: `user_${username}`,
            username,
            role: user.role,
            tenant_id: 'test-tenant',
          },
        },
      }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 400, message: '请求格式错误', data: null }));
    }
    return;
  }

  // 健康检查端点
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'mock-iam' }));
    return;
  }

  // 默认 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ code: 404, message: '端点不存在', data: null }));
});

server.listen(PORT, () => {
  console.log(`Mock IAM 服务器运行在 http://localhost:${PORT}`);
  console.log(`登录端点: POST http://localhost:${PORT}/api/core/iam/auth/login`);
  console.log(`测试账号: admin/admin123, admin_admin/admin123, hr_admin/admin123, employee/admin123`);
});
