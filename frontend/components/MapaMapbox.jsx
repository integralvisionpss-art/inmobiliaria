'use client';

import { useState, useCallback, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FaHome, FaSchool, FaHospital, FaTrain, FaShoppingCart } from 'react-icons/fa';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'tu_token_aqui';

const iconos = {
  propiedad: <FaHome className="text-blue-600" size={24} />,
  escuela: <FaSchool className="text-green-600" size={20} />,
  hospital: <FaHospital className="text-red-600" size={20} />,
  transporte: <FaTrain className="text-yellow-600" size={20} />,
  comercial: <FaShoppingCart className="text-orange-600" size={20} />
};

export default function MapaMapbox({ 
  propiedades = [],
  modo = 'vista',
  onLocationSelect,
  center = [-58.3816, -34.6037], // [lng, lat]
  zoom = 12
}) {
  const [viewport, setViewport] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom: zoom
  });
  
  const [selectedProp, setSelectedProp] = useState(null);
  const [lugaresCercanos, setLugaresCercanos] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  // Cargar lugares cercanos
  useEffect(() => {
    if (propiedades.length > 0) {
      cargarLugaresCercanos();
    }
  }, [propiedades]);

  const cargarLugaresCercanos = async () => {
    // Simulación - en realidad llamarías a tu backend
    const lugaresSimulados = [
      {
        id: 1,
        nombre: "Escuela Primaria",
        tipo: "escuela",
        coordenadas: [-58.3916, -34.5937]
      },
      {
        id: 2,
        nombre: "Hospital Central",
        tipo: "hospital", 
        coordenadas: [-58.3716, -34.6137]
      }
    ];
    setLugaresCercanos(lugaresSimulados);
  };

  const handleMapClick = useCallback((event) => {
    if (modo === 'selector' && onLocationSelect) {
      const { lng, lat } = event.lngLat;
      onLocationSelect(lat, lng);
      
      // Mover mapa a la ubicación seleccionada
      setViewport(v => ({
        ...v,
        longitude: lng,
        latitude: lat,
        zoom: 15
      }));
    }
  }, [modo, onLocationSelect]);

  const obtenerDireccion = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      return data.features[0]?.place_name || 'Dirección no disponible';
    } catch (error) {
      console.error('Error obteniendo dirección:', error);
      return 'Error al obtener dirección';
    }
  };

  const calcularRuta = async (desdeLat, desdeLng, hastaLat, hastaLng) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${desdeLng},${desdeLat};${hastaLng},${hastaLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      return data.routes[0];
    } catch (error) {
      console.error('Error calculando ruta:', error);
      return null;
    }
  };

  return (
    <div className="relative w-full h-96 rounded-xl overflow-hidden shadow-lg">
      <Map
        {...viewport}
        onMove={evt => setViewport(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleMapClick}
        attributionControl={false}
      >
        {/* Controles del mapa */}
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        <GeolocateControl
          position="top-right"
          trackUserLocation
          onGeolocate={(position) => {
            setUserLocation([position.coords.longitude, position.coords.latitude]);
          }}
        />

        {/* Marcadores de propiedades */}
        {propiedades.map((propiedad) => (
          <Marker
            key={propiedad.id}
            longitude={propiedad.longitud || propiedad.coordenadas?.[0] || center[0]}
            latitude={propiedad.latitud || propiedad.coordenadas?.[1] || center[1]}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedProp(propiedad);
            }}
          >
            <div className="relative">
              <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg transform hover:scale-110 transition-transform cursor-pointer">
                <FaHome size={20} />
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-white px-2 py-1 rounded shadow text-xs font-semibold">
                ${propiedad.precio?.toLocaleString() || 'Consultar'}
              </div>
            </div>
          </Marker>
        ))}

        {/* Marcadores de lugares cercanos */}
        {lugaresCercanos.map((lugar) => (
          <Marker
            key={`lugar-${lugar.id}`}
            longitude={lugar.coordenadas[0]}
            latitude={lugar.coordenadas[1]}
            anchor="bottom"
          >
            <div className="text-2xl">
              {iconos[lugar.tipo]}
            </div>
          </Marker>
        ))}

        {/* Ubicación del usuario */}
        {userLocation && (
          <Marker
            longitude={userLocation[0]}
            latitude={userLocation[1]}
            anchor="bottom"
          >
            <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
          </Marker>
        )}

        {/* Popup de propiedad seleccionada */}
        {selectedProp && (
          <Popup
            longitude={selectedProp.longitud || selectedProp.coordenadas?.[0]}
            latitude={selectedProp.latitud || selectedProp.coordenadas?.[1]}
            anchor="bottom"
            onClose={() => setSelectedProp(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="max-w-xs">
              <h3 className="font-bold text-lg">{selectedProp.titulo}</h3>
              <p className="text-gray-600 text-sm">{selectedProp.direccion}</p>
              <div className="mt-2 space-y-1">
                <p><strong>Precio:</strong> ${selectedProp.precio?.toLocaleString()}</p>
                <p><strong>Tipo:</strong> {selectedProp.tipo}</p>
                <p><strong>Operación:</strong> {selectedProp.operacion}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <a
                  href={`/propiedades/${selectedProp.id}`}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Ver detalles
                </a>
                <button
                  onClick={() => {
                    const url = `https://www.openstreetmap.org/directions?from=&to=${selectedProp.latitud},${selectedProp.longitud}`;
                    window.open(url, '_blank');
                  }}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  Cómo llegar
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Leyenda */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <h4 className="font-semibold text-sm mb-2">Leyenda:</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
            <span>Propiedades</span>
          </div>
          <div className="flex items-center gap-2">
            <FaSchool className="text-green-600" size={14} />
            <span>Escuelas</span>
          </div>
          <div className="flex items-center gap-2">
            <FaHospital className="text-red-600" size={14} />
            <span>Hospitales</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Tu ubicación</span>
          </div>
        </div>
      </div>

      {/* Modo selector */}
      {modo === 'selector' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg">
          <span className="font-semibold">Haz clic en el mapa para seleccionar ubicación</span>
        </div>
      )}
    </div>
  );
}