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
