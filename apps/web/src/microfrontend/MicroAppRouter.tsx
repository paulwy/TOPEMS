import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RemoteLoader } from './RemoteLoader';
import { getEnabledModules } from './config';

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
export const MicroAppRouter: React.FC<{ userPermissions: string[] }> = ({ userPermissions }) => {
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
              fallback={<div>加载 {module.displayName}...</div>}
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
