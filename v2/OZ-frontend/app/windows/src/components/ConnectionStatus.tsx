import { useEffect, useState } from 'react';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  convexUrl: string;
}

function ConnectionStatus({ convexUrl }: ConnectionStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(convexUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok || response.status === 404) {
          setStatus('connected');
          setError(null);
        } else {
          setStatus('error');
          setError(`Server returned status ${response.status}`);
        }
      } catch (err: any) {
        setStatus('error');
        if (err.name === 'TimeoutError') {
          setError('Connection timeout - server not responding');
        } else if (err.message.includes('fetch')) {
          setError('Cannot connect to backend server');
        } else {
          setError(err.message || 'Unknown connection error');
        }
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [convexUrl]);

  if (status === 'checking') {
    return (
      <div className="connection-banner checking">
        <span className="status-icon">🔄</span>
        Connecting to backend...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="connection-banner error">
        <div className="banner-content">
          <span className="status-icon">❌</span>
          <div className="banner-text">
            <strong>Backend Connection Error</strong>
            <p>{error}</p>
            <p className="help-text">
              Make sure the backend is running at <code>{convexUrl}</code>
            </p>
          </div>
        </div>
        <button 
          className="btn-retry"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}

export default ConnectionStatus;
