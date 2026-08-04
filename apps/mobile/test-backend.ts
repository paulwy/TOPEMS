import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/mobile';
const AUTH_URL = 'http://localhost:8000/api/core/iam/auth';

let accessToken = '';

async function login() {
  const response = await axios.post(`${AUTH_URL}/login`, {
    username: 'admin',
    password: 'admin123',
  });
  return response.data.data.access_token;
}

async function testBackendConnection() {
  console.log('========================================');
  console.log('测试移动端与后端连接');
  console.log('========================================');
  console.log(`API 地址: ${BASE_URL}`);
  console.log('');

  try {
    console.log('1. 测试健康检查...');
    const healthResponse = await axios.get('http://localhost:8000/health');
    console.log('   ✅ 健康检查通过:', healthResponse.data.status);
  } catch (error) {
    console.log('   ❌ 健康检查失败:', error);
    return;
  }

  try {
    console.log('');
    console.log('2. 测试登录...');
    accessToken = await login();
    console.log('   ✅ 登录成功! Token: ' + accessToken.substring(0, 20) + '...');
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    console.log('   ❌ 登录失败:', err.response?.data?.message || err.message);
    return;
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  try {
    console.log('');
    console.log('3. 测试审批 API...');
    const approvalResponse = await axios.get(`${BASE_URL}/approval/tasks`, {
      headers: authHeaders,
    });
    console.log('   ✅ 审批 API 响应:', approvalResponse.data.success);
    console.log('   数据:', JSON.stringify(approvalResponse.data.data));
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    console.log('   ⚠️ 审批 API:', err.response?.data?.message || err.message);
  }

  try {
    console.log('');
    console.log('4. 测试考勤 API...');
    const attendanceResponse = await axios.get(`${BASE_URL}/attendance/stats`, {
      headers: authHeaders,
    });
    console.log('   ✅ 考勤 API 响应:', attendanceResponse.data.success);
    console.log('   数据:', JSON.stringify(attendanceResponse.data.data));
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    console.log('   ⚠️ 考勤 API:', err.response?.data?.message || err.message);
  }

  try {
    console.log('');
    console.log('5. 测试任务 API...');
    const taskResponse = await axios.get(`${BASE_URL}/task/list`, { headers: authHeaders });
    console.log('   ✅ 任务 API 响应:', taskResponse.data.success);
    console.log('   数据:', JSON.stringify(taskResponse.data.data));
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    console.log('   ⚠️ 任务 API:', err.response?.data?.message || err.message);
  }

  try {
    console.log('');
    console.log('6. 测试仪表盘 API...');
    const dashboardResponse = await axios.get(`${BASE_URL}/dashboard/stats`, {
      headers: authHeaders,
    });
    console.log('   ✅ 仪表盘 API 响应:', dashboardResponse.data.success);
    console.log('   数据:', JSON.stringify(dashboardResponse.data.data));
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    console.log('   ⚠️ 仪表盘 API:', err.response?.data?.message || err.message);
  }

  try {
    console.log('');
    console.log('7. 测试扫描 API...');
    const scanResponse = await axios.get(`${BASE_URL}/scan/items`, { headers: authHeaders });
    console.log('   ✅ 扫描 API 响应:', scanResponse.data.success);
    console.log('   数据:', JSON.stringify(scanResponse.data.data));
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    console.log('   ⚠️ 扫描 API:', err.response?.data?.message || err.message);
  }

  console.log('');
  console.log('========================================');
  console.log('测试完成');
  console.log('========================================');
}

testBackendConnection();
