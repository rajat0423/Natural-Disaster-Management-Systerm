import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEME_TOKENS = {
  dark: {
    name: 'dark',
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    bgCard: '#1e293b',
    bgCardHover: '#283548',
    border: '#334155',
    borderLight: '#475569',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#f97316',
    accentHover: '#ea580c',
    accentSubtle: 'rgba(249, 115, 22, 0.15)',
    panelBg: 'rgba(15, 23, 42, 0.95)',
    mapOverlayBg: 'rgba(30, 41, 59, 0.95)',
    badgeBg: '#1e293b',
    badgeBorder: '#334155',
    tableHeaderBg: '#1e293b',
    tableRowEven: '#0f172a',
    tableRowOdd: '#162033',
    tableRowHover: '#1e293b',
    inputBg: '#0f172a',
    inputBorder: '#334155',
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.24)'
  },
  light: {
    name: 'light',
    bgPrimary: '#f8fafc',
    bgSecondary: '#ffffff',
    bgTertiary: '#f1f5f9',
    bgCard: '#ffffff',
    bgCardHover: '#f8fafc',
    border: '#cbd5e1',
    borderLight: '#94a3b8',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    accent: '#ea580c',
    accentHover: '#c2410c',
    accentSubtle: 'rgba(234, 88, 12, 0.12)',
    panelBg: 'rgba(255, 255, 255, 0.97)',
    mapOverlayBg: 'rgba(255, 255, 255, 0.97)',
    badgeBg: '#e2e8f0',
    badgeBorder: '#cbd5e1',
    tableHeaderBg: '#f1f5f9',
    tableRowEven: '#ffffff',
    tableRowOdd: '#f8fafc',
    tableRowHover: '#e2e8f0',
    inputBg: '#ffffff',
    inputBorder: '#cbd5e1',
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06)'
  }
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('dras_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('dras_theme', theme);
    } catch (e) {}
    document.documentElement.setAttribute('data-theme', theme);
    if (document.body) {
      document.body.style.backgroundColor = THEME_TOKENS[theme].bgPrimary;
      document.body.style.color = THEME_TOKENS[theme].textPrimary;
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const tokens = THEME_TOKENS[theme];
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark, tokens }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'dark',
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: true,
      tokens: THEME_TOKENS.dark
    };
  }
  return context;
};

export default ThemeContext;
