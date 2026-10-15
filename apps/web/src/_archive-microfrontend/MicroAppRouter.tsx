import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RemoteLoader } from './RemoteLoader';
// D4 归档说明：config.ts 仍保留在 src/microfrontend/（被 version-manager/canary-release 引用），
// 故用 @/microfrontend 别名指向原位。
import { getEnabledModules } from '@/microfrontend/config';
import i18n from '@/i18n';

/**
 * 微前端路由组件
 *
 * 根据用户权限动态生成路由，每个业务域对应一个 remote。
 *
 * 路由模式：
 * - /core/*  → topems_core (eager)
 * - /erp/*   → topems_erp (lazy)
 * - /hrm/*   → topems_hrm (lazy)
 * - ...
 */
const MicroAppRouter: React.FC<{ userPermissions: string[] }> = ({ userPermissions }) => {
  const enabledModules = getEnabledModules(userPermissions);

  return (
    <Routes>
      {enabledModules.map((module) => (
        <Route
          key={module.name}
          path={`${module.routePrefix}/*`}
          element={
            <RemoteLoader
              moduleName={module.name}
              component='./App'
              fallback={<div>{i18n.t('microfrontend.micro_app_router.k0')}</div>}
            />
          }
        />
      ))}
      {/* 默认重定向到核心 */}
      <Route
        path='/'
        element={
          <Navigate
            to='/core'
            replace
          />
        }
      />
      <Route
        path='*'
        element={
          <Navigate
            to='/core'
            replace
          />
        }
      />
    </Routes>
  );
};

export default MicroAppRouter;
