// Shim for react-transition-group TransitionGroupContext
// react-transition-group 4.4.5 缺少 TransitionGroupContext.js 文件
// MUI 9.x 的 Transition.mjs 试图从 cjs 路径导入这个文件
// 这个 shim 提供一个基本的 React Context
import { createContext } from 'react';

const TransitionGroupContext = createContext(null);
TransitionGroupContext.displayName = 'TransitionGroupContext';

export default TransitionGroupContext;
