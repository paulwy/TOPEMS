import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { createPermissionInterceptor } from './api/permissionInterceptor';

createPermissionInterceptor();

window.addEventListener('permission-denied', (event: Event) => {
  const customEvent = event as CustomEvent;
  console.warn('Permission denied:', customEvent.detail);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
