import { setupWorker } from 'msw/browser';

import { createLiveEventsHandler, handlers } from './handlers';
import { startSimulation } from './simulation';

// In the browser the mock also runs the scheduler and "workers", so jobs
// progress on their own and live updates stream over SSE. Tests stay static.
startSimulation();

export const worker = setupWorker(...handlers, createLiveEventsHandler());
