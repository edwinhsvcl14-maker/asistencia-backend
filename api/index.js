const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); 

const app = express();

// ----------------------------------------------------
// 🔗 CONEXIÓN A LA BASE DE DATOS SUPABASE
// ----------------------------------------------------


// Manejo de errores de conexión inicial
pool.on('error', (err) => {
  console.error('¡Error fatal en la conexión de PostgreSQL!', err);
  // El proceso de Node.js podría salir si la conexión falla catastróficamente
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------
// ⭐️ RUTAS (ENDPOINTS)
// ----------------------------------------------------

// RUTA GET simple (Verificación de vida del servidor)
app.get('/', async (req, res) => {
    try {
        // Prueba rápida de conexión para saber que la BD responde
        const client = await pool.connect();
        client.release();
        res.send("✅ Backend de Asistencia funcionando y conectado a la BD.");
    } catch (error) {
        // Si hay un error, indica que Vercel está vivo pero la BD está fallando (Contraseña o Firewall)
        res.status(500).send(`🛑 Backend funcionando, pero la BD falló: ${error.message}`);
    }
});


// 1. RUTA POST: Validar DNI y Obtener Datos del Hermano (Llama a validar_hermano)
// Endpoint: /asistencia/validar
app.post('/asistencia/validar', async (req, res) => {
    const { dni } = req.body;
    
    if (!dni || dni.length !== 8) {
        return res.status(400).json({ success: false, message: "DNI no válido (Debe tener 8 caracteres)." });
    }

    try {
        // Llamar a la Función SQL (nombres en minúsculas por convención de PostgreSQL)
        const result = await pool.query('SELECT * FROM validar_hermano($1)', [dni]);

        if (result.rows.length > 0) {
            const hermano = result.rows[0];
            return res.status(200).json({ 
                success: true, 
                message: "DNI verificado",
                data: { 
                    nombre: hermano.nombre_hermano, 
                    dni: hermano.dni_hermano, 
                    grupo: hermano.nombre_grupo 
                } 
            });
        } else {
            // La función devuelve una tabla vacía si no existe el DNI
            return res.status(404).json({ success: false, message: "DNI de Hermano no registrado." });
        }
    } catch (error) {
        // Manejo de errores SQL (ej: la función no existe, o error interno)
        console.error("Error al validar DNI o al invocar función SQL:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: "Error interno del servidor de Base de Datos al validar.", 
            details: error.message 
        });
    }
});


// 2. RUTA POST: Registrar Asistencia (Llama a registrar_asistencia_entrada)
// Endpoint: /asistencia/registrar
app.post('/asistencia/registrar', async (req, res) => {
    const { dni } = req.body;
    
    try {
        // Llamar a la Función SQL (nombres en minúsculas)
        const queryText = 'SELECT * FROM registrar_asistencia_entrada($1)';
        const result = await pool.query(queryText, [dni]);

        const nuevoRegistro = result.rows[0];

        return res.status(201).json({ 
            success: true, 
            message: `Asistencia registrada para ${nuevoRegistro.hermano_nombre}.`,
            registro: {
                id: nuevoRegistro.registro_id,
                dni: dni,
                nombre: nuevoRegistro.hermano_nombre,
                fecha: nuevoRegistro.fecha_registro,
                tipo: nuevoRegistro.tipo_registro
            }
        });
    } catch (error) {
        // Captura la excepción lanzada por el Stored Procedure (ej. "Hermano no existe.")
        console.error("Error al registrar asistencia:", error.message);
        
        // Si el error es una excepción de la BD (RAISE EXCEPTION)
        const errorMessage = error.message.includes('no existe') ? error.message : "Error fatal al registrar asistencia.";
        
        // Devolver 404 si el error es de "no existe" o 500 para fallos SQL
        if (errorMessage.includes('no existe')) {
             return res.status(404).json({ success: false, message: errorMessage });
        }
        
        return res.status(500).json({ success: false, message: errorMessage, details: error.message });
    }
});


// ⭐️ EXPORTACIÓN CLAVE PARA VERCEL ⭐️
module.exports = app;
