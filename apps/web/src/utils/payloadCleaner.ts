/**
 * S1 表单假成功修复：请求体空值清洗（一处修复全站生效）。
 *
 * 背景：后端 `Option<Uuid>` / `Option<DateTime>` 等可空字段收到 JSON 空字符串 `""`
 * 时，serde 反序列化直接失败 → 422；前端部分页面静默降级 mock，造成"页面提示成功、
 * 数据库不落库"的假成功。本模块在通用 HTTP 请求层（api/client 请求拦截器）统一清洗。
 *
 * 规则（保守，避免误杀名称/编码等合法文本空串）：
 * - 外键 UUID 类字段（snake `*_id`、camel `*Id`/`*ID`/`*Uuid`、或键名恰为 `id`）：
 *   空串/纯空白 → 删除该键（等价 undefined，不发送）。
 * - 日期/时间类字段（`*_date`/`*Date`、`*_at`/`*At`、`*_time`/`*Time`）：
 *   空串/纯空白 → 删除该键。
 * - 其余文本字段（name/code/phone/email/address/remark 等）原样保留，不做处理。
 * - 递归处理嵌套对象与对象数组（明细行）；非对象（FormData、原始数组、原始值）原样返回。
 */

/** UUID 格式（用于外键字段非空值的格式校验，当前仅记录，不主动丢弃非空值） */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 外键 UUID 类字段名：snake_case *_id / camelCase *Id、*ID、*Uuid，或键名恰为 id */
const FOREIGN_KEY_RE = /(_id|uuid)$/i;
const CAMEL_FK_RE = /(Id|ID|Uuid|UUID)$/;

/** 日期/时间类字段名 */
const DATE_FIELD_RE = /(_date|_at|_time)$/i;
const CAMEL_DATE_RE = /(Date|At|Time)$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.prototype.toString.call(value) === '[object Object]';

const isEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() === '';

/** 判断字段名是否为外键 UUID 类 */
export function isForeignKeyField(key: string): boolean {
  if (key === 'id') return true;
  return FOREIGN_KEY_RE.test(key) || CAMEL_FK_RE.test(key);
}

/** 判断字段名是否为日期/时间类 */
export function isDateTimeField(key: string): boolean {
  return DATE_FIELD_RE.test(key) || CAMEL_DATE_RE.test(key);
}

/** 非空字符串是否为合法 UUID（供调用方按需使用） */
export function isValidUuid(value: unknown): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * 递归清洗请求体：外键/日期类字段的空串删除键，其余原样保留。
 * 返回新对象，不修改入参。
 */
export function cleanEmptyOptionalFields<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map((item) =>
      isPlainObject(item) ? cleanEmptyOptionalFields(item) : item
    ) as unknown as T;
  }
  if (!isPlainObject(payload)) {
    return payload;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (isEmptyString(value) && (isForeignKeyField(key) || isDateTimeField(key))) {
      // 空串的外键/日期字段：删除键（undefined），避免后端 serde 422
      continue;
    }
    result[key] = isPlainObject(value)
      ? cleanEmptyOptionalFields(value)
      : Array.isArray(value)
        ? (value as unknown[]).map((item) =>
            isPlainObject(item) ? cleanEmptyOptionalFields(item) : item
          )
        : value;
  }
  return result as unknown as T;
}

export default cleanEmptyOptionalFields;
