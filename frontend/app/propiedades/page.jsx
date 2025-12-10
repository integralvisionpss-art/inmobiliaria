'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function PropiedadesPage() {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarPropiedades();
  }, []);

  const cargarPropiedades = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/propiedades');
      setPropiedades(response.data);
    } catch (err) {
      setError('Error cargando propiedades');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Cargando propiedades...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ color: '#0070f3' }}>🏘️ Propiedades Disponibles</h1>
      <p>{propiedades.length} propiedades encontradas</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
        {propiedades.map((prop) => (
          <div key={prop.id} style={{ border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ height: '200px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span>🏠 Imagen de {prop.titulo}</span>
            </div>
            
            <div style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>{prop.titulo}</h3>
              <p style={{ color: '#666', margin: '0 0 10px 0' }}>{prop.ciudad}, {prop.barrio}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0070f3' }}>
                  ${prop.precio.toLocaleString()}
                </span>
                <span style={{ 
                  padding: '5px 10px', 
                  background: prop.operacion === 'venta' ? '#10b981' : '#3b82f6', 
                  color: 'white',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}>
                  {prop.operacion === 'venta' ? 'VENTA' : 'ALQUILER'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#666' }}>
                <span>🛏️ {prop.habitaciones} hab.</span>
                <span>🚿 {prop.baños} baños</span>
                <span>📐 {prop.metros_cuadrados} m²</span>
              </div>

              <a 
                href={`/propiedades/${prop.id}`}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '10px',
                  background: '#0070f3',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  marginTop: '15px'
                }}
              >
                Ver detalles
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
