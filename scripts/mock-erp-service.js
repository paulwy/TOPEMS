const http = require('http');
const port = 8009;

// Mock data
let companies = [
  {
    id: '1',
    name: 'Topems Corporation',
    short_name: 'Topems',
    registration_number: '123456789',
    tax_number: '987654321',
    address: 'No.1 Tech Park, Shanghai',
    contact_phone: '021-12345678',
    email: 'contact@topems.com',
    website: 'https://topems.com',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      code: 200,
      success: true,
      data: 'TOPEMS-ERP is running',
      message: '健康检查',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Companies endpoints
  if (req.url === '/api/v1/companies' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      code: 200,
      success: true,
      data: companies,
      message: '获取公司列表成功',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Handle all other endpoints with success response
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  res.end(JSON.stringify({
    code: 200,
    success: true,
    data: [],
    message: 'Success',
    timestamp: new Date().toISOString()
  }));
});

console.log(`Starting mock ERP service on port ${port}...`);
server.listen(port, () => {
  console.log(`Mock ERP service running at http://localhost:${port}`);
});
