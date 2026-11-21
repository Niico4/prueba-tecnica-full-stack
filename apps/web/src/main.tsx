import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { useAuth } from './modules/auth/store';

import './index.css';

void Promise.resolve(useAuth.persist.rehydrate()).then(() =>
  useAuth.getState().restore(),
);

const root = document.getElementById('root');

if (!root) throw new Error('No se encontró el elemento raíz');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
