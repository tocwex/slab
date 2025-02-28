import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';
import './fonts.css';
import './index.css';

const container = (document.getElementById('app') as HTMLElement);
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
