import React, { createContext, useContext, useState, ReactNode } from 'react';

type ScreenType = 'dashboard' | 'sos' | 'safety' | 'ai-analytics' | 'intelligent-routes' | 'risk-assessment' | 'map' | 'events' | 'language' | 'transport' | 'weather' | 'eco' | 'nearby-places' | 'history' | 'profile' | 'settings';

interface NavigationContextType {
  currentScreen: ScreenType;
  navigateTo: (screen: ScreenType) => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');

  const navigateTo = (screen: ScreenType) => {
    setCurrentScreen(screen);
  };

  const goBack = () => {
    setCurrentScreen('dashboard');
  };

  return (
    <NavigationContext.Provider value={{ currentScreen, navigateTo, goBack }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}