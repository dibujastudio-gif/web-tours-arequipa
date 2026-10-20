import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = "https://yzyrvvcdnhjlkmgulgjh.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_UEbVumaJxsoq6cy6T6rceA_CY0VAx4k"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
let asientosDisponibles = 0;

// NAVEGACIÓN ENTRE SECCIONES (TABS)
window.switchTab = function(tabName, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
};

// GENERAR CAMPOS DE PASAJEROS SEGÚN CHECKBOX Y CANTIDAD
function renderizarCamposPasajeros() {
    const totalPasajeros = parseInt(document.getElementById('pasajeros').value, 10) || 1;
    const titularAsiste = document.getElementById('checkTitularVa').checked;
    const container = document.getElementById('pasajerosInputs');
    container.innerHTML = '';

    const otrosPasajerosAImprimir = titularAsiste ? totalPasajeros - 1 : totalPasajeros;

    if (titularAsiste) {
        const infoBox = document.createElement('div');
        infoBox.style.cssText = "background:#EBF5FB; padding:12px; border-radius:8px; font-size:13px; color:#1E4B6E; font-weight:700;";
        infoBox.innerHTML = `ℹ️ Pasajero 1: <strong>Titular (Se usarán los datos ingresados arriba)</strong>`;
        container.appendChild(infoBox);
    }

    for (let i = 1; i <= otrosPasajerosAImprimir; i++) {
        const numeroPasajeroEtiqueta = titularAsiste ? (i + 1) : i;
        const box = document.createElement('div');
        box.className = 'pasajero-box';

        box.innerHTML = `
            <div class="pasajero-title">
                <i class="fa-solid fa-user"></i> Pasajero ${numeroPasajeroEtiqueta}
            </div>
            <div class="form-group">
                <label>Nombre Completo:</label>
                <input type="text" class="form-control input-nombre" placeholder="Ej: Nombre de acompañante" required>
            </div>
            <div class="grid-2">
                <div class="form-group">
                    <label>DNI / Pasaporte:</label>
                    <input type="text" class="form-control input-dni" placeholder="Ej: 72889512" required>
                </div>
                <div class="form-group">
                    <label>Celular (Opcional):</label>
                    <input type="tel" class="form-control input-celular" placeholder="Ej: 937294639">
                </div>
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label>Nacionalidad:</label>
                <input type="text" class="form-control input-nacionalidad" value="Peruana">
            </div>
        `;
        container.appendChild(box);
    }
}

// CARGAR FECHAS DESDE SUPABASE
async function cargarFechasDisponibles() {
    const selectFecha = document.getElementById('fecha');
    const hoy = new Date().toISOString().split('T')[0];

    try {
        let { data } = await supabase
            .from('salidas_programadas')
            .select('fecha_tour, limite_asientos, asientos_ocupados')
            .gte('fecha_tour', hoy)
            .order('fecha_tour', { ascending: true });

        selectFecha.innerHTML = '<option value="">-- Selecciona un día --</option>';

        if (data && data.length > 0) {
            data.forEach(item => {
                const disp = item.limite_asientos - item.asientos_ocupados;
                if (disp > 0) {
                    const dateObj = new Date(item.fecha_tour + 'T00:00:00');
                    const diaSemana = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
                    const diaMes = dateObj.getDate();
                    const mesNombre = dateObj.toLocaleDateString('es-ES', { month: 'short' });

                    let tourNombre = "Salida Especial";
                    if (diaSemana.includes("mar") || diaSemana.includes("sáb") || diaSemana.includes("sab")) {
                        tourNombre = "Ruta del Sillar";
                    } else if (diaSemana.includes("jue")) {
                        tourNombre = "City Tour Peatonal";
                    }

                    const opt = document.createElement('option');
                    opt.value = `${item.fecha_tour} ${diaSemana.substring(0,3)} ${tourNombre.toLowerCase()}`;
                    opt.textContent = `${capitalizar(diaSemana)} ${diaMes} ${capitalizar(mesNombre)} - ${tourNombre}`;
                    selectFecha.appendChild(opt);
                }
            });
        }
    } catch (e) {
        console.error("Error cargando fechas desde Supabase:", e);
    }
}

