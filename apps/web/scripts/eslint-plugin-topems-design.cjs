/**
 * TOPEMS Design System ESLint Plugin
 *
 * 检测硬编码的颜色和间距值，引导使用 design tokens。
 *
 * 规则:
 * - no-hardcoded-colors: 禁止硬编码颜色值（#fff, rgb(), 颜色名等）
 * - no-hardcoded-spacing: 禁止硬编码间距值（优先使用 theme spacing）
 */

'use strict';

const COLOR_REGEX = /^#([0-9a-fA-F]{3,8})$/;
const RGB_REGEX = /^(rgb|rgba|hsl|hsla)\(/i;
const NAMED_COLORS = new Set([
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan',
  'magenta', 'lime', 'teal', 'indigo', 'violet', 'brown', 'gray', 'grey',
  'black', 'white', 'silver', 'gold', 'navy', 'maroon', 'olive', 'aqua',
]);

function isHardcodedColor(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;

  if (COLOR_REGEX.test(v)) return true;
  if (RGB_REGEX.test(v)) return true;
  if (NAMED_COLORS.has(v.toLowerCase())) return true;

  return false;
}

function isLikelySpacingValue(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!/^\d+(\.\d+)?px$/.test(v)) return false;
  const num = parseFloat(v);
  return [4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64].includes(num);
}

const noHardcodedColors = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '禁止硬编码颜色值，使用 theme tokens 代替',
      category: 'Design System',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      hardcodedColor: '硬编码颜色 "{{ value }}"，请使用 theme palette tokens 代替（如 theme.palette.primary.main）',
    },
  },
  create(context) {
    function checkColorValue(node, value, propName) {
      if (!isHardcodedColor(value)) return;

      context.report({
        node,
        messageId: 'hardcodedColor',
        data: { value },
      });
    }

    function isColorProperty(propName) {
      if (!propName || typeof propName !== 'string') return false;
      const name = propName.toLowerCase();
      return name.includes('color') || name.includes('bgcolor') ||
             name.includes('background') || name.includes('bordercolor') ||
             name.includes('fill') || name.includes('stroke');
    }

    return {
      // 检测 sx prop 中的对象表达式
      JSXAttribute(node) {
        if (node.name.name !== 'sx' || !node.value || node.value.type !== 'JSXExpressionContainer') return;
        const expr = node.value.expression;
        if (expr.type !== 'ObjectExpression') return;

        for (const prop of expr.properties) {
          if (prop.type !== 'Property') continue;
          const keyName = prop.key?.name || prop.key?.value;
          if (!isColorProperty(keyName)) continue;

          if (prop.value.type === 'Literal' && typeof prop.value.value === 'string') {
            checkColorValue(prop.value, prop.value.value, keyName);
          } else if (prop.value.type === 'TemplateLiteral' && prop.value.expressions.length === 0) {
            const raw = prop.value.quasis[0].value.raw;
            checkColorValue(prop.value, raw, keyName);
          }
        }
      },

      // 检测 style 对象中的颜色值
      Property(node) {
        if (!node.key || !node.value) return;
        const keyName = node.key.name || node.key.value;
        if (!isColorProperty(keyName)) return;
        if (node.value.type !== 'Literal' || typeof node.value.value !== 'string') return;

        checkColorValue(node.value, node.value.value, keyName);
      },
    };
  },
};

const noHardcodedSpacing = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '禁止硬编码间距值，使用 theme spacing 代替',
      category: 'Design System',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      hardcodedSpacing: '硬编码间距 "{{ value }}"，请使用 theme.spacing() 代替',
    },
  },
  create(context) {
    function checkSpacingValue(node, value, propName) {
      if (!isLikelySpacingValue(value)) return;

      context.report({
        node,
        messageId: 'hardcodedSpacing',
        data: { value },
      });
    }

    function isSpacingProperty(propName) {
      if (!propName) return false;
      const name = propName.toLowerCase();
      return ['margin', 'padding', 'gap', 'm', 'p'].includes(name) ||
             name.startsWith('margin') || name.startsWith('padding') ||
             name === 'mt' || name === 'mb' || name === 'ml' || name === 'mr' ||
             name === 'mx' || name === 'my' ||
             name === 'pt' || name === 'pb' || name === 'pl' || name === 'pr' ||
             name === 'px' || name === 'py';
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'sx' || !node.value || node.value.type !== 'JSXExpressionContainer') return;
        const expr = node.value.expression;
        if (expr.type !== 'ObjectExpression') return;

        for (const prop of expr.properties) {
          if (prop.type !== 'Property') continue;
          const keyName = prop.key?.name || prop.key?.value;
          if (!isSpacingProperty(keyName)) continue;

          if (prop.value.type === 'Literal' && typeof prop.value.value === 'string') {
            checkSpacingValue(prop.value, prop.value.value, keyName);
          }
        }
      },
    };
  },
};

module.exports = {
  rules: {
    'no-hardcoded-colors': noHardcodedColors,
    'no-hardcoded-spacing': noHardcodedSpacing,
  },
  configs: {
    recommended: {
      plugins: ['topems-design'],
      rules: {
        'topems-design/no-hardcoded-colors': 'warn',
        'topems-design/no-hardcoded-spacing': 'warn',
      },
    },
  },
};
