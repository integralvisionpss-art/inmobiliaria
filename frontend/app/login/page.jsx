'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:4000/api/usuarios/login', {
        email,
        password
      });

      // Guardar token y usuario (en localStorage por ahora)
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.usuario));

      alert(`¡Bienvenido ${response.data.usuario.nombre}!`);
      
      // Redirigir según rol
      if (response.data.usuario.rol === 'admin') {
        router.push('/dashboard/admin');
      } else if (response.data.usuario.rol === 'vendedor') {
        router.push('/dashboard/vendedor');
      } else {
        router.push('/propiedades');
      }

    } catch (err) {
      setError(err.response?.data?.error || 'Error en el login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', color: '#0070f3' }}>🔑 Iniciar Sesión</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
            placeholder="admin@inmo.com"
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
            placeholder="admin123"
            required
          />
        </div>

        {error && (
          <div style={{ color: 'red', padding: '10px', background: '#ffe6e6', borderRadius: '5px' }}>
            ❌ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px',
            background: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Cargando...' : 'Ingresar'}
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <p>Credenciales de prueba:</p>
        <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', fontSize: '14px' }}>
          <p><strong>Admin:</strong> admin@inmo.com / admin123</p>
          <p><strong>Vendedor:</strong> vendedor@inmo.com / admin123</p>
        </div>
      </div>
    </div>
  );
}