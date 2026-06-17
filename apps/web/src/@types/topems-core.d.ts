declare module 'topems_core/pages/UserManagement' {
  const UserManagement: React.ComponentType;
  export default UserManagement;
}

declare module 'topems_core/pages/RoleManagement' {
  const RoleManagement: React.ComponentType;
  export default RoleManagement;
}

declare module 'topems_core/pages/OrgChart' {
  const OrgChart: React.ComponentType;
  export default OrgChart;
}

declare module 'topems_core/api/auth' {
  export * from './auth';
}

declare module 'topems_core/api/org' {
  export * from './org';
}

declare module 'topems_core/api/workflow' {
  export * from './workflow';
}

declare module 'topems_core/api' {
  export * from './api';
}

declare module 'topems_core/components/UserSelect' {
  const UserSelect: React.ComponentType;
  export default UserSelect;
}

declare module 'topems_core/components/OrgTree' {
  const OrgTree: React.ComponentType;
  export default OrgTree;
}

declare module 'topems_core/components' {
  export * from './components';
}

declare module 'topems_core/hooks/useAuth' {
  export * from './useAuth';
}

declare module 'topems_core/hooks/usePermission' {
  export * from './usePermission';
}

declare module 'topems_core/hooks' {
  export * from './hooks';
}

declare module 'topems_core/store/authStore' {
  export * from './authStore';
}

declare module 'topems_core/store/orgStore' {
  export * from './orgStore';
}

declare module 'topems_core/store' {
  export * from './store';
}

declare module 'topems_core/pages' {
  export * from './pages';
}

declare module 'topems_core/App' {
  const App: React.ComponentType;
  export default App;
}