import { describe, it, expect } from 'vitest';

import { invertColor } from '../themeUtils';

// Mock @mui/material/styles before importing
vi.mock('@mui/material/styles', () => ({
  useTheme: vi.fn(() => ({ palette: { mode: 'light' } })),
}));

describe('utils/themeUtils - invertColor', () => {
  it('inverts black to white', () => {
    expect(invertColor('#000000')).toBe('#ffffff');
  });

  it('inverts white to black', () => {
    expect(invertColor('#ffffff')).toBe('#000000');
  });

  it('inverts red correctly', () => {
    // #ff0000 -> #00ffff (cyan)
    expect(invertColor('#ff0000')).toBe('#00ffff');
  });

  it('inverts green correctly', () => {
    // #00ff00 -> #ff00ff (magenta)
    expect(invertColor('#00ff00')).toBe('#ff00ff');
  });

  it('inverts blue correctly', () => {
    // #0000ff -> #ffff00 (yellow)
    expect(invertColor('#0000ff')).toBe('#ffff00');
  });

  it('inverts a mid-gray', () => {
    // #808080 -> #7f7f7f
    expect(invertColor('#808080')).toBe('#7f7f7f');
  });

  it('inverts a complex color', () => {
    // #3a5fcd -> #c5a032
    expect(invertColor('#3a5fcd')).toBe('#c5a032');
  });

  it('handles lowercase hex', () => {
    expect(invertColor('#abcdef')).toBe('#543210');
  });

  it('handles uppercase hex', () => {
    expect(invertColor('#ABCDEF')).toBe('#543210');
  });

  it('pads single-digit hex components', () => {
    // #000100 -> r=255, g=254, b=255 -> #feff ff -> wait
    // r = 255 - 0 = 255 = ff
    // g = 255 - 1 = 254 = fe
    // b = 255 - 0 = 255 = ff
    expect(invertColor('#000100')).toBe('#fffeff');
  });
});
