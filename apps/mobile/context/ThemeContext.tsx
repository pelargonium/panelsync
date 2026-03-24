import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

type ThemeMode = 'light' | 'dark';

interface ThemeColors {
  bg: string;
  text: string;
  muted: string;
  border: string;
  selection: string;
  error: string;
}

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
  colors: ThemeColors;
  mono: string;
}

const light: ThemeColors = {
  bg: '#FAFAFA',
  text: '#111111',
  muted: '#777777',
  border: '#DDDDDD',
  selection: '#EEEEEE',
  error: '#CC4444',
};

const dark: ThemeColors = {
  bg: '#111111',
  text: '#DDDDDD',
  muted: '#777777',
  border: '#333333',
  selection: '#222222',
  error: '#CC4444',
};

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  toggle: () => {},
  colors: dark,
  mono,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const toggle = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), []);
  const colors = mode === 'dark' ? dark : light;

  return (
    <ThemeContext.Provider value={{ mode, toggle, colors, mono }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}