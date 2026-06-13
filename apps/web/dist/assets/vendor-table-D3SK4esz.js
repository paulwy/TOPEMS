import{r as t}from"./vendor-react-uTu8OeCY.js";import{ba as e}from"./vendor-shared-CQsdbIqD.js";
/**
   * react-table
   *
   * Copyright (c) TanStack
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE.md file in the root directory of this source tree.
   *
   * @license MIT
   */function n(e,n){return e?function(t){return"function"==typeof t&&(()=>{const e=Object.getPrototypeOf(t);return e.prototype&&e.prototype.isReactComponent})()}(r=e)||"function"==typeof r||function(t){return"object"==typeof t&&"symbol"==typeof t.$$typeof&&["react.memo","react.forward_ref"].includes(t.$$typeof.description)}(r)?t.createElement(e,n):e:null;var r}function r(n){const r={state:{},onStateChange:()=>{},renderFallbackValue:null,...n},[o]=t.useState(()=>({current:e(r)})),[a,u]=t.useState(()=>o.current.initialState);return o.current.setOptions(t=>({...t,...n,state:{...a,...n.state},onStateChange:t=>{u(t),null==n.onStateChange||n.onStateChange(t)}})),o.current}export{n as f,r as u};
