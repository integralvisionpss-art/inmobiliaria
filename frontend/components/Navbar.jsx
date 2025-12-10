'use client';
import Link from 'next/link';
import ThemeSelector from './ThemeSelector';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-card shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold">InmoWeb</Link>
          <nav className="hidden md:flex gap-3">
            <Link href="/propiedades" className="text-sm">Propiedades</Link>
            <Link href="/dashboard/vendedor" className="text-sm">Vendedor</Link>
            <Link href="/dashboard/admin" className="text-sm">Admin</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ThemeSelector />
          {user ? (
            <>
              <span className="text-sm">Hola, {user.nombre}</span>
              <button onClick={logout} className="text-sm underline">Salir</button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm">Ingresar</Link>
              <Link href="/register" className="text-sm">Registro</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
