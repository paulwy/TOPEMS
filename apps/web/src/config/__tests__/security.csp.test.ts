import { describe, it, expect } from 'vitest';
import { PRODUCTION_CONTENT_SECURITY_POLICY } from '../security';

/**
 * 生产 CSP 回归护栏（2026-11-27）
 *
 * 背景：applySecurityHeaders 在 main.tsx 运行时以 <meta http-equiv> 注入 CSP，
 * 入口 <script type="module"> 没有 nonce/hash。若 script-src 带 'strict-dynamic'，
 * 该策略下不存在任何可信根，随后所有 import() 的按需 chunk 会被浏览器拒绝，
 * 线上表现为整站停在「加载中」（当天真实事故）。
 *
 * 这里锁定生产策略的三条不变量，避免再被顺手改回去：
 *   1) 不得出现 'strict-dynamic'
 *   2) script-src 必须放行同源（'self'），否则自有 chunk 全挂
 *   3) object-src / base-uri / form-action 的硬化不许被拆掉
 *
 * 注意：断言针对导出的生产常量，不依赖 vitest 运行时的 dev/prod 判断，
 * 因此开发态下跑测试同样有效。
 */
const directives = (policy: string): string[] =>
  policy
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean);

const directiveOf = (policy: string, name: string): string => {
  const hit = directives(policy).find((d) => d.startsWith(`${name} `) || d === name);
  return hit ?? '';
};

describe('生产 CSP 回归护栏', () => {
  it('不得包含 strict-dynamic（会屏蔽所有 import() 按需 chunk）', () => {
    expect(PRODUCTION_CONTENT_SECURITY_POLICY).not.toContain("'strict-dynamic'");
  });

  it("script-src 放行同源脚本，且保留首屏内联主题脚本所需的 'unsafe-inline'", () => {
    const scriptSrc = directiveOf(PRODUCTION_CONTENT_SECURITY_POLICY, 'script-src');
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it('default-src 收敛到同源', () => {
    expect(directiveOf(PRODUCTION_CONTENT_SECURITY_POLICY, 'default-src')).toBe(
      "default-src 'self'"
    );
  });

  it('保留 object-src / base-uri / form-action 硬化项', () => {
    expect(directiveOf(PRODUCTION_CONTENT_SECURITY_POLICY, 'object-src')).toBe("object-src 'none'");
    expect(directiveOf(PRODUCTION_CONTENT_SECURITY_POLICY, 'base-uri')).toBe("base-uri 'self'");
    expect(directiveOf(PRODUCTION_CONTENT_SECURITY_POLICY, 'form-action')).toBe(
      "form-action 'self'"
    );
  });
});
