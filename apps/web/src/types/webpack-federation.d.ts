/**
 * Type declarations for Webpack Module Federation runtime globals
 * and container interfaces used for dynamic remote module loading.
 */

interface WebpackContainer {
  init(shareScope: unknown): Promise<void>;
  get(module: string): Promise<() => unknown>;
}

declare const WebpackInitSharing: (shareScope: string) => Promise<void>;
declare const WebpackShareScopes: Record<string, Record<string, unknown>>;

interface Window {
  // Allow dynamic property access on window for remote containers and other globals
  [key: string]: unknown;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  WebpackShareScopes: Record<string, Record<string, unknown>>;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  WebpackInitSharing: (shareScope: string) => Promise<void>;
  __wxjs_environment?: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  System?: {
    import(modulePath: string): Promise<Record<string, unknown>>;
  };
}
