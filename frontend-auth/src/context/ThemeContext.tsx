import React from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void; // toggles between light/dark
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined
);

const THEME_KEY = 'app_theme';

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;

  const isSystem = theme === 'system';
  if (isSystem) {
    // apply based on system preference
    const darkPref = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (darkPref) root.classList.add('dark');
    else root.classList.remove('dark');
  } else if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      return stored || 'system';
    } catch {
      return 'system';
    }
  });

  React.useEffect(() => {
    applyThemeClass(theme);

    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyThemeClass('system');
      mql.addEventListener ? mql.addEventListener('change', handler) : mql.addListener(handler);
      return () => {
        mql.removeEventListener ? mql.removeEventListener('change', handler) : mql.removeListener(handler);
      };
    }
    return;
  }, [theme]);

  const setTheme = (t: Theme) => {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
    setThemeState(t);
  };

  const toggle = React.useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
      applyThemeClass(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
