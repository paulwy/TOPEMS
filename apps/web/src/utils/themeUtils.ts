/**
 * 主题工具函数
 */

/**
 * 反转十六进制颜色（255 - 每个通道），输入/输出均为 #rrggbb 格式。
 */
export function invertColor(hex: string): string {
  if (!hex || !hex.startsWith('#')) return hex;
  let value = hex.slice(1);
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (value.length !== 6) return hex;

  const r = 255 - parseInt(value.slice(0, 2), 16);
  const g = 255 - parseInt(value.slice(2, 4), 16);
  const b = 255 - parseInt(value.slice(4, 6), 16);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
