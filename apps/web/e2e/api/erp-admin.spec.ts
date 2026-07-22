import { test, expect } from '@playwright/test';
import { API_URL, TEST_ACCOUNTS, apiLogin, authRequest, ensureTestAccounts } from '../utils/testUtils';

test.beforeAll(async () => {
  await ensureTestAccounts();
});

test.describe('ERP Admin - Meeting Room Management', () => {
  let token: string;
  let createdRoomId: string | null = null;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should list meeting rooms', async () => {
    const response = await authRequest(token, 'GET', '/api/v1/erp/meeting-room/list');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('items');
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test('should create a meeting room', async () => {
    const timestamp = Date.now();
    const roomData = {
      name: `测试会议室 ${timestamp}`,
      location: 'A栋3楼',
      capacity: 10,
      facilities: ['投影仪', '白板', '视频会议'],
      status: 'available',
    };

    const response = await authRequest(token, 'POST', '/api/v1/erp/meeting-room/', roomData);
    expect([200, 201]).toContain(response.status);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    createdRoomId = data.data.id;
  });

  test('should get a single meeting room', async () => {
    if (!createdRoomId) {
      test.skip();
    }

    const response = await authRequest(token, 'GET', `/api/v1/erp/meeting-room/${createdRoomId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id', createdRoomId);
  });

  test('should update a meeting room', async () => {
    if (!createdRoomId) {
      test.skip();
    }

    const updateData = {
      name: '更新后的测试会议室',
      capacity: 15,
    };

    const response = await authRequest(token, 'PUT', `/api/v1/erp/meeting-room/${createdRoomId}`, updateData);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('should delete a meeting room', async () => {
    if (!createdRoomId) {
      test.skip();
    }

    const response = await authRequest(token, 'DELETE', `/api/v1/erp/meeting-room/${createdRoomId}`);
    expect([200, 204]).toContain(response.status);

    const getResponse = await authRequest(token, 'GET', `/api/v1/erp/meeting-room/${createdRoomId}`);
    expect([404, 410]).toContain(getResponse.status);
  });
});

test.describe('ERP Admin - Meeting Room Booking', () => {
  let token: string;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should book a meeting room', async () => {
    const timestamp = Date.now();
    const roomData = {
      name: `预订测试会议室 ${timestamp}`,
      location: 'A栋3楼',
      capacity: 8,
      facilities: ['投影仪'],
      status: 'available',
    };

    const createResponse = await authRequest(token, 'POST', '/api/v1/erp/meeting-room/', roomData);
    if ([200, 201].includes(createResponse.status)) {
      const createData = await createResponse.json();
      const roomId = createData.data.id;

      const bookingData = {
        room_id: roomId,
        title: `测试会议 ${timestamp}`,
        organizer: 'admin',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        attendees: ['user1', 'user2'],
      };

      const response = await authRequest(token, 'POST', '/api/v1/erp/meeting-room/booking', bookingData);
      expect([200, 201]).toContain(response.status);

      const data = await response.json();
      expect(data.success).toBe(true);

      await authRequest(token, 'DELETE', `/api/v1/erp/meeting-room/${roomId}`);
    }
  });
});

test.describe('ERP Admin - Announcement Management', () => {
  let token: string;
  let createdAnnouncementId: string | null = null;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should list announcements', async () => {
    const response = await authRequest(token, 'GET', '/api/v1/erp/announcement/list');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('items');
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test('should create an announcement', async () => {
    const timestamp = Date.now();
    const announcementData = {
      title: `测试公告 ${timestamp}`,
      content: '这是一条自动化测试公告内容',
      type: 'notice',
      priority: 'normal',
      publish_date: new Date().toISOString().split('T')[0],
      status: 'draft',
    };

    const response = await authRequest(token, 'POST', '/api/v1/erp/announcement/', announcementData);
    expect([200, 201]).toContain(response.status);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    createdAnnouncementId = data.data.id;
  });

  test('should get a single announcement', async () => {
    if (!createdAnnouncementId) {
      test.skip();
    }

    const response = await authRequest(token, 'GET', `/api/v1/erp/announcement/${createdAnnouncementId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id', createdAnnouncementId);
  });

  test('should update an announcement', async () => {
    if (!createdAnnouncementId) {
      test.skip();
    }

    const updateData = {
      title: '更新后的测试公告',
      status: 'published',
    };

    const response = await authRequest(token, 'PUT', `/api/v1/erp/announcement/${createdAnnouncementId}`, updateData);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('should delete an announcement', async () => {
    if (!createdAnnouncementId) {
      test.skip();
    }

    const response = await authRequest(token, 'DELETE', `/api/v1/erp/announcement/${createdAnnouncementId}`);
    expect([200, 204]).toContain(response.status);

    const getResponse = await authRequest(token, 'GET', `/api/v1/erp/announcement/${createdAnnouncementId}`);
    expect([404, 410]).toContain(getResponse.status);
  });
});

test.describe('ERP Admin - Vehicle Management', () => {
  let token: string;
  let createdVehicleId: string | null = null;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should list vehicles', async () => {
    const response = await authRequest(token, 'GET', '/api/v1/erp/vehicle/list');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('items');
    expect(Array.isArray(data.data.items)).toBe(true);
  });

  test('should create a vehicle', async () => {
    const timestamp = Date.now();
    const vehicleData = {
      license_plate: `京A${timestamp.toString().slice(-5)}`,
      brand: '测试品牌',
      model: '测试型号',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_price: 200000.00,
      mileage: 0,
      status: 'available',
    };

    const response = await authRequest(token, 'POST', '/api/v1/erp/vehicle/', vehicleData);
    expect([200, 201]).toContain(response.status);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    createdVehicleId = data.data.id;
  });

  test('should get a single vehicle', async () => {
    if (!createdVehicleId) {
      test.skip();
    }

    const response = await authRequest(token, 'GET', `/api/v1/erp/vehicle/${createdVehicleId}`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id', createdVehicleId);
  });

  test('should update a vehicle', async () => {
    if (!createdVehicleId) {
      test.skip();
    }

    const updateData = {
      mileage: 10000,
      status: 'in_use',
    };

    const response = await authRequest(token, 'PUT', `/api/v1/erp/vehicle/${createdVehicleId}`, updateData);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('should delete a vehicle', async () => {
    if (!createdVehicleId) {
      test.skip();
    }

    const response = await authRequest(token, 'DELETE', `/api/v1/erp/vehicle/${createdVehicleId}`);
    expect([200, 204]).toContain(response.status);

    const getResponse = await authRequest(token, 'GET', `/api/v1/erp/vehicle/${createdVehicleId}`);
    expect([404, 410]).toContain(getResponse.status);
  });
});

test.describe('ERP Admin - Vehicle Reservation', () => {
  let token: string;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should reserve a vehicle', async () => {
    const timestamp = Date.now();
    const vehicleData = {
      license_plate: `京B${timestamp.toString().slice(-5)}`,
      brand: '测试品牌',
      model: '测试型号',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_price: 150000.00,
      mileage: 0,
      status: 'available',
    };

    const createResponse = await authRequest(token, 'POST', '/api/v1/erp/vehicle/', vehicleData);
    if ([200, 201].includes(createResponse.status)) {
      const createData = await createResponse.json();
      const vehicleId = createData.data.id;

      const reservationData = {
        vehicle_id: vehicleId,
        driver: '测试司机',
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
        destination: '测试目的地',
        purpose: '公务出行',
      };

      const response = await authRequest(token, 'POST', '/api/v1/erp/vehicle/reservation', reservationData);
      expect([200, 201]).toContain(response.status);

      const data = await response.json();
      expect(data.success).toBe(true);

      await authRequest(token, 'DELETE', `/api/v1/erp/vehicle/${vehicleId}`);
    }
  });
});

test.describe('ERP Admin - Vehicle Maintenance', () => {
  let token: string;

  test.beforeEach(async () => {
    token = await apiLogin(TEST_ACCOUNTS.superadmin.username, TEST_ACCOUNTS.superadmin.password);
  });

  test('should record vehicle maintenance', async () => {
    const timestamp = Date.now();
    const vehicleData = {
      license_plate: `京C${timestamp.toString().slice(-5)}`,
      brand: '测试品牌',
      model: '测试型号',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_price: 180000.00,
      mileage: 5000,
      status: 'available',
    };

    const createResponse = await authRequest(token, 'POST', '/api/v1/erp/vehicle/', vehicleData);
    if ([200, 201].includes(createResponse.status)) {
      const createData = await createResponse.json();
      const vehicleId = createData.data.id;

      const maintenanceData = {
        vehicle_id: vehicleId,
        maintenance_date: new Date().toISOString().split('T')[0],
        type: 'regular',
        mileage_at_maintenance: 5000,
        cost: 500.00,
        description: '常规保养',
      };

      const response = await authRequest(token, 'POST', '/api/v1/erp/vehicle/maintenance', maintenanceData);
      expect([200, 201]).toContain(response.status);

      const data = await response.json();
      expect(data.success).toBe(true);

      await authRequest(token, 'DELETE', `/api/v1/erp/vehicle/${vehicleId}`);
    }
  });
});

test.afterAll(async () => {
  console.log('\n========================================');
  console.log('  ERP Admin Module Tests Completed');
  console.log('========================================');
});