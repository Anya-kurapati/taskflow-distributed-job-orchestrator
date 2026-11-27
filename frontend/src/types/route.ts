import type { Params } from 'react-router';

/** Metadata attached to route objects via `handle`. */
export interface RouteHandle {
  /** Breadcrumb label; also used for the document title of the deepest match. */
  crumb?: string | ((params: Params) => string);
}
