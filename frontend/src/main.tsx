import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import { FatalError } from './components/common/FatalError';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');
const root = createRoot(rootElement);

/** Starts the MSW mock API in development when enabled (see src/mocks). */
async function enableApiMocks() {
  // `import.meta.env.DEV` is a build-time constant, so production bundles
  // drop this branch — and the mocks — entirely.
  if (!import.meta.env.DEV) return;
  const { env } = await import('./config/env');
  if (!env.enableApiMocks) return;
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass' });
}

/**
 * The app is imported dynamically so that failures while loading it — e.g. an
 * invalid environment configuration, which throws at import time — show a
 * readable message instead of a blank page.
 */
async function bootstrap() {
  try {
    await enableApiMocks();
    const { App } = await import('./App');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    console.error(error);
    root.render(<FatalError error={error} />);
  }
}

void bootstrap();
