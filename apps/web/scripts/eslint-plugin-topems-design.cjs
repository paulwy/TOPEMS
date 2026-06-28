/**
 * eslint-plugin-topems-design (CommonJS)
 *
 * TOPEMS 设计系统 ESLint 规则插件
 * 检测硬编码颜色值和间距值，引导使用 semanticTokens
 */

// ============================================================
// 规则 1: no-hardcoded-colors
// ============================================================

const noHardcodedColors = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '禁止在 sx/style 中使用硬编码颜色值，应使用 designTokens 或 semanticTokens',
      category: 'Best Practices',
      recommended: 'warn',
    },
    messages: {
      hexColor: '避免硬编码颜色值 {{color}}，请使用 designTokens 或 semanticTokens 中的语义化颜色',
      rgbColor: '避免硬编码 RGB/RGBA 颜色值，请使用 designTokens 或 semanticTokens',
      hslColor: '避免硬编码 HSL/HSLA 颜色值，请使用 designTokens 或 semanticTokens',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedHexValues: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedHex = new Set(options.allowedHexValues || []);

    function isHardcodedColor(value) {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
        if (allowedHex.has(trimmed.toLowerCase())) return null;
        return { type: 'hexColor', color: trimmed };
      }
      if (/^rgba?\s*\(/.test(trimmed)) {
        return { type: 'rgbColor', color: trimmed.substring(0, 40) + '...' };
      }
      if (/^hsla?\s*\(/.test(trimmed)) {
        return { type: 'hslColor', color: trimmed.substring(0, 40) + '...' };
      }
      return null;
    }

    function checkObjectForColors(node) {
      if (!node || node.type !== 'ObjectExpression') return;
      const colorProps = new Set([
        'color', 'backgroundColor', 'background', 'borderColor',
        'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
        'outlineColor', 'caretColor', 'fill', 'stroke', 'textDecorationColor',
      ]);
      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;
        const propName = prop.key && (prop.key.name || prop.key.value);
        if (colorProps.has(propName) && prop.value) {
          const rawValue =
            prop.value.type === 'Literal'
              ? prop.value.value
              : prop.value.type === 'TemplateLiteral' && prop.value.quasis[0]
                ? prop.value.quasis[0].value.raw
                : null;
          const result = isHardcodedColor(rawValue);
          if (result) {
            context.report({ node: prop.value, messageId: result.type, data: { color: result.color } });
          }
        }
      }
    }

    return {
      JSXAttribute(node) {
        const name = node.name && node.name.name;
        if ((name === 'sx' || name === 'style') && node.value && node.value.type === 'ObjectExpression') {
          checkObjectForColors(node.value);
        }
      },
      Property(node) {
        if (node.key && (node.key.name === 'sx' || node.key.name === 'style')) {
          if (node.value && node.value.type === 'ObjectExpression') {
            checkObjectForColors(node.value);
          }
        }
      },
    };
  },
};

// ============================================================
// 规则 2: no-hardcoded-spacing
// ============================================================

const noHardcodedSpacing = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '避免在 sx/style 中使用 magic number 间距值，应使用 designTokens.spacing 或 semanticTokens',
      category: 'Best Practices',
      recommended: 'off',
    },
    messages: {
      magicSpacing: '间距值 {{value}}px 建议使用 designTokens.spacing 或 semanticTokens.space 语义别名',
    },
    schema: [],
  },

  create(context) {
    const allowedValues = new Set([0, '0', 'auto', 'inherit', 'initial', 'unset', 'none', 'normal']);
    const spacingProps = new Set([
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'paddingX', 'paddingY', 'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'marginX', 'marginY', 'm', 'mt', 'mr', 'mb', 'ml', 'mx', 'my',
      'gap', 'rowGap', 'columnGap', 'g', 'gridGap',
      'top', 'right', 'bottom', 'left', 'inset',
    ]);

    function checkObjectForSpacing(node) {
      if (!node || node.type !== 'ObjectExpression') return;
      for (const prop of node.properties) {
        if (prop.type !== 'Property' || !prop.key) continue;
        const propName = prop.key.name || prop.key.value;
        if (!prop.value || !spacingProps.has(propName)) continue;
        let value = null;
        if (prop.value.type === 'Literal') value = String(prop.value.value);
        else if (prop.value.type === 'TemplateLiteral' && prop.value.quasis.length === 1)
          value = prop.value.quasis[0].value.raw;
        if (!value || allowedValues.has(value)) continue;
        const match = value.match(/^(\d+)px$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > 0 && num <= 128) {
            context.report({ node: prop.value, messageId: 'magicSpacing', data: { value: num } });
          }
        }
      }
    }

    return {
      JSXAttribute(node) {
        const name = node.name && node.name.name;
        if ((name === 'sx' || name === 'style') && node.value && node.value.type === 'ObjectExpression') {
          checkObjectForSpacing(node.value);
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
        'topems-design/no-hardcoded-spacing': 'off',
      },
    },
  },
};
