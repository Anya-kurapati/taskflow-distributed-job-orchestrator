export const inputClasses =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500';

export const codeInputClasses = `${inputClasses} font-mono text-xs leading-relaxed`;

/**
 * Props linking a control to the text its <FormField> renders below it: the
 * error when there is one, otherwise the hint (FormField shows one or the other).
 */
export function describedBy(id: string, error?: string, hasHint = false) {
  const describedById = error ? `${id}-error` : hasHint ? `${id}-hint` : undefined;
  return { id, 'aria-invalid': Boolean(error), 'aria-describedby': describedById };
}
