-- ============================================================
-- TIENDA OMEGA - Esquema de Base de Datos
-- ============================================================

CREATE DATABASE IF NOT EXISTS tienda_omega CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tienda_omega;

-- Tabla de usuarios registrados.
-- El campo password almacena el hash bcrypt (no texto plano), por eso necesita 255 chars.
-- El email tiene restricción UNIQUE para evitar cuentas duplicadas.
CREATE TABLE IF NOT EXISTS usuarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de pedidos completados.
-- id_transaccion guarda el ID generado en el frontend (ej: "TRX-1234567890-ABCDE").
-- ON DELETE CASCADE: si se elimina un usuario, sus pedidos también se borran.
CREATE TABLE IF NOT EXISTS pedidos (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id      INT NOT NULL,
    total           DECIMAL(10,2) NOT NULL,
    id_transaccion  VARCHAR(60) NOT NULL,
    creado_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Productos individuales de cada pedido.
-- nombre_producto y precio se guardan como snapshot del momento de la compra,
-- así el historial no cambia si el catálogo se actualiza en el futuro.
-- ON DELETE CASCADE: si se elimina el pedido padre, sus ítems también se borran.
CREATE TABLE IF NOT EXISTS pedido_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id       INT NOT NULL,
    producto_id     INT NOT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    precio          DECIMAL(10,2) NOT NULL,
    cantidad        INT NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);
