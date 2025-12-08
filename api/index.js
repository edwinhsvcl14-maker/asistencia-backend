const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); 

const app = express();

// ----------------------------------------------------
// 🔗 CONEXIÓN A LA BASE DE DATOS SUPABASE (CORRECCIÓN CRÍTICA)
// ----------------------------------------------------

// Prioriza DATABASE_URL (si la creaste manualmente), usa POSTGRES_URL como respaldo.
// Esto asegura que la URI con la contraseña correcta sea leída por el código.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error("CRITICAL ERROR: No se encontró la Cadena de Conexión (DATABASE_URL o POSTGRES_URL).");
    // Lanza un error para que Vercel sepa que no puede iniciar
    throw new Error("Falta la Cadena de Conexión de la Base de Datos. Revisa las variables de entorno.");
}

// Inicializamos el Pool, usando la cadena de conexión encontrada.
const pool = new Pool({
  connectionString: connectionString,
});

// Manejo de errores de conexión catastróficos
pool.on('error', (err) => {
  console.error('¡Error fatal en la conexión de PostgreSQL! El servidor web debe fallar.', err);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------
// ⭐️ RUTAS (ENDPOINTS)
// ----------------------------------------------------

// RUTA GET: Verificación de vida y conexión del servidor
app.get('/', async (req, res) => {
    try {
        // Prueba rápida de conexión
        const client = await pool.connect();
        client.release();
        res.status(200).send("✅ Backend de Asistencia funcionando y conectado a la BD.");
    } catch (error) {
        res.status(500).send(`🛑 Backend funcionando, pero la BD falló al conectar: ${error.message}`);
    }
});


// 1. RUTA POST: Validar DNI y Obtener Datos del Hermano
// Endpoint: /asistencia/validar
app.post('/asistencia/validar', async (req, res) => {
    const { dni } = req.body;
    
    if (!dni || dni.length !== 8) {
        return res.status(400).json({ success: false, message: "DNI no válido (Debe tener 8 caracteres)." });
    }

    try {
        // Llamada a la Función SQL
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
            return res.status(404).json({ success: false, message: "DNI de Hermano no registrado." });
        }
    } catch (error) {
        console.error("Error al validar DNI:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: "Error interno del servidor de Base de Datos al validar. Revise logs.", 
            details: error.message 
        });
    }
});


// 2. RUTA POST: Registrar Asistencia
// Endpoint: /asistencia/registrar
app.post('/asistencia/registrar', async (req, res) => {
    const { dni } = req.body;
    
    try {
        // Llamada a la Función SQL (se asume que devuelve JSON o un solo registro)
        const queryText = 'SELECT * FROM registrar_asistencia_entrada($1)';
        const result = await pool.query(queryText, [dni]);
        
        // Manejo del resultado, asumiendo que el primer registro contiene los datos
        const nuevoRegistro = result.rows[0].resultado || result.rows[0]; 

        return res.status(201).json({ 
            success: true, 
            message: `Asistencia registrada para ${nuevoRegistro.hermano_nombre || 'el hermano'}.`,
            registro: nuevoRegistro
        });
        
    } catch (error) {
        console.error("Error al registrar asistencia:", error.message);
        
        // Si la BD lanza la excepción "no existe"
        const errorMessage = error.message.includes('no existe') ? error.message : "Error fatal al registrar asistencia.";
        
        if (errorMessage.includes('no existe')) {
             return res.status(404).json({ success: false, message: errorMessage });
        }
        
        return res.status(500).json({ success: false, message: errorMessage, details: error.message });
    }
});


// ⭐️ EXPORTACIÓN CLAVE PARA VERCEL ⭐️
module.exports = app;
