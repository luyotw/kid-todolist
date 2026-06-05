import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { clearLegacyPwaCaches } from './lib/pwa/register';
import './styles.css';

async function bootstrap() {
  const cleared = await clearLegacyPwaCaches();
  if (cleared) {
    location.reload();
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
