'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const THEMES = {
  airbnb: 'theme-airbnb',
  dark: 'theme-dark',
  blue: 'theme-blue'
};

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('airbnb');

  useEffect(() => {
    // Cargar preferencia guardada
    const saved = localStorage.getItem('inmo_theme');
    if (saved && THEMES[saved]) setTheme(saved);
  }, []);

  useEffect(() => {
    // Aplicar clase al documentElement
    const className = THEMES[theme] || THEMES.airbnb;
    const root = document.documentElement;
    // Remover clases previas
    Object.values(THEMES).forEach(c => root.classList.remove(c));
    root.classList.add(className);
    localStorage.setItem('inmo_theme', theme);
  }, [theme]);

  const value = { theme, setTheme, THEMES: Object.keys(THEMES) };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
