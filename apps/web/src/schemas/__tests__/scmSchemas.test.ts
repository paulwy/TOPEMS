import { describe, it, expect } from 'vitest';

import { mrpPlanSchema } from '../scm/mrpPlan';
import { mrpMaterialSummarySchema, mrpSuggestionSchema } from '../scm/mrpSuggestion';
import { purchaseOrderSchema } from '../scm/purchaseOrder';
import { supplierSchema } from '../scm/supplier';
import { purchaseRequisitionSchema } from '../scm/purchaseRequisition';
import { deliveryAppointmentSchema } from '../scm/deliveryAppointment';
import { evaluationSchema } from '../scm/evaluation';
import { incomingInspectionSchema } from '../scm/incomingInspection';
import { incomingNoticeSchema } from '../scm/incomingNotice';
import { inventoryTurnoverSchema } from '../scm/inventoryTurnover';
import { priceComparisonSchema } from '../scm/priceComparison';
import { purchaseContractWizardSchema } from '../scm/purchaseContractWizard';
import { purchaseItemSchema } from '../scm/purchaseItem';
import { supplierAdmissionSchema } from '../scm/supplierAdmission';

/**
 * scm schemas 结构守卫（#22 补测批）
 * 断言各 schema 的 entity/api 接线与关键字段存在性——防 schema 字段改名/接线路由回归。
 * 表驱动：每行 = schema 导出 + 期望 entity + 期望 resource + 期望存在字段。
 */
const SCHEMA_ROWS: Array<{
  name: string;
  schema: {
    entity: string;
    api: { module: string; resource: string };
    fields: Array<{ name: string }>;
  };
  entity: string;
  resource: string;
  fields: string[];
}> = [
  {
    name: 'mrpPlan',
    schema: mrpPlanSchema,
    entity: 'mrpPlan',
    resource: 'mrpPlans',
    fields: ['plan_code', 'plan_name', 'start_date'],
  },
  {
    name: 'mrpSuggestion',
    schema: mrpSuggestionSchema,
    entity: 'mrpSuggestion',
    resource: 'mrpSuggestions',
    fields: ['material_code', 'material_name', 'current_stock'],
  },
  {
    name: 'mrpMaterialSummary',
    schema: mrpMaterialSummarySchema,
    entity: 'mrpMaterialSummary',
    resource: 'mrpMaterialSummary',
    fields: ['material_code', 'shortage', 'suggested_total'],
  },
  {
    name: 'purchaseOrder',
    schema: purchaseOrderSchema,
    entity: 'purchaseOrder',
    resource: 'purchaseOrders',
    fields: ['order_number', 'supplier_id', 'total_amount'],
  },
  {
    name: 'supplier',
    schema: supplierSchema,
    entity: 'supplier',
    resource: 'suppliers',
    fields: ['supplier_no', 'name', 'status'],
  },
  {
    name: 'purchaseRequisition',
    schema: purchaseRequisitionSchema,
    entity: 'purchaseRequisition',
    resource: 'purchaseRequisitions',
    fields: ['req_no', 'title'],
  },
  {
    name: 'deliveryAppointment',
    schema: deliveryAppointmentSchema,
    entity: 'deliveryAppointment',
    resource: 'deliveryAppointments',
    fields: ['appointment_no', 'supplier_id'],
  },
  {
    name: 'evaluation',
    schema: evaluationSchema,
    entity: 'evaluation',
    resource: 'evaluations',
    fields: ['evaluation_no', 'supplier_id'],
  },
  {
    name: 'incomingInspection',
    schema: incomingInspectionSchema,
    entity: 'incomingInspection',
    resource: 'incomingInspections',
    fields: ['inspection_number', 'notice_number'],
  },
  {
    name: 'incomingNotice',
    schema: incomingNoticeSchema,
    entity: 'incomingNotice',
    resource: 'incomingNotices',
    fields: ['notice_number', 'purchase_order_number'],
  },
  {
    name: 'inventoryTurnover',
    schema: inventoryTurnoverSchema,
    entity: 'inventoryTurnover',
    resource: 'inventoryTurnover',
    fields: ['product_code', 'product_name'],
  },
  {
    name: 'priceComparison',
    schema: priceComparisonSchema,
    entity: 'priceComparison',
    resource: 'priceComparisons',
    fields: ['comparison_no', 'title'],
  },
  {
    name: 'purchaseContractWizard',
    schema: purchaseContractWizardSchema,
    entity: 'scmPurchaseContractWizard',
    resource: 'purchaseContractWizards',
    fields: ['contractNo', 'supplier_id'],
  },
  {
    name: 'purchaseItem',
    schema: purchaseItemSchema,
    entity: 'purchaseItem',
    resource: 'purchaseItems',
    fields: ['order_id', 'product_code'],
  },
  {
    name: 'supplierAdmission',
    schema: supplierAdmissionSchema,
    entity: 'supplierAdmission',
    resource: 'supplierAdmissions',
    fields: ['admission_no', 'supplier_name'],
  },
];

describe('schemas/scm 结构守卫（#22 补测批）', () => {
  for (const row of SCHEMA_ROWS) {
    it(`${row.name}Schema：entity/api 接线 + 关键字段`, () => {
      expect(row.schema.entity).toBe(row.entity);
      expect(row.schema.api).toEqual({ module: 'scm', resource: row.resource });
      const names = row.schema.fields.map((f) => f.name);
      for (const field of row.fields) {
        expect(names).toContain(field);
      }
    });
  }
});
