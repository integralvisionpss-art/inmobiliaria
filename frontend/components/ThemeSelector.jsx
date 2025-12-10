'use client';
import React from 'react';
import { useTheme } from './ThemeProvider';

export default function ThemeSelector() {
  const { theme, setTheme, THEMES } = useTheme();

  return (
    <div className="flex items-center gap-2">
      {THEMES.map(t => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={`px-3 py-1 rounded-full text-sm border ${
            theme === t ? 'border-primary font-semibold' : 'border-transparent'
          }`}
        >
          {t === 'airbnb' ? 'Claro' : t === 'dark' ? 'Oscuro' : 'Azul'}
        </button>
      ))}
    </div>
  );
}
