/**
 * Type declarations for Webpack Module Federation runtime globals
 * and container interfaces used for dynamic remote module loading.
 */

interface WebpackContainer {
  init(shareScope: unknown): Promise<void>;
  get(module: string): Promise<() => unknown>;
}

declare const __webpack_init_sharing__: (shareScope: string) => Promise<void>;
declare const __webpack_share_scopes__: Record<string, Record<string, unknown>>;

interface Window {
  // Allow dynamic property access on window for remote containers and other globals
  [key: string]: unknown;
  __webpack_share_scopes__: Record<string, Record<string, unknown>>;
  __webpack_init_sharing__: (shareScope: string) => Promise<void>;
  __wxjs_environment?: string;
  System?: {
    import(modulePath: string): Promise<Record<string, unknown>>;
  };
}
