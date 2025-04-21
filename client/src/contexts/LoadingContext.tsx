import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingState {
  isLoading: boolean;
  message: string;
  progress?: number;
  startTime: Date;
}

interface LoadingContextType {
  loadingStates: Record<string, LoadingState>;
  startLoading: (id: string, message?: string) => void;
  updateLoadingProgress: (id: string, progress: number, message?: string) => void;
  stopLoading: (id: string) => void;
  isLoading: (id: string) => boolean;
  getLoadingState: (id: string) => LoadingState | null;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>({});

  const startLoading = (id: string, message: string = 'Loading...') => {
    setLoadingStates(prev => ({
      ...prev,
      [id]: {
        isLoading: true,
        message,
        startTime: new Date(),
      },
    }));
  };

  const updateLoadingProgress = (id: string, progress: number, message?: string) => {
    setLoadingStates(prev => {
      const currentState = prev[id];
      if (!currentState) return prev;

      return {
        ...prev,
        [id]: {
          ...currentState,
          progress,
          ...(message ? { message } : {}),
        },
      };
    });
  };

  const stopLoading = (id: string) => {
    setLoadingStates(prev => {
      const newStates = { ...prev };
      delete newStates[id];
      return newStates;
    });
  };

  const isLoading = (id: string) => {
    return !!loadingStates[id]?.isLoading;
  };

  const getLoadingState = (id: string) => {
    return loadingStates[id] || null;
  };

  return (
    <LoadingContext.Provider
      value={{
        loadingStates,
        startLoading,
        updateLoadingProgress,
        stopLoading,
        isLoading,
        getLoadingState,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}