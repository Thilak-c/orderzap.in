import { ConvexProvider, ConvexReactClient } from 'convex/react';
import MenuManager from './components/MenuManager';
import ErrorBoundary from './components/ErrorBoundary';
import ConnectionStatus from './components/ConnectionStatus';
import Sidebar from './components/Sidebar';

const CONVEX_URL = 'http://127.0.0.1:3210';
const convex = new ConvexReactClient(CONVEX_URL);

function App() {
  return (
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <div className="app">
          <Sidebar />
          <div className="app-content">
            <ConnectionStatus convexUrl={CONVEX_URL} />
            <main className="app-main">
              <MenuManager />
            </main>
          </div>
        </div>
      </ConvexProvider>
    </ErrorBoundary>
  );
}

export default App;
