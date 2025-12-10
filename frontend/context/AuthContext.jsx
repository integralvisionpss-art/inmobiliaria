'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const saved = Cookies.get('inmo_token');
    if (saved) {
      setToken(saved);
      // Si quieres, puedes validar el token pidiendo perfil al backend
      fetchPerfil(saved);
    }
  }, []);

  const fetchPerfil = async (tkn) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/usuarios/perfil`, {
        headers: { Authorization: `Bearer ${tkn}` }
      });
      setUser(res.data);
    } catch (e) {
      console.log('No session');
      logout();
    }
  };

  const login = async ({ email, password }) => {
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/usuarios/login`, {
      email, password
    });
    const tkn = res.data.token;
    Cookies.set('inmo_token', tkn, { expires: 7 });
    setToken(tkn);
    setUser(res.data.usuario);
    return res.data;
  };

  const logout = () => {
    Cookies.remove('inmo_token');
    setToken(null);
    setUser(null);
  };

  const value = { user, token, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
AuthContext