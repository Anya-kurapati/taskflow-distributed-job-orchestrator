const SENSITIVE_HEADER = /authorization|token|secret|api[-_]?key|cookie|password|signature/i;

/** Header values that should never be displayed in full. */
export const isSensitiveHeader = (name: string) => SENSITIVE_HEADER.test(name);

export const maskHeaderValue = (name: string, value: string) =>
  isSensitiveHeader(name) ? '••••••••' : value;
