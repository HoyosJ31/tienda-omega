const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    database: process.env.DB_NAME     || 'tienda_omega',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10
});

pool.getConnection()
    .then(conn => {
        console.log('✅ Conectado a la base de datos MySQL');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Error de conexión a la BD:', err.message);
        process.exit(1);
    });

module.exports = pool;
