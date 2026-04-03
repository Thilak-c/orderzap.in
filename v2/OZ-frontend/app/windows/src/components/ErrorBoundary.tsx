import { Component, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-panel">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <div className="error-message">
              <strong>Error:</strong>
              <pre>{this.state.error?.message}</pre>
            </div>
            {this.state.errorInfo && (
              <details className="error-details">
                <summary>Technical Details</summary>
                <pre>{this.state.errorInfo}</pre>
              </details>
            )}
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
