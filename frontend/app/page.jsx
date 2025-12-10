import PropertyCard from '../components/PropertyCard';
import api from '../lib/api';

export default async function Home() {
  // En SSG: llamar al backend en build o usar fetch en client si hace falta.
  // Aquí extraemos pocas propiedades para demo via API (en SSR/SSG se ajusta).
  let properties = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/propiedades`);
    properties = await res.json();
  } catch (e) {
    properties = [];
  }

  return (
    <section>
      <h1 className="text-2xl font-bold mb-4">Propiedades</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {properties.length ? properties.map(p => (
          <PropertyCard key={p.id} property={p} />
        )) : (
          <p>No hay propiedades para mostrar.</p>
        )}
      </div>
    </section>
  );
}
