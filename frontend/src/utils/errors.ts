/**
 * After a deploy, an open tab may request a code chunk that no longer exists.
 * Browsers word this differently, so match the common messages.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return /dynamically imported module|Importing a module script failed|Loading chunk .* failed/i.test(
    message,
  );
}
