import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto px-4 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-red-700">
                  The CRM Dashboard encountered an error and couldn't load properly.
                </p>
                
                {this.state.error && (
                  <div className="bg-white p-4 rounded border border-red-200">
                    <p className="font-mono text-sm text-red-900">
                      {this.state.error.toString()}
                    </p>
                  </div>
                )}
                
                {this.state.errorInfo && (
                  <details className="bg-white p-4 rounded border border-red-200">
                    <summary className="cursor-pointer font-medium text-red-900">
                      Error Details (for developers)
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="outline"
                  >
                    Reload Page
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/app/dashboard'}
                    variant="outline"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

