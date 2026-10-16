// React 19 原生提供 useSyncExternalStore，无需 use-sync-external-store 的 CJS shim。
// 该文件作为 vite.config.ts alias 的落点，修复 Vite 无法从 CJS shim default 中
// 解构出 named export "useSyncExternalStore" 导致的 SyntaxError / 白屏问题。
// 注：不能直接 alias 到 "react"，否则会干扰 Vite 的 dep pre-bundle，引发
//     "react.js does not provide an export named 'forwardRef'" 副次报错。

// 转发 React 19 原生 named export，供 react-i18next 的 useTranslation 等
// ESM named import 使用（`import { useSyncExternalStore } from 'use-sync-external-store/shim'`）。
import { useSyncExternalStore, useRef, useEffect, useMemo, useDebugValue } from 'react';

export { useSyncExternalStore };

// C3 §5.3: use-sync-external-store/with-selector 的 ESM 转发。
// recharts 等库以 `import { useSyncExternalStoreWithSelector } from
// 'use-sync-external-store/with-selector'` 引入，而该包为 CJS（with-selector.js
// 仅 re-export ./cjs/*.js），Vite 8 无法从 CJS default 解构 named export，
// 导致 "useSyncExternalStore is not a function"（useSyncExternalStoreWithSelector
// 内部调用 useSyncExternalStore 拿到 undefined）。此处按 React 官方
// use-sync-external-store-with-selector.development.js 的实现平移为 ESM，
// 并由 vite alias 将 with-selector 路径重定向到本文件。

interface Inst {
  hasValue: boolean;
  value: unknown;
}

function is(x: unknown, y: unknown): boolean {
  return (x === y && (0 !== x || 1 / (x as number) === 1 / (y as number))) || (x !== x && y !== y);
}

const objectIs: (a: unknown, b: unknown) => boolean =
  typeof Object.is === 'function' ? Object.is : is;

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot?: () => Snapshot,
  selector?: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean
): Selection {
  const instRef = useRef<Inst | null>(null);
  let inst: Inst;
  if (instRef.current === null) {
    inst = { hasValue: false, value: null };
    instRef.current = inst;
  } else {
    inst = instRef.current;
  }

  const getSelection = useMemo(() => {
    let hasMemo = false;
    let memoizedSnapshot: Snapshot | undefined;
    let memoizedSelection: Selection | undefined;

    function memoizedSelector(nextSnapshot: Snapshot): Selection {
      if (!hasMemo) {
        hasMemo = true;
        memoizedSnapshot = nextSnapshot;
        const nextSelection = selector
          ? selector(nextSnapshot)
          : (nextSnapshot as unknown as Selection);
        if (isEqual !== undefined && inst.hasValue) {
          const currentSelection = inst.value as Selection;
          if (isEqual(currentSelection, nextSelection)) {
            memoizedSelection = currentSelection;
            return currentSelection;
          }
        }
        memoizedSelection = nextSelection;
        return nextSelection;
      }
      const currentSelection = memoizedSelection as Selection;
      if (objectIs(memoizedSnapshot, nextSnapshot)) {
        return currentSelection;
      }
      const nextSelection = selector
        ? selector(nextSnapshot)
        : (nextSnapshot as unknown as Selection);
      if (isEqual !== undefined && isEqual(currentSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot;
        return currentSelection;
      }
      memoizedSnapshot = nextSnapshot;
      memoizedSelection = nextSelection;
      return nextSelection;
    }

    const maybeGetServerSnapshot = getServerSnapshot === undefined ? null : getServerSnapshot;
    return [
      () => memoizedSelector(getSnapshot()),
      maybeGetServerSnapshot === null
        ? undefined
        : () => memoizedSelector(maybeGetServerSnapshot()),
    ];
  }, [getSnapshot, getServerSnapshot, selector, isEqual]);

  const value = useSyncExternalStore(
    subscribe,
    getSelection[0] as () => Selection,
    getSelection[1]
  );
  useEffect(() => {
    inst.hasValue = true;
    inst.value = value;
  }, [value]);
  useDebugValue(value);
  return value;
}
