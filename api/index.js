const express = require('express');
const cors = require('cors');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const app = express();

// ----------------------------------------------------
// 🔗 CONEXIÓN A LA BASE DE DATOS SUPABASE (POSTGRES)
// ----------------------------------------------------
// Pool automáticamente leerá la variable de entorno POSTGRES_URL
// configurada en Vercel para establecer la conexión.


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------
// ⭐️ RUTAS (ENDPOINTS)
// ----------------------------------------------------

// RUTA GET simple (Verificación de vida del servidor)
app.get('/', (req, res) => {
    res.send("Backend de Asistencia funcionando y conectado a la BD.");
});

// 1. RUTA POST: Validar DNI y Obtener Datos del Hermano (Llama a validar_hermano)
// Endpoint: /asistencia/validar
app.post('/asistencia/validar', async (req, res) => {
    const { dni } = req.body;
    
    if (!dni || dni.length !== 8) {
        return res.status(400).json({ success: false, message: "DNI no válido (Debe tener 8 caracteres)." });
    }

    try {
        // Llamar a la Función SQL: validar_hermano
        const result = await pool.query('SELECT * FROM validar_hermano($1)', [dni]);

        if (result.rows.length > 0) {
            const hermano = result.rows[0];
            return res.status(200).json({ 
                success: true, 
                message: "DNI verificado",
                data: { 
                    nombre: hermano.nombre_hermano, 
                    dni: hermano.dni_hermano, 
                    grupo: hermano.nombre_grupo // Nombre de la Cuadrilla/Grupo
                } 
            });
        } else {
            // La función devuelve una tabla vacía si no existe el DNI
            return res.status(404).json({ success: false, message: "DNI de Hermano no registrado." });
        }
    } catch (error) {
        console.error("Error al validar DNI:", error);
        return res.status(500).json({ success: false, message: "Error interno del servidor de Base de Datos." });
    }
});

// 2. RUTA POST: Registrar Asistencia (Llama a registrar_asistencia_entrada)
// Endpoint: /asistencia/registrar
app.post('/asistencia/registrar', async (req, res) => {
    const { dni } = req.body;
    
    try {
        // Llamar a la Función SQL: registrar_asistencia_entrada
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
        // Capturar la excepción lanzada por el Stored Procedure (ej. "Hermano no existe.")
        const errorMessage = error.message.includes('no existe') ? error.message : "Error al registrar asistencia en BD.";
        console.error("Error SQL:", error);
        
        // Devolver 404 si el error es de "no existe"
        if (errorMessage.includes('no existe')) {
             return res.status(404).json({ success: false, message: errorMessage });
        }
        
        return res.status(500).json({ success: false, message: errorMessage });
    }
});


// ⭐️ EXPORTACIÓN CLAVE PARA VERCEL ⭐️
// Vercel requiere que exportes el objeto 'app' de Express
module.exports = app;
