import { useState, useEffect } from 'react';
import Detector from './components/Detector';

// Main App component that handles the offline state and renders the Detector
export default function App() {
  // check if user has internet connection
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen font-sans selection:bg-blue-600 selection:text-white">
      {isOffline && (
        <div className="bg-amber-100 text-amber-900 px-4 py-2 text-center text-sm font-medium border-b border-amber-200">
          You are currently offline. New analyses require an internet connection.
        </div>
      )}
      <main>
        <Detector />
      </main>
    </div>
  );
}
