// React 19 原生提供 useSyncExternalStore，无需 use-sync-external-store 的 CJS shim。
// 该文件作为 vite.config.ts alias 的落点，修复 Vite 无法从 CJS shim default 中
// 解构出 named export "useSyncExternalStore" 导致的 SyntaxError / 白屏问题。
// 注：不能直接 alias 到 "react"，否则会干扰 Vite 的 dep pre-bundle，引发
//     "react.js does not provide an export named 'forwardRef'" 副次报错。
export { useSyncExternalStore } from 'react';
