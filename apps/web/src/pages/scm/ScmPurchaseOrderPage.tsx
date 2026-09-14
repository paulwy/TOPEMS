import React from 'react';
import PurchaseOrderPage from '../erp/PurchaseOrderPage';

/**
 * 供应链采购订单页面
 *
 * 复用 ERP 采购订单页面的 UI 结构，
 * 后续可根据供应链模块的特定需求进行扩展。
 */
const ScmPurchaseOrderPage: React.FC = () => {
  return <PurchaseOrderPage />;
};

export default ScmPurchaseOrderPage;
