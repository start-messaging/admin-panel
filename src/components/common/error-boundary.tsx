import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // The console is the only destination: this panel sends nothing to a
    // third party (see main.tsx). The component stack goes with it, because it
    // is the part that says *where* the crash was, and it is otherwise lost.
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            The application encountered an unexpected error. Details are in the
            browser console; refreshing usually clears it.
          </p>
          {this.state.error && (
            <pre className="mt-4 rounded bg-muted p-3 text-left text-[10px] font-mono text-muted-foreground overflow-auto max-w-xl max-h-32">
              {this.state.error.message}
            </pre>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="mt-6 gap-2"
          >
            <RotateCcw className="size-4" />
            Refresh Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
