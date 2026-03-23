'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

type Theme = 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'light') {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    } else {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      if (!stored) localStorage.setItem('theme', 'dark');
    }
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 p-1 bg-secondary rounded-full w-[72px] h-9 animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-secondary/80 backdrop-blur-md rounded-full border border-border/50 shadow-inner">
      <button
        onClick={() => handleThemeChange('light')}
        className={`p-1.5 rounded-full transition-all duration-300 ${
          theme === 'light'
            ? 'bg-card text-card-foreground text-orange-500 shadow-md scale-100'
            : 'text-muted-foreground hover:text-foreground scale-90 opacity-70'
        }`}
        title="Light mode"
        aria-label="Light mode"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleThemeChange('dark')}
        className={`p-1.5 rounded-full transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-slate-800 text-indigo-400 shadow-md scale-100'
            : 'text-muted-foreground hover:text-foreground scale-90 opacity-70'
        }`}
        title="Dark mode"
        aria-label="Dark mode"
      >
        <Moon className="w-4 h-4" />
      </button>
    </div>
  );
}
