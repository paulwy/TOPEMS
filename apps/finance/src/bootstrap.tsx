import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

export interface MountOptions {
  basename?: string;
  initialPath?: string;
}

let root: ReactDOM.Root | null = null;

export const mount = (container: HTMLElement, options: MountOptions = {}): void => {
  if (root) {
    unmount(container);
  }

  const { basename = '/', initialPath = '/' } = options;

  root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <MemoryRouter
        basename={basename}
        initialEntries={[initialPath]}
      >
        <App />
      </MemoryRouter>
    </React.StrictMode>
  );
};

export const unmount = (container: HTMLElement): void => {
  if (root && container) {
    root.unmount();
    root = null;
  }
};

if (import.meta.env.DEV) {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    mount(rootElement, { basename: '/finance' });
  }
}
