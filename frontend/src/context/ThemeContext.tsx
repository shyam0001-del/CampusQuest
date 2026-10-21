import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'black' | 'white' | 'default';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('campusquest_theme');
    if (saved === 'black' || saved === 'white' || saved === 'default') {
      return saved as Theme;
    }
    // Per requirement: On first visit, use Default unless the project already has an explicit preference
    return 'default';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.remove('theme-black', 'theme-white', 'theme-default', 'dark');
    root.classList.add(`theme-${theme}`);

    // In black theme, also set .dark for any tailwind dark mode classes
    if (theme === 'black') {
      root.classList.add('dark');
    }

    localStorage.setItem('campusquest_theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      if (prev === 'default') return 'white';
      if (prev === 'white') return 'black';
      return 'default';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
