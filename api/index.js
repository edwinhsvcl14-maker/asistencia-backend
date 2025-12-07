const express = require('express');
const cors = require('cors'); 
const app = express();

// ... (El resto de tus arrays de datos y middlewares) ...

// Base de datos de empleados
const empleadosDB = [
    { dni: "12345678", nombre: "Ana García", existe: true }, 
    { dni: "87654321", nombre: "Luis Pérez", existe: true },
];
// Base de datos de registros (solo se guarda en memoria mientras Vercel está activo)
const asistenciaDB = []; 

// Middleware
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// ⭐️ Rutas (endpoints) ⭐️

// RUTA GET simple
app.get('/', (req, res) => {
    res.send("Backend de Asistencia funcionando en Vercel.");
});

// RUTA POST: Validar DNI y Obtener Datos
app.post('/asistencia/validar', (req, res) => {
    const { dni } = req.body;

    if (!dni || dni.length !== 8) {
        return res.status(400).json({ success: false, message: "DNI no válido." });
    }

    const empleado = empleadosDB.find(emp => emp.dni === dni);

    if (empleado) {
        return res.status(200).json({ 
            success: true, 
            message: "DNI verificado",
            data: { nombre: empleado.nombre, dni: empleado.dni }
        });
    } else {
        return res.status(404).json({ success: false, message: "DNI no registrado." });
    }
});

// RUTA POST: Registrar Asistencia
app.post('/asistencia/registrar', (req, res) => {
    const { dni } = req.body;

    // ... (la misma lógica de validación y registro que en el server.js original) ...
    const empleado = empleadosDB.find(emp => emp.dni === dni);
    
    if (!empleado) {
        return res.status(404).json({ success: false, message: "Registro fallido: Empleado no existe." });
    }

    const nuevoRegistro = {
        dni: empleado.dni,
        nombre: empleado.nombre,
        fecha: new Date().toISOString(),
        tipo: 'ENTRADA'
    };

    asistenciaDB.push(nuevoRegistro);
    
    return res.status(201).json({ 
        success: true, 
        message: `Asistencia registrada para ${empleado.nombre}.`,
        registro: nuevoRegistro
    });
});


// ⭐️ EXPORTACIÓN CLAVE PARA VERCEL ⭐️
// Vercel requiere que exportes el objeto 'app' de Express
module.exports = app;
