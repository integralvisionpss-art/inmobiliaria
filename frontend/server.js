const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

// ==================== MIDDLEWARES ====================
const autenticar = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Acceso denegado' });

        const verificada = jwt.verify(token, JWT_SECRET);
        
        // Verificar que el usuario aún existe en la BD
        const usuario = await db.query(
            'SELECT id, email, rol, nombre, telefono FROM usuarios WHERE id = ? AND activo = 1',
            [verificada.id]
        );
        
        if (!usuario[0]) return res.status(401).json({ error: 'Usuario no encontrado' });
        
        req.usuario = usuario[0];
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

const esAdmin = (req, res, next) => {
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Requiere rol de administrador' });
    }
    next();
};

const esVendedor = (req, res, next) => {
    if (req.usuario.rol !== 'vendedor' && req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Requiere rol de vendedor' });
    }
    next();
};

// ==================== RUTAS DE USUARIOS ====================
app.post('/api/usuarios/register', async (req, res) => {
    try {
        const { nombre, email, password, telefono, rol = 'cliente' } = req.body;
        
        // Validar email único
        const existe = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existe.length > 0) return res.status(400).json({ error: 'Email ya registrado' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Insertar usuario
        const result = await db.query(
            'INSERT INTO usuarios (nombre, email, password, telefono, rol) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, hash, telefono, rol]
        );

        // Generar token
        const token = jwt.sign(
            { id: result.insertId, email, rol },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Actualizar último login
        await db.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [result.insertId]);

        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            usuario: { id: result.insertId, nombre, email, rol, telefono },
            token
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.post('/api/usuarios/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Buscar usuario
        const usuarios = await db.query(
            'SELECT id, email, password, rol, nombre, telefono FROM usuarios WHERE email = ? AND activo = 1',
            [email]
        );
        
        if (usuarios.length === 0) return res.status(400).json({ error: 'Credenciales inválidas' });
        
        const usuario = usuarios[0];
        
        // Verificar contraseña
        const valida = await bcrypt.compare(password, usuario.password);
        if (!valida) return res.status(400).json({ error: 'Credenciales inválidas' });

        // Generar token
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, rol: usuario.rol },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Actualizar último login
        await db.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [usuario.id]);

        res.json({
            mensaje: 'Login exitoso',
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol,
                telefono: usuario.telefono
            },
            token
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.get('/api/usuarios/perfil', autenticar, (req, res) => {
    res.json(req.usuario);
});

// ==================== RUTAS DE PROPIEDADES ====================
app.get('/api/propiedades', async (req, res) => {
    try {
        const { 
            tipo, operacion, ciudad, barrio, 
            minPrecio, maxPrecio, minHabitaciones, 
            maxHabitaciones, destacada, vendedor_id,
            page = 1, limit = 12
        } = req.query;
        
        let whereClauses = ['p.estado = "disponible"'];
        let params = [];
        const offset = (page - 1) * limit;

        // Construir filtros
        if (tipo) {
            whereClauses.push('p.tipo = ?');
            params.push(tipo);
        }
        if (operacion) {
            whereClauses.push('p.operacion = ?');
            params.push(operacion);
        }
        if (ciudad) {
            whereClauses.push('p.ciudad LIKE ?');
            params.push(`%${ciudad}%`);
        }
        if (barrio) {
            whereClauses.push('p.barrio LIKE ?');
            params.push(`%${barrio}%`);
        }
        if (minPrecio) {
            whereClauses.push('p.precio >= ?');
            params.push(minPrecio);
        }
        if (maxPrecio) {
            whereClauses.push('p.precio <= ?');
            params.push(maxPrecio);
        }
        if (minHabitaciones) {
            whereClauses.push('p.habitaciones >= ?');
            params.push(minHabitaciones);
        }
        if (maxHabitaciones) {
            whereClauses.push('p.habitaciones <= ?');
            params.push(maxHabitaciones);
        }
        if (destacada) {
            whereClauses.push('p.destacada = ?');
            params.push(destacada === 'true' ? 1 : 0);
        }
        if (vendedor_id) {
            whereClauses.push('p.vendedor_id = ?');
            params.push(vendedor_id);
        }

        const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Consulta principal con fotos
        const propiedades = await db.query(`
            SELECT p.*, 
                   u.nombre as vendedor_nombre,
                   u.telefono as vendedor_telefono,
                   pf.url_foto as foto_principal
            FROM propiedades p
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            LEFT JOIN (
                SELECT propiedad_id, MIN(url_foto) as url_foto 
                FROM propiedad_fotos 
                GROUP BY propiedad_id
            ) pf ON p.id = pf.propiedad_id
            ${whereSQL}
            ORDER BY p.destacada DESC, p.fecha_creacion DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        // Contar total para paginación
        const totalResult = await db.query(`
            SELECT COUNT(*) as total 
            FROM propiedades p
            ${whereSQL}
        `, params);

        // Obtener fotos para cada propiedad
        for (let propiedad of propiedades) {
            const fotos = await db.query(
                'SELECT url_foto, descripcion FROM propiedad_fotos WHERE propiedad_id = ? ORDER BY orden',
                [propiedad.id]
            );
            propiedad.fotos = fotos.map(f => f.url_foto);
            
            const caracteristicas = await db.query(
                'SELECT caracteristica, valor FROM propiedad_caracteristicas WHERE propiedad_id = ?',
                [propiedad.id]
            );
            propiedad.caracteristicas = caracteristicas;
        }

        res.json({
            propiedades,
            paginacion: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult[0].total,
                totalPages: Math.ceil(totalResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error obteniendo propiedades:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.get('/api/propiedades/:id', async (req, res) => {
    try {
        const propiedadId = req.params.id;
        
        // Obtener propiedad principal
        const propiedades = await db.query(`
            SELECT p.*, 
                   u.nombre as vendedor_nombre,
                   u.email as vendedor_email,
                   u.telefono as vendedor_telefono,
                   u.avatar as vendedor_avatar
            FROM propiedades p
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
            WHERE p.id = ?
        `, [propiedadId]);
        
        if (propiedades.length === 0) {
            return res.status(404).json({ error: 'Propiedad no encontrada' });
        }
        
        const propiedad = propiedades[0];
        
        // Obtener fotos
        const fotos = await db.query(
            'SELECT id, url_foto, descripcion, orden FROM propiedad_fotos WHERE propiedad_id = ? ORDER BY orden',
            [propiedadId]
        );
        propiedad.fotos = fotos;
        
        // Obtener características
        const caracteristicas = await db.query(
            'SELECT caracteristica, valor FROM propiedad_caracteristicas WHERE propiedad_id = ?',
            [propiedadId]
        );
        propiedad.caracteristicas = caracteristicas;
        
        // Obtener propiedades similares
        const similares = await db.query(`
            SELECT p.*, pf.url_foto as foto_principal
            FROM propiedades p
            LEFT JOIN (
                SELECT propiedad_id, MIN(url_foto) as url_foto 
                FROM propiedad_fotos 
                GROUP BY propiedad_id
            ) pf ON p.id = pf.propiedad_id
            WHERE p.tipo = ? AND p.operacion = ? AND p.id != ? AND p.estado = 'disponible'
            LIMIT 4
        `, [propiedad.tipo, propiedad.operacion, propiedadId]);
        
        propiedad.similares = similares;
        
        // Contar visitas (podrías implementar una tabla de visitas)
        await db.query('UPDATE propiedades SET vistas = COALESCE(vistas, 0) + 1 WHERE id = ?', [propiedadId]);
        
        res.json(propiedad);
    } catch (error) {
        console.error('Error obteniendo propiedad:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.post('/api/propiedades', autenticar, esVendedor, async (req, res) => {
    try {
        const {
            titulo, descripcion, tipo, operacion, precio, ciudad, barrio,
            direccion, latitud, longitud, habitaciones, baños, metros_cuadrados,
            antiguedad, fotos, caracteristicas, moneda = 'USD'
        } = req.body;
        
        // Validar datos requeridos
        if (!titulo || !descripcion || !tipo || !operacion || !precio || !ciudad) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
        
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            // Insertar propiedad
            const [result] = await connection.execute(`
                INSERT INTO propiedades (
                    titulo, descripcion, tipo, operacion, precio, moneda,
                    ciudad, barrio, direccion, latitud, longitud,
                    habitaciones, baños, metros_cuadrados, antiguedad, vendedor_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                titulo, descripcion, tipo, operacion, precio, moneda,
                ciudad, barrio, direccion, latitud, longitud,
                habitaciones || 0, baños || 0, metros_cuadrados || 0,
                antigueded || 0, req.usuario.id
            ]);
            
            const propiedadId = result.insertId;
            
            // Insertar fotos si existen
            if (fotos && Array.isArray(fotos) && fotos.length > 0) {
                for (let i = 0; i < fotos.length; i++) {
                    await connection.execute(
                        'INSERT INTO propiedad_fotos (propiedad_id, url_foto, orden) VALUES (?, ?, ?)',
                        [propiedadId, fotos[i], i + 1]
                    );
                }
            }
            
            // Insertar características si existen
            if (caracteristicas && typeof caracteristicas === 'object') {
                for (const [key, value] of Object.entries(caracteristicas)) {
                    if (value) {
                        await connection.execute(
                            'INSERT INTO propiedad_caracteristicas (propiedad_id, caracteristica, valor) VALUES (?, ?, ?)',
                            [propiedadId, key, value]
                        );
                    }
                }
            }
            
            await connection.commit();
            connection.release();
            
            // Obtener propiedad completa
            const propiedad = await db.query(
                'SELECT * FROM propiedades WHERE id = ?',
                [propiedadId]
            );
            
            res.status(201).json({
                mensaje: 'Propiedad creada exitosamente',
                propiedad: propiedad[0]
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error creando propiedad:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ==================== RUTAS DASHBOARD ====================
app.get('/api/dashboard/vendedor/propiedades', autenticar, esVendedor, async (req, res) => {
    try {
        const propiedades = await db.query(`
            SELECT p.*, 
                   COUNT(DISTINCT pf.id) as total_fotos,
                   COUNT(DISTINCT c.id) as total_consultas,
                   (SELECT url_foto FROM propiedad_fotos WHERE propiedad_id = p.id ORDER BY orden LIMIT 1) as foto_principal
            FROM propiedades p
            LEFT JOIN propiedad_fotos pf ON p.id = pf.propiedad_id
            LEFT JOIN consultas c ON p.id = c.propiedad_id
            WHERE p.vendedor_id = ?
            GROUP BY p.id
            ORDER BY p.fecha_creacion DESC
        `, [req.usuario.id]);
        
        // Obtener estadísticas
        const estadisticas = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'disponible' THEN 1 ELSE 0 END) as disponibles,
                SUM(CASE WHEN estado = 'vendida' OR estado = 'alquilada' THEN 1 ELSE 0 END) as vendidas_alquiladas,
                SUM(CASE WHEN destacada = 1 THEN 1 ELSE 0 END) as destacadas
            FROM propiedades 
            WHERE vendedor_id = ?
        `, [req.usuario.id]);
        
        // Obtener consultas recientes
        const consultasRecientes = await db.query(`
            SELECT c.*, p.titulo as propiedad_titulo
            FROM consultas c
            JOIN propiedades p ON c.propiedad_id = p.id
            WHERE p.vendedor_id = ?
            ORDER BY c.fecha_consulta DESC
            LIMIT 10
        `, [req.usuario.id]);
        
        res.json({
            propiedades,
            estadisticas: estadisticas[0],
            consultasRecientes
        });
        
    } catch (error) {
        console.error('Error obteniendo dashboard vendedor:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.get('/api/dashboard/admin/estadisticas', autenticar, esAdmin, async (req, res) => {
    try {
        // Estadísticas generales
        const [totalPropiedades] = await db.query('SELECT COUNT(*) as total FROM propiedades');
        const [totalUsuarios] = await db.query('SELECT COUNT(*) as total FROM usuarios');
        const [totalConsultas] = await db.query('SELECT COUNT(*) as total FROM consultas');
        
        // Propiedades por tipo
        const propiedadesPorTipo = await db.query(`
            SELECT tipo, COUNT(*) as cantidad 
            FROM propiedades 
            GROUP BY tipo
            ORDER BY cantidad DESC
        `);
        
        // Propiedades por operación
        const propiedadesPorOperacion = await db.query(`
            SELECT operacion, COUNT(*) as cantidad 
            FROM propiedades 
            GROUP BY operacion
        `);
        
        // Usuarios por rol
        const usuariosPorRol = await db.query(`
            SELECT rol, COUNT(*) as cantidad 
            FROM usuarios 
            GROUP BY rol
        `);
        
        // Consultas por estado
        const consultasPorEstado = await db.query(`
            SELECT estado, COUNT(*) as cantidad 
            FROM consultas 
            GROUP BY estado
        `);
        
        // Propiedades recientes
        const propiedadesRecientes = await db.query(`
            SELECT p.*, u.nombre as vendedor_nombre
            FROM propiedades p
            JOIN usuarios u ON p.vendedor_id = u.id
            ORDER BY p.fecha_creacion DESC
            LIMIT 5
        `);
        
        res.json({
            totales: {
                propiedades: totalPropiedades[0].total,
                usuarios: totalUsuarios[0].total,
                consultas: totalConsultas[0].total
            },
            propiedadesPorTipo,
            propiedadesPorOperacion,
            usuariosPorRol,
            consultasPorEstado,
            propiedadesRecientes
        });
        
    } catch (error) {
        console.error('Error obteniendo estadísticas admin:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ==================== RUTAS DE CONSULTAS ====================
app.post('/api/consultas', async (req, res) => {
    try {
        const { propiedad_id, nombre, email, telefono, mensaje, usuario_id } = req.body;
        
        // Validar que la propiedad existe
        const propiedad = await db.query('SELECT id, vendedor_id FROM propiedades WHERE id = ?', [propiedad_id]);
        if (propiedad.length === 0) return res.status(404).json({ error: 'Propiedad no encontrada' });
        
        // Insertar consulta
        const result = await db.query(`
            INSERT INTO consultas (propiedad_id, usuario_id, nombre, email, telefono, mensaje)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [propiedad_id, usuario_id || null, nombre, email, telefono, mensaje]);
        
        res.status(201).json({
            mensaje: 'Consulta enviada exitosamente',
            consulta_id: result.insertId
        });
        
    } catch (error) {
        console.error('Error enviando consulta:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ==================== RUTAS DE FAVORITOS ====================
app.post('/api/favoritos', autenticar, async (req, res) => {
    try {
        const { propiedad_id } = req.body;
        
        // Verificar que la propiedad existe
        const propiedad = await db.query('SELECT id FROM propiedades WHERE id = ?', [propiedad_id]);
        if (propiedad.length === 0) return res.status(404).json({ error: 'Propiedad no encontrada' });
        
        // Verificar si ya está en favoritos
        const existe = await db.query(
            'SELECT id FROM favoritos WHERE usuario_id = ? AND propiedad_id = ?',
            [req.usuario.id, propiedad_id]
        );
        
        if (existe.length > 0) {
            // Eliminar de favoritos
            await db.query('DELETE FROM favoritos WHERE usuario_id = ? AND propiedad_id = ?', 
                [req.usuario.id, propiedad_id]);
            res.json({ mensaje: 'Eliminado de favoritos', favorito: false });
        } else {
            // Agregar a favoritos
            await db.query(
                'INSERT INTO favoritos (usuario_id, propiedad_id) VALUES (?, ?)',
                [req.usuario.id, propiedad_id]
            );
            res.json({ mensaje: 'Agregado a favoritos', favorito: true });
        }
        
    } catch (error) {
        console.error('Error gestionando favoritos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.get('/api/favoritos', autenticar, async (req, res) => {
    try {
        const favoritos = await db.query(`
            SELECT p.*, pf.url_foto as foto_principal
            FROM favoritos f
            JOIN propiedades p ON f.propiedad_id = p.id
            LEFT JOIN (
                SELECT propiedad_id, MIN(url_foto) as url_foto 
                FROM propiedad_fotos 
                GROUP BY propiedad_id
            ) pf ON p.id = pf.propiedad_id
            WHERE f.usuario_id = ?
            ORDER BY f.fecha_agregado DESC
        `, [req.usuario.id]);
        
        res.json(favoritos);
    } catch (error) {
        console.error('Error obteniendo favoritos:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ==================== RUTAS DE CHAT ====================
app.get('/api/chat/:destinatario_id', autenticar, async (req, res) => {
    try {
        const { destinatario_id } = req.params;
        
        const mensajes = await db.query(`
            SELECT m.*, 
                   u1.nombre as remitente_nombre,
                   u2.nombre as destinatario_nombre,
                   p.titulo as propiedad_titulo
            FROM mensajes_chat m
            JOIN usuarios u1 ON m.remitente_id = u1.id
            JOIN usuarios u2 ON m.destinatario_id = u2.id
            LEFT JOIN propiedades p ON m.propiedad_id = p.id
            WHERE (m.remitente_id = ? AND m.destinatario_id = ?)
               OR (m.remitente_id = ? AND m.destinatario_id = ?)
            ORDER BY m.fecha_envio ASC
        `, [req.usuario.id, destinatario_id, destinatario_id, req.usuario.id]);
        
        // Marcar mensajes como leídos
        await db.query(`
            UPDATE mensajes_chat 
            SET leido = 1 
            WHERE destinatario_id = ? AND remitente_id = ? AND leido = 0
        `, [req.usuario.id, destinatario_id]);
        
        res.json(mensajes);
    } catch (error) {
        console.error('Error obteniendo chat:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.post('/api/chat', autenticar, async (req, res) => {
    try {
        const { destinatario_id, mensaje, propiedad_id } = req.body;
        
        // Verificar que el destinatario existe
        const destinatario = await db.query('SELECT id FROM usuarios WHERE id = ?', [destinatario_id]);
        if (destinatario.length === 0) return res.status(404).json({ error: 'Destinatario no encontrado' });
        
        // Insertar mensaje
        const result = await db.query(`
            INSERT INTO mensajes_chat (remitente_id, destinatario_id, propiedad_id, mensaje)
            VALUES (?, ?, ?, ?)
        `, [req.usuario.id, destinatario_id, propiedad_id || null, mensaje]);
        
        res.status(201).json({
            mensaje: 'Mensaje enviado',
            mensaje_id: result.insertId
        });
        
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ==================== RUTAS DE SUBIDA DE FOTOS ====================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/propiedades';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'));
        }
    }
});

app.post('/api/upload', autenticar, esVendedor, upload.array('fotos', 20), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se subieron archivos' });
        }
        
        const urls = req.files.map(file => `/uploads/propiedades/${file.filename}`);
        
        res.json({
            mensaje: 'Fotos subidas exitosamente',
            fotos: urls,
            total: req.files.length
        });
        
    } catch (error) {
        console.error('Error subiendo fotos:', error);
        res.status(500).json({ error: 'Error subiendo fotos' });
    }
});

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// ==================== INICIAR SERVIDOR ====================
app.get('/', (req, res) => {
    res.json({ 
        mensaje: 'API Inmobiliaria con MySQL',
        version: '2.0.0',
        base_de_datos: 'MySQL',
        rutas_disponibles: [
            'POST /api/usuarios/register',
            'POST /api/usuarios/login',
            'GET  /api/propiedades',
            'GET  /api/propiedades/:id',
            'POST /api/consultas',
            'POST /api/favoritos',
            'GET  /api/chat/:destinatario_id',
            'POST /api/chat',
            'POST /api/upload (vendedor/admin)'
        ]
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, async () => {
    console.log(`✅ Backend con MySQL corriendo en http://localhost:${PORT}`);
    console.log(`📊 Base de datos: ${process.env.DB_NAME || 'inmobiliaria_db'}`);
    console.log(`🔑 Usuarios demo:`);
    console.log(`   Admin: admin@inmo.com / admin123`);
    console.log(`   Vendedor: vendedor@inmo.com / admin123`);
    console.log(`📁 Uploads: http://localhost:${PORT}/uploads/`);
});