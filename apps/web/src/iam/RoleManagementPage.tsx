// V66.7 P2-1 双实现说明：
// - 本文件是 src/iam/ 目录的旧实现（由 App 根路由 /iam 访问，保留向后兼容）
// - 新的主实现位于 pages/iam/ 目录（由 Admin 控制台 /admin/iam 路由统一调度）
// - 如非必要，请优先修改 pages/iam/ 中的新页面版本
import React from 'react';
import i18n from '@/i18n';

const RoleManagementPage: React.FC = () => {
  return React.createElement(
    'div',
    { className: 'page-placeholder' },
    i18n.t('iam.role_management_page.k0')
  );
};

export default RoleManagementPage;
