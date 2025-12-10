// backend/rutas-basicas.js
module.exports = function(app) {
    // Propiedades
    app.get('/api/propiedades', (req, res) => {
        res.json([
            {
                id: 1,
                titulo: "Casa moderna con piscina",
                descripcion: "Hermosa casa de 3 dormitorios",
                tipo: "casa",
                operacion: "venta",
                precio: 250000,
                ciudad: "Ciudad Ejemplo",
                barrio: "Residencial Norte",
                habitaciones: 3,
                baños: 2,
                metros_cuadrados: 180,
                foto_principal: "/placeholder.jpg"
            }
        ]);
    });

    app.get('/api/propiedades/:id', (req, res) => {
        res.json({
            id: parseInt(req.params.id),
            titulo: "Casa moderna con piscina",
            descripcion: "Hermosa casa de 3 dormitorios",
            tipo: "casa",
            precio: 250000,
            ciudad: "Ciudad Ejemplo"
        });
    });

    // Usuarios
    app.post('/api/usuarios/login', (req, res) => {
        const { email, password } = req.body;
        if (email === 'admin@inmo.com' && password === 'admin123') {
            res.json({
                mensaje: 'Login exitoso',
                usuario: { id: 1, nombre: 'Admin', email, rol: 'admin' },
                token: 'token_jwt_prueba'
            });
        } else {
            res.status(400).json({ error: 'Credenciales inválidas' });
        }
    });

    app.post('/api/usuarios/register', (req, res) => {
        const { nombre, email, password, telefono } = req.body;
        res.status(201).json({
            mensaje: 'Usuario registrado',
            usuario: { id: 3, nombre, email, telefono, rol: 'cliente' },
            token: 'token_jwt_prueba'
        });
    });
};