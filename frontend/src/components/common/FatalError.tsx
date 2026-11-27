/**
 * Last-resort screen when the app can't start or crashes outside any other
 * boundary. Deliberately dependency-free (no router, query client or icons),
 * since any of those may be what failed.
 */
export function FatalError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div role="alert" className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-xl font-semibold text-slate-900">TaskFlow couldn&apos;t start</h1>
      <p className="mt-2 text-sm text-slate-600">
        Something went wrong while loading the application. Reloading usually fixes it; if it
        doesn&apos;t, share the details below with your administrator.
      </p>
      <pre className="mt-4 overflow-auto rounded-md bg-slate-100 p-3 text-xs whitespace-pre-wrap text-slate-800">
        {message}
      </pre>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        Reload
      </button>
    </div>
  );
}