function capitalizar(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

// VERIFICAR DISPONIBILIDAD Y MOSTRAR CUPOS EN TIEMPO REAL
async function verificarDisponibilidad() {
    const fechaVal = document.getElementById('fecha').value;
    const statusDiv = document.getElementById('status');
    const btn = document.getElementById('btnCotizar');
    
    if (!fechaVal) { 
        statusDiv.innerText = ""; 
        btn.disabled = true; 
        return; 
    }

    const isoFecha = fechaVal.split(' ')[0];

    try {
        let { data } = await supabase
            .from('salidas_programadas')
            .select('asientos_ocupados, limite_asientos')
            .eq('fecha_tour', isoFecha)
            .maybeSingle();

        asientosDisponibles = data ? (data.limite_asientos - data.asientos_ocupados) : 15;
        validarPasajeros();
    } catch (e) {
        console.error("Error consultando asientos:", e);
    }
}

function validarPasajeros() {
    const statusDiv = document.getElementById('status');
    const btn = document.getElementById('btnCotizar');
    const pasajerosInput = document.getElementById('pasajeros');
    const numPasajeros = parseInt(pasajerosInput.value, 10) || 1;

    pasajerosInput.max = asientosDisponibles;

    if (asientosDisponibles <= 0) {
        statusDiv.innerText = "❌ Agotado. No quedan asientos disponibles para esta fecha.";
        statusDiv.style.color = "#8B1E2B";
        btn.disabled = true;
    } else if (numPasajeros > asientosDisponibles) {
        statusDiv.innerText = `❌ No puedes reservar ${numPasajeros} cupos. Solo quedan ${asientosDisponibles} asientos libres en el bus.`;
        statusDiv.style.color = "#8B1E2B";
        btn.disabled = true;
    } else {
        statusDiv.innerText = `🟢 ¡Disponible! Quedan ${asientosDisponibles} asientos libres en el bus para esta salida.`;
        statusDiv.style.color = "#27ae60";
        btn.disabled = false;
    }
}

// REGISTRAR EN SUPABASE Y REDIRIGIR A WHATSAPP
async function guardarYEnviar() {
    const fechaSelect = document.getElementById('fecha');
    const tourTexto = fechaSelect.options[fechaSelect.selectedIndex].text;
    const fechaValor = fechaSelect.value;

    const titularNombre = document.getElementById('titularNombre').value.trim();
    const titularDni = document.getElementById('titularDni').value.trim();
    const titularCelular = document.getElementById('titularCelular').value.trim();
    const titularAsiste = document.getElementById('checkTitularVa').checked;

    if (!titularNombre || !titularDni || !titularCelular) {
        alert("Por favor completa todos los datos del Titular de la reserva.");
        return;
    }

    const btn = document.getElementById('btnCotizar');
    btn.disabled = true;
    btn.innerText = "⏳ Registrando en base de datos...";

    const filasInsertar = [];

    if (titularAsiste) {
        filasInsertar.push({
            fecha_tour: fechaValor,
            dni_registrante: titularDni,
            celular_registrante: titularCelular,
            dni_pasajero: titularDni,
            celular: titularCelular,
            nombre: titularNombre,
            nacionalidad: 'Peruana',
            estado: 'Sin confirmar'
        });
    }

    const boxes = document.querySelectorAll('.pasajero-box');
    boxes.forEach((box) => {
        const nombre = box.querySelector('.input-nombre').value.trim();
        const dni = box.querySelector('.input-dni').value.trim();
        const celular = box.querySelector('.input-celular').value.trim();
        const nacionalidad = box.querySelector('.input-nacionalidad').value.trim() || 'Peruana';

        if (nombre && dni) {
            filasInsertar.push({
                fecha_tour: fechaValor,
                dni_registrante: titularDni,
                celular_registrante: titularCelular,
                dni_pasajero: dni,
                celular: celular || 'N/A',
                nombre: nombre,
                nacionalidad: nacionalidad,
                estado: 'Sin confirmar'
            });
        }
    });

    const totalPasajeros = filasInsertar.length;

    let precioUnitario = 55;
    if (tourTexto.toLowerCase().includes("city tour")) {
        precioUnitario = 40;
    }
    const montoTotal = totalPasajeros * precioUnitario;

    try {
        const { error } = await supabase
            .from('pasajeros_reservas')
            .insert(filasInsertar);

        if (error) throw error;

    } catch (e) {
        console.error("Error guardando en Supabase:", e);
    }

    const numeroTelefono = "51988770090";
    const lineas = [
        "📌 *NUEVA SOLICITUD DE RESERVA*",
        "----------------------------------",
        `👤 *Titular:* ${titularNombre}`,
        `🪪 *DNI Titular:* ${titularDni}`,
        `📱 *Celular Titular:* ${titularCelular}`,
        `🏃 *Titular Asiste:* ${titularAsiste ? 'SÍ' : 'NO (Solo compra)'}`,
        `🗓️ *Salida:* ${tourTexto}`,
        `👥 *Total Pasajeros Tour:* ${totalPasajeros}`,
        `💰 *Monto Total a Pagar:* S/. ${montoTotal}.00`,
        "----------------------------------",
        `Hola, acabo de registrar los datos en la web. Adjunto la captura de mi Yape/PLIN por el monto de S/. ${montoTotal}.00 para confirmar.`
    ];

    const url = `https://api.whatsapp.com/send?phone=${numeroTelefono}&text=${encodeURIComponent(lineas.join("\n"))}`;
    window.open(url, '_blank');

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-brands fa-whatsapp" style="font-size: 20px;"></i> Enviar Ficha por WhatsApp';
}

// INICIALIZACIÓN
renderizarCamposPasajeros();
cargarFechasDisponibles();

document.getElementById('checkTitularVa').addEventListener('change', renderizarCamposPasajeros);
document.getElementById('pasajeros').addEventListener('input', () => {
    renderizarCamposPasajeros();
    validarPasajeros();
});
document.getElementById('fecha').addEventListener('change', verificarDisponibilidad);
document.getElementById('btnCotizar').addEventListener('click', guardarYEnviar);
