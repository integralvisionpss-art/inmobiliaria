const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==================== MAPBOX ====================
const MAPBOX_API_KEY = process.env.MAPBOX_API_KEY || 'tu_token_mapbox';

// Geocodificación con Mapbox
app.post('/api/geocode/mapbox', async (req, res) => {
    try {
        const { direccion } = req.body;
        
        if (!direccion) {
            return res.status(400).json({ error: 'Dirección requerida' });
        }

        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(direccion)}.json?access_token=${MAPBOX_API_KEY}&limit=1&country=ar`
        );
        
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            
            res.json({
                success: true,
                latitud: feature.center[1],
                longitud: feature.center[0],
                direccion_completa: feature.place_name,
                contexto: feature.context
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'No se pudo geocodificar la dirección'
            });
        }
    } catch (error) {
        console.error('Error en geocodificación Mapbox:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Reverse geocoding (coordenadas → dirección)
app.post('/api/reverse-geocode', async (req, res) => {
    try {
        const { latitud, longitud } = req.body;
        
        if (!latitud || !longitud) {
            return res.status(400).json({ error: 'Coordenadas requeridas' });
        }

        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitud},${latitud}.json?access_token=${MAPBOX_API_KEY}&types=address`
        );
        
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
            res.json({
                success: true,
                direccion: data.features[0].place_name,
                caracteristicas: data.features[0]
            });
        } else {
            res.json({
                success: false,
                direccion: 'Dirección no disponible'
            });
        }
    } catch (error) {
        console.error('Error en reverse geocoding:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Buscar lugares cercanos
app.get('/api/lugares-cercanos', async (req, res) => {
    try {
        const { latitud, longitud, radio = 1000, tipos = 'poi' } = req.query;
        
        if (!latitud || !longitud) {
            return res.status(400).json({ error: 'Coordenadas requeridas' });
        }

        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitud},${latitud}.json?access_token=${MAPBOX_API_KEY}&types=${tipos}&limit=10&proximity=${longitud},${latitud}`
        );
        
        const data = await response.json();
        
        res.json({
            lugares: data.features || [],
            total: data.features ? data.features.length : 0
        });
    } catch (error) {
        console.error('Error buscando lugares cercanos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ==================== RUTAS EXISTENTES ====================

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        mensaje: '✅ API Inmobiliaria funcionando',
        version: '1.0.0',
        endpoints: {
            propiedades: '/api/propiedades',
            usuarios: '/api/usuarios/login y /api/usuarios/register',
            consultas: '/api/consultas',
            mapas: '/api/geocode/mapbox, /api/reverse-geocode, /api/lugares-cercanos'
        },
        base_de_datos: 'MySQL',
        mapas: 'Mapbox'
    });
});

// Ruta de propiedades (temporal - luego conectaremos a MySQL)
app.get('/api/propiedades', (req, res) => {
    const propiedades = [
        {
            id: 1,
            titulo: "Casa moderna con piscina",
            descripcion: "Hermosa casa de 3 dormitorios, amplio jardín y piscina",
            tipo: "casa",
            operacion: "venta",
            precio: 250000,
            ciudad: "Ciudad Ejemplo",
            barrio: "Residencial Norte",
            habitaciones: 3,
            baños: 2,
            metros_cuadrados: 180,
            latitud: -34.6037,
            longitud: -58.3816,
            foto_principal: "/placeholder.jpg"
        },
        {
            id: 2,
            titulo: "Departamento céntrico",
            descripcion: "Departamento completamente amueblado en zona comercial",
            tipo: "departamento",
            operacion: "alquiler",
            precio: 800,
            ciudad: "Ciudad Ejemplo",
            barrio: "Centro",
            habitaciones: 2,
            baños: 1,
            metros_cuadrados: 90,
            latitud: -34.6118,
            longitud: -58.4173,
            foto_principal: "/placeholder.jpg"
        }
    ];
    res.json(propiedades);
});

// Ruta para detalles de propiedad
app.get('/api/propiedades/:id', (req, res) => {
    const propiedad = {
        id: parseInt(req.params.id),
        titulo: "Casa moderna con piscina",
        descripcion: "Hermosa casa de 3 dormitorios, amplio jardín y piscina. Ideal para familia.",
        tipo: "casa",
        operacion: "venta",
        precio: 250000,
        ciudad: "Ciudad Ejemplo",
        barrio: "Residencial Norte",
        direccion: "Calle Principal 123",
        latitud: -34.6037,
        longitud: -58.3816,
        habitaciones: 3,
        baños: 2,
        metros_cuadrados: 180,
        antiguedad: 5,
        vendedor_nombre: "Carlos Vendedor",
        vendedor_telefono: "987654321",
        vendedor_email: "vendedor@inmo.com",
        fotos: [
            "/fotos/casa1-1.jpg",
            "/fotos/casa1-2.jpg",
            "/fotos/casa1-3.jpg"
        ],
        caracteristicas: [
            { caracteristica: "Piscina", valor: "Si" },
            { caracteristica: "Jardín", valor: "100m²" },
            { caracteristica: "Cocina", valor: "Equipada" },
            { caracteristica: "Garaje", valor: "2 autos" }
        ],
        fecha_creacion: "2024-01-15",
        destacada: true
    };
    res.json(propiedad);
});

// Ruta de login temporal
app.post('/api/usuarios/login', (req, res) => {
    const { email, password } = req.body;
    
    // Credenciales de prueba
    if (email === 'admin@inmo.com' && password === 'admin123') {
        res.json({
            mensaje: 'Login exitoso',
            usuario: {
                id: 1,
                nombre: 'Administrador',
                email: 'admin@inmo.com',
                rol: 'admin',
                telefono: '123456789'
            },
            token: 'token_de_prueba_jwt_123456'
        });
    } else if (email === 'vendedor@inmo.com' && password === 'admin123') {
        res.json({
            mensaje: 'Login exitoso',
            usuario: {
                id: 2,
                nombre: 'Carlos Vendedor',
                email: 'vendedor@inmo.com',
                rol: 'vendedor',
                telefono: '987654321'
            },
            token: 'token_de_prueba_jwt_789012'
        });
    } else {
        res.status(400).json({ error: 'Credenciales inválidas' });
    }
});

// Ruta de registro temporal
app.post('/api/usuarios/register', (req, res) => {
    const { nombre, email, password, telefono, rol = 'cliente' } = req.body;
    
    res.status(201).json({
        mensaje: 'Usuario registrado exitosamente',
        usuario: {
            id: 3,
            nombre,
            email,
            rol,
            telefono
        },
        token: 'token_de_prueba_jwt_345678'
    });
});

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// Puerto
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`✅ Backend corriendo en: http://localhost:${PORT}`);
    console.log(`📊 Endpoints disponibles:`);
    console.log(`   • http://localhost:${PORT}/`);
    console.log(`   • http://localhost:${PORT}/api/propiedades`);
    console.log(`   • http://localhost:${PORT}/api/usuarios/login`);
    console.log(`   • http://localhost:${PORT}/api/geocode/mapbox`);
    console.log(`   • http://localhost:${PORT}/api/lugares-cercanos`);
    console.log(`🔑 Credenciales de prueba:`);
    console.log(`   • Admin: admin@inmo.com / admin123`);
    console.log(`   • Vendedor: vendedor@inmo.com / admin123`);
    console.log(`🗺️  Mapas: Mapbox integrado`);
});