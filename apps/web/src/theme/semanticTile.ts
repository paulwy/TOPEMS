/**
 * 语义色「软底瓦片」样式
 *
 * 历史写法是 `bgcolor: `${color}.light`` + `color: `${color}.main``：
 * 两种模式都只有 1.1~1.8:1（橙压橙、紫压紫），图标/文字基本不可辨。
 * 这里统一成 12% 主色底 + 亮色用 -dark、暗色用 -light 的前景，
 * 既保留语义色识别，又保证两种模式下都有足够对比度。
 */
import { alpha, type Theme } from '@mui/material/styles';

type PaletteEntry = { main?: string; light?: string; dark?: string };

const pickEntry = (theme: Theme, key?: string): PaletteEntry => {
  const palette = theme.palette as unknown as Record<string, PaletteEntry | undefined>;
  const entry = key ? palette[key] : undefined;
  return entry && typeof entry === 'object' && typeof entry.main === 'string'
    ? entry
    : (palette.primary as PaletteEntry);
};

/** 软底瓦片：返回可直接展开到 sx 的 bgcolor/color */
export const semanticTileSx = (key?: string, ratio = 0.12) => ({
  bgcolor: (theme: Theme) => alpha(pickEntry(theme, key).main as string, ratio),
  color: (theme: Theme) => {
    const entry = pickEntry(theme, key);
    return theme.palette.mode === 'dark' ? (entry.light ?? entry.main) : (entry.dark ?? entry.main);
  },
});

/** 语义色「墨色」：只给前景（裸图标/文字压在卡片底色上时用这个） */
export const semanticInkSx = (key?: string) => ({
  color: (theme: Theme) => {
    const entry = pickEntry(theme, key);
    return theme.palette.mode === 'dark' ? (entry.light ?? entry.main) : (entry.dark ?? entry.main);
  },
});
