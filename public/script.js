/* ============================================================
   TIENDA OMEGA - JavaScript Unificado
   ============================================================ */

/* ============================================================
   PRODUCTOS
   Catálogo estático definido en el frontend.
   Precios en pesos colombianos (sin punto decimal).
   ============================================================ */
const productosOmega = [
    { id: 1,  nombre: "Visor VR Quantum",          precio: 599000,  categoria: "Realidad Virtual",  imagen: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?q=80&w=400" },
    { id: 2,  nombre: "Consola PS5 Pro",            precio: 699000,  categoria: "Consolas",           imagen: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=400" },
    { id: 3,  nombre: "Xbox Series X Edition",      precio: 499000,  categoria: "Consolas",           imagen: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?q=80&w=400" },
    { id: 4,  nombre: "Nintendo Switch OLED",       precio: 349000,  categoria: "Consolas",           imagen: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?q=80&w=400" },
    { id: 5,  nombre: "Laptop MSI Raider",          precio: 2400000, categoria: "Computadores",       imagen: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=400" },
    { id: 6,  nombre: "GPU RTX 4090",               precio: 1600000, categoria: "Componentes",        imagen: "https://images.unsplash.com/photo-1591488320449-011701bb6704?q=80&w=400" },
    { id: 7,  nombre: "Teclado Mecánico RGB",       precio: 120000,  categoria: "Periféricos",        imagen: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=400" },
    { id: 8,  nombre: "Mouse Gamer 25k DPI",        precio: 85000,   categoria: "Periféricos",        imagen: "https://images.unsplash.com/photo-1527814050087-3793815479db?q=80&w=400" },
    { id: 9,  nombre: "Monitor 4K 144Hz",           precio: 450000,  categoria: "Componentes",        imagen: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=400" },
    { id: 10, nombre: "Clave Digital: Elden Ring",  precio: 60000,   categoria: "Claves Digitales",   imagen: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400" },
    { id: 11, nombre: "Escritorio Elevable RGB",    precio: 850000,  categoria: "Muebles Gaming",     imagen: "https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=400" },
    { id: 12, nombre: "Auriculares Espaciales 7.1", precio: 210000,  categoria: "Periféricos",        imagen: "https://images.pexels.com/photos/3394651/pexels-photo-3394651.jpeg?auto=compress&cs=tinysrgb&w=400" }
];

const CONFIG = {
    DESCUENTO_MINIMO:    100000,
    PORCENTAJE_DESCUENTO: 0.10
};

/* ============================================================
   ESTADO DE SESIÓN
   ============================================================ */
let usuarioActual = null;

// Consulta sesion.php al cargar la página para restaurar el estado de login
// si el usuario ya tenía una sesión activa en el servidor.
async function verificarSesion() {
    try {
        const res = await fetch('/sesion');
        const data = await res.json();
        if (data.logueado) {
            usuarioActual = data.usuario;
            mostrarNavUsuario(data.usuario.nombre);
            renderizarCatalogo(); // Actualiza botones al restaurar sesión
        }
    } catch (e) {
        // Sin servidor PHP activo (ej: abriendo el HTML directamente), no hace nada
    }
}

function mostrarNavUsuario(nombre) {
    document.getElementById('nav-guest').style.display = 'none';
    document.getElementById('nav-user').style.display  = 'flex';
    document.getElementById('saludo-usuario').textContent = `Hola, ${nombre}`;
}

function mostrarNavGuest() {
    document.getElementById('nav-guest').style.display = 'flex';
    document.getElementById('nav-user').style.display  = 'none';
    usuarioActual = null;
    renderizarCatalogo(); // Vuelve a mostrar botones de "Inicia Sesión"
}

/* ============================================================
   CATÁLOGO
   ============================================================ */
function renderizarCatalogo() {
    const grid = document.getElementById('contenedor_productos');
    grid.innerHTML = '';

    productosOmega.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card_omega';
        card.innerHTML = `
            <div class="imagen_container">
                <img src="${p.imagen}" alt="${p.nombre}" loading="lazy">
            </div>
            <div class="info_omega">
                <span class="tag-categoria">${p.categoria}</span>
                <h3>${p.nombre}</h3>
                <p class="precio">$${formatearMoneda(p.precio)}</p>
                <button class="btn-agregar" onclick="agregarAlCarrito(${p.id})">
                    ${usuarioActual ? '+ Añadir al Carrito' : '🔒 Inicia Sesión'}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

/* ============================================================
   CARRITO
   Se persiste en localStorage para sobrevivir recargas de página.
   ============================================================ */
function getCarrito() {
    return JSON.parse(localStorage.getItem('carrito')) || [];
}

function setCarrito(c) {
    localStorage.setItem('carrito', JSON.stringify(c));
}

function agregarAlCarrito(id) {
    // 🔒 Bloquear si no hay sesión activa
    if (!usuarioActual) {
        mostrarToast('⚠️ Debes iniciar sesión para agregar productos');
        abrirModal('modal-login');
        return;
    }

    const producto = productosOmega.find(p => p.id === id);
    const carrito  = getCarrito();
    const existe   = carrito.find(p => p.id === id);

    if (existe) {
        existe.cantidad += 1;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }

    setCarrito(carrito);
    actualizarContador();
    actualizarCarritoUI();
    mostrarToast(`✔ ${producto.nombre}`);
    abrirCarrito();
}

// delta = +1 para aumentar, -1 para disminuir.
// Si la cantidad llega a 0, el ítem se elimina del array.
function cambiarCantidad(index, delta) {
    const carrito = getCarrito();
    carrito[index].cantidad += delta;
    if (carrito[index].cantidad <= 0) {
        carrito.splice(index, 1);
    }
    setCarrito(carrito);
    actualizarCarritoUI();
    actualizarContador();
}

function eliminarDelCarrito(index) {
    const carrito = getCarrito();
    carrito.splice(index, 1);
    setCarrito(carrito);
    actualizarCarritoUI();
    actualizarContador();
}

function actualizarCarritoUI() {
    const carrito     = getCarrito();
    const contenedor  = document.getElementById('items-c');
    const btnCheckout = document.getElementById('btn-checkout');

    if (carrito.length === 0) {
        contenedor.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon pulse">📦</div>
                <p>No hay loot en tu inventario</p>
            </div>`;
        btnCheckout.disabled = true;
    } else {
        contenedor.innerHTML = carrito.map((prod, i) => `
            <div class="cart-item">
                <div class="item-details">
                    <span class="item-name">${prod.nombre}</span>
                    <span class="item-price">$${formatearMoneda(prod.precio)}</span>
                </div>
                <div class="item-actions">
                    <div class="quantity-controls">
                        <button class="btn-qty" onclick="cambiarCantidad(${i}, -1)">−</button>
                        <span class="qty">${prod.cantidad}</span>
                        <button class="btn-qty" onclick="cambiarCantidad(${i}, 1)">+</button>
                    </div>
                    <span class="item-total digital-font">$${formatearMoneda(prod.precio * prod.cantidad)}</span>
                    <button class="btn-delete" onclick="eliminarDelCarrito(${i})">✖</button>
                </div>
            </div>
        `).join('');
        btnCheckout.disabled = false;
    }

    calcularTotales(carrito);
}

function calcularTotales(carrito) {
    const subtotal = carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
    // El descuento solo aplica si el subtotal supera el mínimo configurado
    const descuento = subtotal > CONFIG.DESCUENTO_MINIMO ? subtotal * CONFIG.PORCENTAJE_DESCUENTO : 0;
    const total    = subtotal - descuento;

    document.getElementById('subtotal-c').textContent  = `$${formatearMoneda(subtotal)}`;
    document.getElementById('descuento-c').textContent = `-$${formatearMoneda(descuento)}`;
    document.getElementById('total-c').textContent     = `$${formatearMoneda(total)}`;
}

function actualizarContador() {
    const carrito = getCarrito();
    const total   = carrito.reduce((acc, p) => acc + p.cantidad, 0);
    document.getElementById('contador-carrito').textContent = total;
}

async function irAPagar() {
    // 🔒 Bloquear si no hay sesión activa
    if (!usuarioActual) {
        mostrarToast('⚠️ Debes iniciar sesión para comprar');
        abrirModal('modal-login');
        return;
    }

    const carrito = getCarrito();
    if (!carrito.length) { alert('⚠️ El carrito está vacío'); return; }

    const btn   = document.getElementById('btn-checkout');
    btn.disabled    = true;
    btn.textContent = 'Procesando...';

    const idTrx = 'TRX-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    try {
        // Enviar pedido al servidor y recibir el PDF como blob
        const res = await fetch('/pedido', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ carrito, idTransaccion: idTrx })
        });

        if (!res.ok) {
            const err = await res.json();
            mostrarToast('❌ ' + err.message);
            return;
        }

        // Convertir la respuesta en un archivo descargable
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `factura-${idTrx}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        mostrarToast('✅ ¡Compra exitosa! Descargando factura...');
        setCarrito([]);
        actualizarCarritoUI();
        actualizarContador();
        cerrarCarrito();

    } catch (e) {
        mostrarToast('❌ No se pudo conectar al servidor');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Iniciar Transacción';
    }
}

/* ============================================================
   TOGGLE CARRITO
   Controla el panel lateral añadiendo/quitando la clase "abierto"
   y ajustando el margen del catálogo para evitar solapamiento.
   ============================================================ */
function abrirCarrito() {
    document.getElementById('carrito-aside').classList.add('abierto');
    document.getElementById('catalogo-main').classList.add('con-carrito');
}

function cerrarCarrito() {
    document.getElementById('carrito-aside').classList.remove('abierto');
    document.getElementById('catalogo-main').classList.remove('con-carrito');
}

function toggleCarrito() {
    const aside = document.getElementById('carrito-aside');
    if (aside.classList.contains('abierto')) {
        cerrarCarrito();
    } else {
        actualizarCarritoUI();
        abrirCarrito();
    }
}

/* ============================================================
   MODALES
   Se muestran/ocultan añadiendo/quitando la clase CSS "activo".
   ============================================================ */
function abrirModal(id) {
    document.getElementById(id).classList.add('activo');
    const msg = document.querySelector(`#${id} .form-msg`);
    if (msg) { msg.textContent = ''; msg.className = 'form-msg'; }
}

function cerrarModal(id) {
    document.getElementById(id).classList.remove('activo');
}

function cambiarModal(cerrar, abrir) {
    cerrarModal(cerrar);
    abrirModal(abrir);
}

// Cerrar modal al hacer clic en el fondo oscuro (fuera de la tarjeta)
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('activo');
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.activo')
            .forEach(m => m.classList.remove('activo'));
    }
});

/* ============================================================
   LOGIN
   ============================================================ */
async function hacerLogin() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value.trim();
    const msg      = document.getElementById('login-msg');
    const btn      = document.getElementById('btn-login');

    if (!email || !password) {
        setMsg(msg, 'Completa todos los campos', 'error'); return;
    }

    // Deshabilitar el botón durante la petición para evitar doble envío
    btn.disabled = true;
    btn.textContent = 'Ingresando...';

    try {
        const res  = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            setMsg(msg, '¡Bienvenido!', 'success');
            usuarioActual = data.usuario;
            mostrarNavUsuario(data.usuario.nombre);
            renderizarCatalogo(); // Actualiza botones del catálogo tras login
            setTimeout(() => cerrarModal('modal-login'), 900);
        } else {
            setMsg(msg, data.message, 'error');
        }
    } catch (e) {
        setMsg(msg, 'No se pudo conectar al servidor', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Ingresar';
}

/* ============================================================
   REGISTRO
   ============================================================ */
async function hacerRegistro() {
    const nombre   = document.getElementById('reg-nombre').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value.trim();
    const msg      = document.getElementById('reg-msg');
    const btn      = document.getElementById('btn-registro');

    if (!nombre || !email || !password) {
        setMsg(msg, 'Completa todos los campos', 'error'); return;
    }

    btn.disabled = true;
    btn.textContent = 'Creando cuenta...';

    try {
        const res  = await fetch('/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password })
        });
        const data = await res.json();

        if (data.success) {
            setMsg(msg, '¡Cuenta creada! Ahora inicia sesión', 'success');
            // Redirigir automáticamente al modal de login tras registro exitoso
            setTimeout(() => cambiarModal('modal-registro', 'modal-login'), 1400);
        } else {
            setMsg(msg, data.message, 'error');
        }
    } catch (e) {
        setMsg(msg, 'No se pudo conectar al servidor', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Crear Cuenta';
}

/* ============================================================
   CERRAR SESIÓN
   ============================================================ */
async function cerrarSesion() {
    try {
        await fetch('/logout', { method: 'POST' });
    } catch (e) {}
    mostrarNavGuest(); // Llama renderizarCatalogo() internamente
    mostrarToast('Sesión cerrada');
}

/* ============================================================
   UTILIDADES
   ============================================================ */
function formatearMoneda(v) {
    return v.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function setMsg(el, texto, tipo) {
    el.textContent = texto;
    el.className   = `form-msg ${tipo}`;
}

// clearTimeout cancela el timer anterior si se llama de nuevo antes de que expire,
// evitando que el toast desaparezca prematuramente al añadir productos seguidos.
function mostrarToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-pass')
        .addEventListener('keydown', e => { if (e.key === 'Enter') hacerLogin(); });
    document.getElementById('reg-pass')
        .addEventListener('keydown', e => { if (e.key === 'Enter') hacerRegistro(); });

    renderizarCatalogo();
    actualizarContador();
    verificarSesion();
});
