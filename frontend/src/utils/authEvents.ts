/**
 * Decouples the HTTP client from React: the client reports authentication
 * failures here, and AuthProvider reacts (signs out, shows "session expired").
 */

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function reportUnauthorized() {
  unauthorizedListeners.forEach((listener) => listener());
}

/** Supplies the bearer token for API requests, once real authentication exists. */
let tokenProvider: () => string | null = () => null;

export function setAuthTokenProvider(provider: () => string | null) {
  tokenProvider = provider;
}

export const getAuthToken = () => tokenProvider();
