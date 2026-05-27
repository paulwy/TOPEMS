import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

import { toast, ToastMessage } from './components';

window.addEventListener('toast', (event) => {
  const detail = (event as CustomEvent<ToastMessage>).detail;
  toast[detail.type](detail.message, detail.duration);
});
