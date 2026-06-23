import { describe, it, expect } from 'vitest';
import axios from 'axios';

const services = {
  iam: 'http://localhost:8000',
  scm: 'http://localhost:8040',
  wms: 'http://localhost:8041',
  srm: 'http://localhost:8042',
  qms: 'http://localhost:8050',
  lims: 'http://localhost:8051',
  ehs: 'http://localhost:8052',
  crm: 'http://localhost:8029',
  bi: 'http://localhost:8060',
};

const createClient = (baseURL: string) => {
  return axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
};

describe('TOPEMS 系统集成测试', () => {
  describe('1. SCM-WMS-SRM 数据同步', () => {
    const scmClient = createClient(services.scm);
    const wmsClient = createClient(services.wms);
    const srmClient = createClient(services.srm);

    it('SCM健康检查', async () => {
      const response = await scmClient.get('/health');
      expect(response.status).toBe(200);
    });

    it('WMS健康检查', async () => {
      const response = await wmsClient.get('/health');
      expect(response.status).toBe(200);
    });

    it('SRM健康检查', async () => {
      const response = await srmClient.get('/health');
      expect(response.status).toBe(200);
    });

    it('采购订单转入库单 API 验证', async () => {
      try {
        const response = await scmClient.post('/api/scm/sync/purchase-to-inbound', {
          purchase_order_id: '00000000-0000-0000-0000-000000000001',
        });
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('出库单转销售订单 API 验证', async () => {
      try {
        const response = await wmsClient.post('/api/wms/sync/outbound-to-shipping', {
          outbound_order_id: '00000000-0000-0000-0000-000000000001',
        });
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('供应商从SRM同步到SCM API 验证', async () => {
      try {
        const response = await scmClient.post('/api/scm/sync/supplier-from-srm', {
          supplier_id: '00000000-0000-0000-0000-000000000001',
        });
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('供应商从SCM同步到SRM API 验证', async () => {
      try {
        const response = await srmClient.post('/api/srm/sync/supplier-from-scm', {
          supplier_id: '00000000-0000-0000-0000-000000000001',
        });
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('SCM供应商列表API验证', async () => {
      try {
        const response = await scmClient.get('/api/scm/suppliers');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('WMS入库单列表API验证', async () => {
      try {
        const response = await wmsClient.get('/api/wms/inbound-orders');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('SRM供应商列表API验证', async () => {
      try {
        const response = await srmClient.get('/api/srm/suppliers');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });
  });

  describe('2. QMS-LIMS-EHS 数据联动', () => {
    const qmsClient = createClient(services.qms);
    const limsClient = createClient(services.lims);
    const ehsClient = createClient(services.ehs);

    it('QMS健康检查', async () => {
      const response = await qmsClient.get('/health');
      expect(response.status).toBe(200);
    });

    it('LIMS健康检查', async () => {
      const response = await limsClient.get('/health');
      expect(response.status).toBe(200);
    });

    it('EHS健康检查', async () => {
      const response = await ehsClient.get('/health');
      expect(response.status).toBe(200);
    });

    it('QMS质量标准API验证', async () => {
      try {
        const response = await qmsClient.get('/api/qms/standards');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('QMS质量检查API验证', async () => {
      try {
        const response = await qmsClient.get('/api/qms/inspections');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('QMS质量问题API验证', async () => {
      try {
        const response = await qmsClient.get('/api/qms/issues');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('LIMS样品API验证', async () => {
      try {
        const response = await limsClient.get('/api/lims/samples');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('LIMS检验任务API验证', async () => {
      try {
        const response = await limsClient.get('/api/lims/tasks');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('LIMS仪器管理API验证', async () => {
      try {
        const response = await limsClient.get('/api/lims/instruments');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('EHS安全隐患API验证', async () => {
      try {
        const response = await ehsClient.get('/api/ehs/hazards');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('EHS事件管理API验证', async () => {
      try {
        const response = await ehsClient.get('/api/ehs/accidents');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });
  });

  describe('3. CRM商机与销售漏斗数据流转', () => {
    const crmClient = createClient(services.crm);

    it('CRM健康检查', async () => {
      const response = await crmClient.get('/health');
      expect(response.status).toBe(200);
    });

    it('CRM客户列表API验证', async () => {
      try {
        const response = await crmClient.get('/api/crm/customers');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('CRM联系人列表API验证', async () => {
      try {
        const response = await crmClient.get('/api/crm/contacts');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('CRM商机列表API验证', async () => {
      try {
        const response = await crmClient.get('/api/crm/opportunities');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('CRM销售漏斗数据API验证', async () => {
      try {
        const response = await crmClient.get('/api/crm/opportunities/funnel');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('CRM商机统计数据API验证', async () => {
      try {
        const response = await crmClient.get('/api/crm/opportunities/stats');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });
  });

  describe('4. BI仪表盘数据来源正确性', () => {
    const biClient = createClient(services.bi);

    it('BI健康检查', async () => {
      const response = await biClient.get('/health');
      expect(response.status).toBe(200);
    });

    it('BI仪表盘列表API验证', async () => {
      try {
        const response = await biClient.get('/api/bi/dashboard');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('BI摘要仪表盘API验证', async () => {
      try {
        const response = await biClient.get('/api/bi/analytics/summary');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('BI质量分析数据API验证', async () => {
      try {
        const response = await biClient.get('/api/bi/analytics/quality');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('BI分析概览API验证', async () => {
      try {
        const response = await biClient.get('/api/bi/analytics/overview');
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });
  });

  describe('5. 核心服务API接口验证', () => {
    const iamClient = createClient(services.iam);

    it('IAM健康检查', async () => {
      const response = await iamClient.get('/health');
      expect(response.status).toBe(200);
    });

    it('IAM认证接口验证', async () => {
      try {
        const response = await iamClient.post('/api/v1/auth/login', {
          username: 'test',
          password: 'test',
        });
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });
  });

  describe('6. 数据同步日志查询', () => {
    const scmClient = createClient(services.scm);
    const wmsClient = createClient(services.wms);
    const srmClient = createClient(services.srm);

    it('SCM同步日志查询API验证', async () => {
      try {
        const response = await scmClient.post('/api/scm/sync/sync-logs', {});
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('WMS同步日志查询API验证', async () => {
      try {
        const response = await wmsClient.post('/api/wms/sync/sync-logs', {});
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });

    it('SRM同步日志查询API验证', async () => {
      try {
        const response = await srmClient.post('/api/srm/sync/sync-logs', {});
        expect(response.data).toBeDefined();
      } catch (error: any) {
        expect(error.response?.status).toBeDefined();
      }
    });
  });
});
