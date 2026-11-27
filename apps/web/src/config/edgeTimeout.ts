/**
 * 边缘链路容错超时（2026-11-27）
 *
 * 生产链路是 `浏览器 → Cloudflare 边缘 → cloudflared 隧道 → nginx → Rust 后端`。
 * 实测（2026-11-27）：
 *   - 后端直连 127.0.0.1:8099：20–44ms
 *   - nginx 本机直连：20–60ms
 *   - 走 www.topmap.net（CF + 隧道）：p50 ≈ 0.63–1.4s，尾部 2.6s，极端 6.7s
 * 连接复用后单请求仍需 ~0.6s，说明瓶颈在边缘↔源站往返，不在业务代码。
 *
 * 前端全局超时是 5s（VITE_API_TIMEOUT 默认），页面并发十几个请求时，
 * 尾部抖动就会超过阈值，控制台出现 `ECONNABORTED`。
 * 对「本来就可能慢」的聚合型端点（监控基础设施画像、BFF GraphQL 聚合），
 * 单独放宽到 15s，避免把链路抖动误报成全站故障；其余请求维持 5s 快速失败。
 */
export const EDGE_TOLERANT_TIMEOUT_MS = 15_000;

/** 走边缘链路、需要宽松超时的聚合型端点清单（用于文档与测试对齐） */
export const EDGE_TOLERANT_ENDPOINTS = ['/infrastructure', '/graphql'] as const;
