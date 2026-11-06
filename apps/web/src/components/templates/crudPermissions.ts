/**
 * CrudPage 写权限码解析（批 16）
 *
 * 独立成文件而非内联在 CrudPage.tsx：全站测试的 setup 对 CrudPage 模块做了整模块 mock，
 * 内联的同学在测试里取不到；拆分后纯函数可直接单测，也不引入 MUI/react-query 依赖。
 */

export interface CrudPermissionInput {
  /** schema 声明的资源前缀，如 'scm:purchase_order' */
  permissionResource?: string;
  writePermission?: string;
  createPermission?: string;
  editPermission?: string;
  deletePermission?: string;
}

export interface CrudPermissionCodes {
  create?: string;
  edit?: string;
  delete?: string;
}

/**
 * 解析 CrudPage 的三个写入口权限码。
 *
 * 优先级：显式细粒度 props > schema.permissionResource 展开 > writePermission 总闸。
 * 三者都没有时返回空对象，调用方据此跳过过滤（存量行为不变）。
 */
export function resolveCrudPermissionCodes(input: CrudPermissionInput): CrudPermissionCodes {
  const prefix = input.permissionResource;
  return {
    create: input.createPermission ?? (prefix ? `${prefix}:create` : input.writePermission),
    edit: input.editPermission ?? (prefix ? `${prefix}:update` : input.writePermission),
    delete: input.deletePermission ?? (prefix ? `${prefix}:delete` : input.writePermission),
  };
}
