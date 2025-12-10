'use client';
import Link from 'next/link';

export default function PropertyCard({ property }) {
  return (
    <article className="bg-card rounded-lg shadow p-4">
      <div className="h-44 bg-gray-200 rounded-md mb-3 overflow-hidden">
        {/* img placeholder */}
        <img
          src={property?.mainImage || '/placeholder.png'}
          alt={property?.titulo}
          className="w-full h-full object-cover"
        />
      </div>

      <h3 className="text-lg font-semibold">{property?.titulo}</h3>
      <p className="text-sm text-muted">{property?.ciudad} • {property?.barrio}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-bold">${property?.precio}</span>
        <Link href={`/propiedades/${property?.id}`} className="text-sm underline">Ver</Link>
      </div>
    </article>
  );
}
