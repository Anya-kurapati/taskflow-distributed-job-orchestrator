import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback; receives the error and a function that retries rendering. */
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
  /** Name of the failed area, used by the default fallback ("Couldn't load {label}"). */
  label?: string;
  /** When any of these values change, a failed boundary resets automatically. */
  resetKeys?: readonly unknown[];
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Contains a rendering crash to one part of the page, so e.g. a chart failing
 * on unexpected data doesn't take down the whole dashboard.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hook for an error-reporting service (e.g. Sentry) once one is chosen.
    console.error('Rendering error caught by ErrorBoundary', error, info.componentStack);
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    const { resetKeys = [] } = this.props;
    const previousKeys = previous.resetKeys ?? [];
    if (
      this.state.error &&
      (resetKeys.length !== previousKeys.length ||
        resetKeys.some((key, index) => !Object.is(key, previousKeys[index])))
    ) {
      this.reset();
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback({ error, reset: this.reset });

    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-8 text-center"
      >
        <AlertTriangle className="size-6 text-amber-500" aria-hidden />
        <p className="text-sm font-medium text-slate-900">
          Couldn&apos;t display {this.props.label ?? 'this section'}
        </p>
        <p className="max-w-md text-xs text-slate-500">{error.message}</p>
        <Button variant="secondary" onClick={this.reset}>
          <RotateCcw className="size-4" aria-hidden />
          Try again
        </Button>
      </div>
    );
  }
}
