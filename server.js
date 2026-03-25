// ============================================================
// TIENDA OMEGA - Servidor Node.js con Express
// ============================================================

const express     = require('express');
const session     = require('express-session');
const bcrypt      = require('bcrypt');
const cors        = require('cors');
const path        = require('path');
const PDFDocument = require('pdfkit');
const db          = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
    secret: 'tienda_omega_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// ── Verificar sesión ─────────────────────────────────────────
app.get('/sesion', (req, res) => {
    if (req.session.usuario) {
        res.json({ logueado: true, usuario: req.session.usuario });
    } else {
        res.json({ logueado: false });
    }
});

// ── Login ────────────────────────────────────────────────────
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Email y contraseña son obligatorios' });

    try {
        const [rows] = await db.execute(
            'SELECT id, nombre, email, password FROM usuarios WHERE email = ?', [email]
        );
        const usuario = rows[0];
        if (!usuario || !(await bcrypt.compare(password, usuario.password)))
            return res.status(401).json({ success: false, message: 'Email o contraseña incorrectos' });

        req.session.usuario = { id: usuario.id, nombre: usuario.nombre, email: usuario.email };
        res.json({ success: true, message: 'Login exitoso', usuario: req.session.usuario });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ── Registro ─────────────────────────────────────────────────
app.post('/registro', async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password)
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ success: false, message: 'El email no es válido' });
    if (password.length < 6)
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });

    try {
        const [existe] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existe.length > 0)
            return res.status(409).json({ success: false, message: 'El email ya está registrado' });

        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)', [nombre, email, hash]
        );
        res.status(201).json({ success: true, message: 'Usuario registrado correctamente',
            usuario: { id: result.insertId, nombre, email } });
    } catch (err) {
        console.error('Error en registro:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ── Logout ───────────────────────────────────────────────────
app.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true, message: 'Sesión cerrada' }));
});

// ── Crear pedido + generar factura PDF ───────────────────────
app.post('/pedido', async (req, res) => {
    if (!req.session.usuario)
        return res.status(401).json({ success: false, message: 'Debes iniciar sesión' });

    const { carrito, idTransaccion } = req.body;
    const usuario = req.session.usuario;

    if (!carrito || carrito.length === 0)
        return res.status(400).json({ success: false, message: 'El carrito está vacío' });

    const subtotal  = carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
    const descuento = subtotal > 100000 ? subtotal * 0.10 : 0;
    const total     = subtotal - descuento;

    try {
        // Guardar pedido
        const [pedidoResult] = await db.execute(
            'INSERT INTO pedidos (usuario_id, total, id_transaccion) VALUES (?, ?, ?)',
            [usuario.id, total, idTransaccion]
        );
        const pedidoId = pedidoResult.insertId;

        for (const item of carrito) {
            await db.execute(
                'INSERT INTO pedido_items (pedido_id, producto_id, nombre_producto, precio, cantidad) VALUES (?, ?, ?, ?, ?)',
                [pedidoId, item.id, item.nombre, item.precio, item.cantidad]
            );
        }

        // Generar PDF
        const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="factura-${idTransaccion}.pdf"`);

        const doc   = new PDFDocument({ margin: 50, size: 'A4' });
        const AZUL  = '#1a1aff';
        const GRIS  = '#555555';
        const NEGRO = '#111111';
        const LINEA = '#dddddd';
        const pageW = doc.page.width - 100;

        doc.pipe(res);

        // Cabecera azul
        doc.rect(0, 0, doc.page.width, 90).fill(AZUL);
        doc.fillColor('white').fontSize(28).font('Helvetica-Bold').text('TIENDA OMEGA', 50, 25);
        doc.fontSize(10).font('Helvetica').text('Factura de Compra', 50, 58);
        doc.fillColor(NEGRO);

        // ID Transacción y fecha
        doc.y = 110;
        doc.fontSize(9).fillColor(GRIS).font('Helvetica').text('ID DE TRANSACCIÓN', 50, 110);
        doc.fontSize(10).fillColor(NEGRO).font('Helvetica-Bold').text(idTransaccion, 50, 122);
        doc.fontSize(9).fillColor(GRIS).font('Helvetica').text('FECHA', 350, 110);
        doc.fontSize(10).fillColor(NEGRO).font('Helvetica-Bold').text(fecha, 350, 122);

        // Línea separadora
        doc.moveTo(50, 150).lineTo(doc.page.width - 50, 150).strokeColor(LINEA).lineWidth(1).stroke();

        // Datos del cliente
        doc.y = 162;
        doc.fontSize(9).fillColor(GRIS).font('Helvetica').text('CLIENTE');
        doc.fontSize(12).fillColor(NEGRO).font('Helvetica-Bold').text(usuario.nombre);
        doc.fontSize(10).fillColor(GRIS).font('Helvetica').text(usuario.email);

        // Línea
        doc.y += 12;
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(LINEA).stroke();

        // Cabecera tabla
        const yT = doc.y + 8;
        doc.rect(50, yT, pageW, 22).fill('#f0f0f0');
        doc.fillColor(GRIS).fontSize(9).font('Helvetica-Bold');
        doc.text('PRODUCTO',    60,  yT + 7);
        doc.text('CANT.',       330, yT + 7);
        doc.text('PRECIO UNIT.',380, yT + 7);
        doc.text('SUBTOTAL',    470, yT + 7);
        doc.y = yT + 30;

        // Filas
        for (const item of carrito) {
            const y = doc.y;
            doc.fillColor(NEGRO).fontSize(10).font('Helvetica');
            doc.text(item.nombre,                          60,  y, { width: 260 });
            doc.text(String(item.cantidad),                330, y);
            doc.text(formatCOP(item.precio),               380, y);
            doc.text(formatCOP(item.precio * item.cantidad),470, y);
            doc.y = y + 20;
            doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
               .strokeColor(LINEA).lineWidth(0.5).stroke();
            doc.y += 5;
        }

        // Totales
        doc.y += 10;
        const fila = (label, valor, bold = false, color = NEGRO) => {
            const y = doc.y;
            doc.fillColor(GRIS).fontSize(10).font('Helvetica').text(label, 360, y);
            doc.fillColor(color).fontSize(10).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(valor, 470, y);
            doc.y = y + 18;
        };

        fila('Subtotal:', formatCOP(subtotal));
        if (descuento > 0) fila('Descuento (10%):', `-${formatCOP(descuento)}`, false, '#cc0000');
        doc.moveTo(360, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(AZUL).lineWidth(1).stroke();
        doc.y += 6;
        fila('TOTAL:', formatCOP(total), true, AZUL);

        // Pie
        doc.y = doc.page.height - 80;
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(LINEA).lineWidth(1).stroke();
        doc.y += 10;
        doc.fillColor(GRIS).fontSize(8).font('Helvetica')
           .text('Gracias por tu compra en Tienda Omega.', 50, doc.y, { align: 'center', width: pageW })
           .text('Este documento es la confirmación oficial de tu transacción.', { align: 'center', width: pageW });

        doc.end();

    } catch (err) {
        console.error('Error al crear pedido:', err);
        if (!res.headersSent)
            res.status(500).json({ success: false, message: 'Error al procesar el pedido' });
    }
});

function formatCOP(valor) {
    return '$' + valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

app.listen(PORT, () => console.log(`✅ Tienda Omega corriendo en http://localhost:${PORT}`));
