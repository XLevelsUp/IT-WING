import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import StartupLoadingScreen from '../components/common/StartupLoadingScreen';

const LoadingContext = createContext({
  startLoading: () => {},
  stopLoading: () => {},
  resetLoading: () => {},
  isLoading: false,
  isReady: true,
});

export const LoadingProvider = ({ children }) => {
  const [activeRequests, setActiveRequests] = useState(new Set());
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [isReady, setIsReady] = useState(false);
  const watchdogTimerRef = useRef(null);

  const startLoading = useCallback((key = 'page-load', text = '') => {
    setActiveRequests((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setIsOverlayVisible(true);
    setIsReady(false);
    if (text) setOverlayText(text);

    // Reset watchdog on new request
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    watchdogTimerRef.current = setTimeout(() => {
      // Force cleanup after 8s safety ceiling
      setActiveRequests(new Set());
      setIsReady(true);
    }, 8000);
  }, []);

  const stopLoading = useCallback((key = 'page-load') => {
    setActiveRequests((prev) => {
      const next = new Set(prev);
      next.delete(key);
      if (next.size === 0) {
        setIsReady(true);
      }
      return next;
    });
  }, []);

  const resetLoading = useCallback(() => {
    setActiveRequests(new Set());
    setIsReady(true);
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
  }, []);

  const handleOverlayComplete = useCallback(() => {
    setIsOverlayVisible(false);
    setOverlayText('');
    setIsReady(false);
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    };
  }, []);

  const isLoading = activeRequests.size > 0;

  return (
    <LoadingContext.Provider
      value={{
        startLoading,
        stopLoading,
        resetLoading,
        isLoading,
        isReady,
      }}
    >
      {children}
      {isOverlayVisible && (
        <StartupLoadingScreen
          isReady={isReady}
          text={overlayText}
          onComplete={handleOverlayComplete}
        />
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);

export default LoadingContext;
