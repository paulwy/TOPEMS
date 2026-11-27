/**
 * 渐变可用性 / 平均色分析
 *
 * 背景：多处页面用 `linear-gradient(...)` 拼字符串，其中任一颜色取到空值或非法令牌
 * （如 `undefined`、`border.default`）时，浏览器会**整条丢弃** background，
 * 而前景又写死白色 → 白图标压白底。
 *
 * 这里用离屏元素让 CSS 引擎自己判定合法性，并解析出实际生效的色标，
 * 供调用方挑选可读前景色。
 */

type Rgb = [number, number, number];

interface GradientInfo {
  /** 该渐变能否被浏览器真实渲染 */
  usable: boolean;
  /** 各色标平均色（rgb 字符串），不可用时为 null */
  average: string | null;
}

const EMPTY: GradientInfo = { usable: false, average: null };

let probeEl: HTMLDivElement | null = null;

const getProbe = (): HTMLDivElement | null => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null;
  if (!probeEl) {
    probeEl = document.createElement('div');
    probeEl.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;';
    document.body.appendChild(probeEl);
  }
  return probeEl;
};

const parseRgb = (value: string): Rgb | null => {
  const nums = value.match(/(-?\d*\.?\d+(?:e-?\d+)?)/g);
  if (!nums || nums.length < 3) return null;
  const normalized = value.startsWith('color(');
  return nums.slice(0, 3).map((n) => Math.round(Number(n) * (normalized ? 255 : 1))) as Rgb;
};

const parseHex = (value: string): Rgb | null => {
  const hex = value.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(hex);
  if (short) {
    const chars = short[1].split('');
    return [chars[0] + chars[0], chars[1] + chars[1], chars[2] + chars[2]].map((c) =>
      parseInt(c, 16)
    ) as Rgb;
  }
  const full = /^#([0-9a-f]{6})$/i.exec(hex);
  if (full) {
    const h = full[1];
    return [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)].map((c) => parseInt(c, 16)) as Rgb;
  }
  return null;
};

const parseAny = (value: string): Rgb | null => parseHex(value) ?? parseRgb(value);

export const analyzeGradient = (value?: string): GradientInfo => {
  if (!value) return EMPTY;
  if (/undefined|NaN/.test(value)) return EMPTY;

  const probe = getProbe();
  if (!probe) {
    // 无 DOM（单测 / SSR）退化为正则判定
    return /#|rgb|var\(/.test(value) ? { usable: true, average: null } : EMPTY;
  }

  probe.style.backgroundImage = '';
  probe.style.backgroundImage = value;
  const resolved = window.getComputedStyle(probe).backgroundImage;
  const applied = Boolean(resolved) && resolved !== 'none';
  probe.style.backgroundImage = '';
  if (!applied) return EMPTY;

  const stops = (resolved.match(/(?:rgba?|color)\([^)]+\)/g) ?? [])
    .map(parseAny)
    .filter((c): c is Rgb => Boolean(c));
  if (!stops.length) {
    const fallback = (value.match(/(?:rgba?|color)\([^)]+\)|#[0-9a-f]{3,6}/gi) ?? [])
      .map(parseAny)
      .filter((c): c is Rgb => Boolean(c));
    if (!fallback.length) return { usable: true, average: null };
    stops.push(...fallback);
  }
  const avg = [0, 1, 2].map((i) =>
    Math.round(stops.reduce((acc, c) => acc + c[i], 0) / stops.length)
  );
  const average = `#${avg.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  return { usable: true, average };
};
