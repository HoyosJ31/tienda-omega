// ============================================================
// TIENDA OMEGA - Conexión a la base de datos
// Equivalente a db.php
// Usa mysql2/promise para poder usar async/await en las consultas
// ============================================================

const mysql = require('mysql2/promise');

// Equivalente a las variables $host, $dbname, $user, $password de db.php
const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    database: process.env.DB_NAME     || 'tienda_omega',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',    // Vacía por defecto en XAMPP/WAMP
    waitForConnections: true,
    connectionLimit: 10   // Máximo de conexiones simultáneas en el pool
});

// Verificar conexión al arrancar (equivalente al try/catch de PDO en db.php)
pool.getConnection()
    .then(conn => {
        console.log('✅ Conectado a la base de datos MySQL');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Error de conexión a la BD:', err.message);
        process.exit(1); // Detener el servidor si no hay BD (equivalente al exit en PHP)
    });

module.exports = pool;
