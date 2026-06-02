import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { captureError } from "@/lib/observability";

interface Props { children: ReactNode }
interface State { error: Error | null }

/** Catches render-time crashes anywhere below it, reports them, and shows a
 *  recoverable fallback instead of a white screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureError(error, { componentStack: info.componentStack });
  }

  private handleReload = (): void => {
    window.location.assign("/");
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center bg-background px-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred and has been reported. You can return to the home page and try again.
            </p>
            <button
              onClick={this.handleReload}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-7 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Back to safety
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
