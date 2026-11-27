/**
 * 把前端表单值里的 camelCase 键转换成后端（Rust/serde）使用的 snake_case 键。
 *
 * 背景：schema 里的字段名是给 UI 用的（contractNo / employeeId …），但各业务服务
 * 的请求 DTO 都是 snake_case，直接提交 camelCase 会被 axum 的 serde 反序列化拒绝
 * （422 missing field `contract_no`），表现为"新建填完点确定报错/存不进去"。
 *
 * 规则：
 * - 只处理对象键；已经是 snake_case 或全小写的键原样保留；
 * - 递归处理嵌套对象与数组（嵌套表格、地址块等）；
 * - Date/File/Blob 等非普通对象原样返回，避免破坏序列化。
 */

const SNAKE_RE = /^[a-z0-9_]+$/;

export function toSnakeKey(key: string): string {
  if (SNAKE_RE.test(key)) return key;
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function toApiPayload<T = unknown>(value: T): T {
  if (Array.isArray(value)) {
    // 只处理"行数组"（嵌套表格）：逐个把它们的顶层键转成 snake_case
    return value.map((item) => (isPlainObject(item) ? snakeObject(item) : item)) as unknown as T;
  }
  if (!isPlainObject(value)) return value;
  return snakeObject(value) as unknown as T;
}

function snakeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    out[toSnakeKey(key)] = val;
  }
  return out;
}
