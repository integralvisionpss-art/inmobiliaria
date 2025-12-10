const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// Registro
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password, telefono, rol = 'cliente' } = req.body;
        
        // Verificar si el usuario existe
        const existe = await query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existe.length > 0) return res.status(400).json({ error: 'Email ya registrado' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Insertar usuario
        const result = await query(
            'INSERT INTO usuarios (nombre, email, password, telefono, rol) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, hash, telefono, rol]
        );

        // Generar token
        const token = jwt.sign(
            { id: result.insertId, email, rol },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            mensaje: 'Usuario registrado',
            usuario: { id: result.insertId, nombre, email, rol, telefono },
            token
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const usuarios = await query(
            'SELECT id, email, password, rol, nombre, telefono FROM usuarios WHERE email = ? AND activo = 1',
            [email]
        );
        
        if (usuarios.length === 0) return res.status(400).json({ error: 'Credenciales inválidas' });
        
        const usuario = usuarios[0];
        const valida = await bcrypt.compare(password, usuario.password);
        if (!valida) return res.status(400).json({ error: 'Credenciales inválidas' });

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

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

module.exports = router;