// Lógica de la web: cargar libros, buscar y pintar resultados.

const ORDEN_ESTADOS = ['En casa', 'Reservado', 'Lista de deseos'];
const PALABRAS_VACIAS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'y', 'a']);

let libros = [];

const $ = (id) => document.getElementById(id);

// "¿A qué sabe la Luna?" -> ["que", "sabe", "luna"]
// Sin la "s" final, para que "monstruos" encuentre "monstruo".
function palabras(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((p) => p && !PALABRAS_VACIAS.has(p))
    .map((p) => (p.length > 3 ? p.replace(/s$/, '') : p));
}

const soloDigitos = (texto) => String(texto ?? '').replace(/[^0-9xX]/g, '');

function coincide(libro, consulta) {
  const isbn = soloDigitos(consulta);
  if (isbn.length >= 4 && isbn.length === consulta.replace(/[\s-]/g, '').length) {
    return soloDigitos(libro.isbn).includes(isbn);
  }
  const buscadas = palabras(consulta);
  const delLibro = palabras(`${libro.titulo} ${libro.autor}`);
  return buscadas.every((b) => delLibro.some((p) => p.startsWith(b)));
}

function ordenar(a, b) {
  const porEstado = ORDEN_ESTADOS.indexOf(a.estado) - ORDEN_ESTADOS.indexOf(b.estado);
  return porEstado || String(a.titulo).localeCompare(String(b.titulo), 'es');
}

const escapar = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const claseEstado = (estado) => palabras(estado).join('-') || 'sin-estado';
const mensaje = ([titular, explicacion]) => `${escapar(titular)}<small>${escapar(explicacion)}</small>`;

function tarjeta(libro) {
  const portada = /^https?:\/\//.test(libro.portada)
    ? `<img class="portada" src="${escapar(libro.portada)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
    : `<div class="portada">${escapar((String(libro.titulo).match(/[\p{L}\p{N}]/u)?.[0] ?? '').toUpperCase())}</div>`;
  return `
    <li class="libro">
      ${portada}
      <div class="datos">
        <h2>${escapar(libro.titulo)}</h2>
        ${libro.autor ? `<p>${escapar(libro.autor)}</p>` : ''}
        ${libro.nota ? `<p>${escapar(libro.nota)}</p>` : ''}
        ${libro.estado ? `<span class="estado ${claseEstado(libro.estado)}">${escapar(TEXTOS.estados[libro.estado] ?? libro.estado)}</span>` : ''}
        ${libro.estado === 'Lista de deseos'
          ? `<button type="button" class="reservar" data-reservar="${libros.indexOf(libro)}">${escapar(TEXTOS.botonReservar)}</button>`
          : `<button type="button" class="reservar" data-editar="${libros.indexOf(libro)}">${escapar(TEXTOS.botonEditar)}</button>`}
      </div>
    </li>`;
}

// La respuesta directa a "¿lo tiene?", encima de la lista.
// Tono: titular corto y con intención; la segunda línea dice qué hacer, sin ambigüedad.
const botonesAlta = () => `
  <div class="acciones">
    <button type="button" class="primario" data-alta="Reservado">${escapar(TEXTOS.botonRegalo)}</button>
    <button type="button" class="secundario" data-alta="En casa">${escapar(TEXTOS.botonEnCasa)}</button>
  </div>`;

function veredicto(encontrados) {
  if (!encontrados.length) {
    return mensaje(TEXTOS.noLoTiene) + botonesAlta();
  }
  if (encontrados.length > 1) {
    return `${mensaje(TEXTOS.varios(encontrados.length))}
      <button type="button" class="enlace" data-alta="Reservado">${escapar(TEXTOS.noEsNinguno)}</button>`;
  }
  const { estado } = encontrados[0];
  if (estado === 'En casa') return mensaje(TEXTOS.enCasa);
  if (estado === 'Reservado') return mensaje(TEXTOS.reservado);
  return mensaje(TEXTOS.deseo);
}

let cotilleando = false;

// `forzados`: resultados ya calculados (p. ej. tras escanear); si no, se busca lo escrito.
function pintar(forzados) {
  const consulta = $('consulta').value.trim();
  const encontrados = (forzados ?? (consulta ? libros.filter((l) => coincide(l, consulta)) : [])).sort(ordenar);
  const visibles = consulta ? encontrados : (cotilleando ? [...libros].sort(ordenar) : []);

  $('veredicto').hidden = !consulta;
  $('veredicto').innerHTML = consulta ? veredicto(encontrados) : '';
  $('cotillea').hidden = Boolean(consulta) || !libros.length;
  $('cotillea').setAttribute('aria-expanded', cotilleando);
  $('cotillea').textContent = cotilleando ? TEXTOS.ocultar : TEXTOS.cotillea(CONFIG.peque);
  $('resultados').innerHTML = visibles.map(tarjeta).join('');
}

// --- ISBN: buscar por código y, si no está, por el título que dice Google Books ---

const esIsbn = (texto) => /^97[89]\d{10}$/.test(texto);

// Pregunta primero a Google Books y, si no lo conoce, a Open Library.
async function fichaPorIsbn(isbn) {
  return (await fichaGoogle(isbn)) ?? (await fichaOpenLibrary(isbn));
}

async function fichaGoogle(isbn) {
  try {
    const respuesta = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const info = (await respuesta.json()).items?.[0]?.volumeInfo;
    if (!info) return null;
    return {
      titulo: info.title,
      autor: (info.authors ?? []).join(', '),
      portada: (info.imageLinks?.thumbnail ?? '').replace('http:', 'https:'),
    };
  } catch (error) {
    return null;
  }
}

async function fichaOpenLibrary(isbn) {
  try {
    const respuesta = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    const info = (await respuesta.json())[`ISBN:${isbn}`];
    if (!info) return null;
    return {
      titulo: info.title,
      autor: (info.authors ?? []).map((a) => a.name).join(', '),
      portada: info.cover?.medium ?? '',
    };
  } catch (error) {
    return null;
  }
}

// "Pollo Pepe" y "El pollo Pepe" son el mismo libro: las palabras del más corto están en el otro.
function mismoTitulo(a, b) {
  const pa = palabras(a);
  const pb = palabras(b);
  if (!pa.length || !pb.length) return false;
  const [corto, largo] = pa.length <= pb.length ? [pa, pb] : [pb, pa];
  return corto.every((p) => largo.includes(p));
}

function mostrarEscaneado(ficha, isbn) {
  $('escaneado').hidden = false;
  $('escaneado').innerHTML = ficha
    ? `${ficha.portada ? `<img class="portada" src="${escapar(ficha.portada)}" alt="" onerror="this.remove()">` : ''}
       <div>Has escaneado<strong>${escapar(ficha.titulo)}</strong>${escapar(ficha.autor)}</div>`
    : `<div>Has escaneado<strong>ISBN ${escapar(isbn)}</strong>No hemos encontrado su título.</div>`;
}

// Lo último escaneado, para rellenar el formulario de alta.
let ultimaFicha = null;

async function buscarIsbn(isbn) {
  $('consulta').value = isbn;
  const porIsbn = libros.filter((l) => soloDigitos(l.isbn) === isbn);
  if (porIsbn.length) {
    $('escaneado').hidden = true;
    pintar(porIsbn);
    return;
  }
  $('veredicto').hidden = false;
  $('veredicto').innerHTML = 'Buscando…';
  const ficha = await fichaPorIsbn(isbn);
  if ($('consulta').value !== isbn) return; // ha escrito otra cosa mientras tanto
  ultimaFicha = { ...ficha, isbn };
  mostrarEscaneado(ficha, isbn);
  pintar(ficha ? libros.filter((l) => mismoTitulo(l.titulo, ficha.titulo)) : []);
  if (!ficha) {
    // Sin título no podemos asegurar que no lo tenga: puede estar en el Sheet sin ISBN.
    $('veredicto').innerHTML = mensaje(TEXTOS.desconocido) + botonesAlta();
  }
}

// --- Apuntar libros: alta nueva o reserva de uno de la lista de deseos ---

let pendiente = null; // { accion: 'alta' }, { accion: 'reservar', libro } o { accion: 'editar', libro }
let portadaForm = '';

const campo = (nombre) => $('form').elements[nombre];
const textoEnviar = $('form-enviar').textContent;

function recordarNombre(nombre) {
  try {
    if (nombre === undefined) return localStorage.getItem('nombre') ?? '';
    localStorage.setItem('nombre', nombre);
  } catch (error) {
    return '';
  }
}

function abrirFormulario(accion, { estado, libro } = {}) {
  pendiente = { accion, libro };
  $('form').reset();
  $('form-aviso').textContent = '';
  $('form-enviar').disabled = false;
  $('form-enviar').textContent = accion === 'editar' ? 'Guardar' : textoEnviar;
  campo('nombre').value = recordarNombre();

  const reservando = accion === 'reservar';
  $('form-libro').hidden = reservando;
  $('campo-isbn').hidden = accion === 'editar'; // el ISBN identifica el libro: no se cambia
  [$('form-titulo').textContent, $('form-sub').textContent] = {
    alta: TEXTOS.formAlta,
    reservar: reservando && TEXTOS.formReserva(libro.titulo),
    editar: TEXTOS.formEditar,
  }[accion];

  if (accion === 'editar') {
    $('form').querySelector(`[name="estado"][value="${libro.estado}"]`).checked = true;
    campo('titulo').value = libro.titulo ?? '';
    campo('autor').value = libro.autor ?? '';
  } else if (!reservando) {
    $('form').querySelector(`[name="estado"][value="${estado}"]`).checked = true;
    const consulta = $('consulta').value.trim();
    const desdeEscaneo = ultimaFicha && ultimaFicha.isbn === soloDigitos(consulta);
    campo('titulo').value = desdeEscaneo ? ultimaFicha.titulo ?? '' : (esIsbn(soloDigitos(consulta)) ? '' : consulta);
    campo('autor').value = desdeEscaneo ? ultimaFicha.autor ?? '' : '';
    campo('isbn').value = desdeEscaneo || esIsbn(soloDigitos(consulta)) ? soloDigitos(consulta) : '';
    portadaForm = desdeEscaneo ? ultimaFicha.portada ?? '' : '';
  }
  actualizarNombre();
  $('formulario').hidden = false;
}

// El nombre solo tiene sentido al reservar.
function actualizarNombre() {
  const estado = $('form').querySelector('[name="estado"]:checked')?.value;
  $('form-nombre').hidden = pendiente.accion === 'editar' || (pendiente.accion === 'alta' && estado !== 'Reservado');
}

async function completarPorIsbn() {
  const isbn = soloDigitos(campo('isbn').value);
  if (!esIsbn(isbn)) return;
  const ficha = await fichaPorIsbn(isbn);
  if (!ficha || soloDigitos(campo('isbn').value) !== isbn) return;
  if (!campo('titulo').value.trim()) campo('titulo').value = ficha.titulo;
  if (!campo('autor').value.trim()) campo('autor').value = ficha.autor;
  portadaForm = ficha.portada;
}

async function enviar(datos) {
  if (!CONFIG.urlDatos) return { ...datos, portada: datos.portada ?? '' }; // modo ejemplo: no guarda nada
  const respuesta = await fetch(CONFIG.urlDatos, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita la comprobación previa que Apps Script no admite
    body: JSON.stringify(datos),
  });
  const resultado = await respuesta.json();
  if (!resultado.ok) throw new Error(resultado.error);
  return resultado.libro;
}

async function guardarFormulario(evento) {
  evento.preventDefault();
  const datos = Object.fromEntries(new FormData($('form')));
  if (pendiente.accion !== 'reservar' && !datos.titulo.trim()) {
    $('form-aviso').textContent = 'Falta el título.';
    return;
  }
  $('form-enviar').disabled = true;
  $('form-aviso').textContent = 'Guardando…';
  try {
    let libro;
    if (pendiente.accion === 'reservar') {
      libro = pendiente.libro;
      await enviar({ accion: 'reservar', isbn: libro.isbn, titulo: libro.titulo, nombre: datos.nombre });
      libro.estado = 'Reservado';
    } else if (pendiente.accion === 'editar') {
      libro = pendiente.libro;
      const editado = await enviar({
        accion: 'editar',
        isbn: libro.isbn,
        original: libro.titulo,
        titulo: datos.titulo,
        autor: datos.autor,
        estado: datos.estado,
      });
      Object.assign(libro, { titulo: editado.titulo, autor: editado.autor, estado: editado.estado });
    } else {
      libro = await enviar({
        accion: 'alta',
        estado: datos.estado,
        titulo: datos.titulo,
        autor: datos.autor,
        isbn: soloDigitos(datos.isbn),
        portada: portadaForm,
        nombre: datos.estado === 'Reservado' ? datos.nombre : '',
      });
      libros.push(libro);
    }
    if (datos.nombre) recordarNombre(datos.nombre);
    $('formulario').hidden = true;
    mostrarApuntado(libro, pendiente.accion === 'editar' ? TEXTOS.editado : null);
  } catch (error) {
    $('form-enviar').disabled = false;
    $('form-aviso').textContent = error instanceof TypeError
      ? 'No se ha podido guardar. Revisa la conexión e inténtalo de nuevo.'
      : error.message;
  }
}

function mostrarApuntado(libro, texto) {
  actualizarCifra();
  $('consulta').value = libro.titulo;
  $('escaneado').hidden = true;
  ultimaFicha = null;
  pintar([libro]);
  $('veredicto').innerHTML = mensaje(texto ?? (libro.estado === 'Reservado' ? TEXTOS.apuntadoReservado : TEXTOS.apuntadoEnCasa));
}

// --- Escáner con la cámara (la librería se descarga solo al usarlo) ---

const LIBRERIA_ESCANER = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
let lector = null;
let leido = false;

function cargarScript(src) {
  return new Promise((resolver, fallar) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolver;
    script.onerror = fallar;
    document.head.append(script);
  });
}

async function abrirEscaner() {
  $('escaner').hidden = false;
  $('escaner-aviso').textContent = 'Abriendo la cámara…';
  leido = false;
  try {
    if (!window.Html5Qrcode) await cargarScript(LIBRERIA_ESCANER);
    lector = new Html5Qrcode('lector', {
      formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      verbose: false,
    });
    await lector.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 260, height: 120 } }, alLeer, () => {});
    $('escaner-aviso').textContent = '';
  } catch (error) {
    $('escaner-aviso').textContent = 'No hemos podido abrir la cámara. Revisa el permiso del navegador o escribe el ISBN.';
  }
}

async function cerrarEscaner() {
  if (lector?.isScanning) await lector.stop();
  lector = null;
  $('lector').innerHTML = '';
  $('escaner').hidden = true;
}

async function alLeer(codigo) {
  if (leido || !esIsbn(codigo)) return; // ignora lecturas repetidas y códigos que no son de libro
  leido = true;
  await cerrarEscaner();
  buscarIsbn(codigo);
}

function actualizarCifra() {
  const enCasa = libros.filter((l) => l.estado === 'En casa').length;
  $('cifra').textContent = TEXTOS.cifra(enCasa);
}

async function cargar() {
  document.title = CONFIG.nombre;
  $('titulo-biblioteca').textContent = CONFIG.nombre;
  try {
    if (CONFIG.urlDatos) {
      const respuesta = await fetch(CONFIG.urlDatos);
      libros = (await respuesta.json()).libros;
    } else {
      libros = DATOS_EJEMPLO;
    }
    actualizarCifra();
    $('resumen').textContent = `${TEXTOS.resumen(CONFIG.peque)}${CONFIG.urlDatos ? '' : ' (Datos de ejemplo)'}`;
  } catch (error) {
    [$('cifra').textContent, $('lema').textContent, $('resumen').textContent] = TEXTOS.error;
  }
  pintar();
}

$('consulta').addEventListener('input', () => {
  $('escaneado').hidden = true;
  const isbn = soloDigitos($('consulta').value);
  if (esIsbn(isbn)) buscarIsbn(isbn);
  else pintar();
});
$('buscador').addEventListener('submit', (e) => {
  e.preventDefault();
  $('consulta').blur(); // cierra el teclado del móvil
});
$('cotillea').addEventListener('click', () => {
  cotilleando = !cotilleando;
  pintar();
});
$('camara').addEventListener('click', abrirEscaner);
$('escaner-cerrar').addEventListener('click', cerrarEscaner);

document.addEventListener('click', (evento) => {
  const alta = evento.target.closest('[data-alta]');
  const reserva = evento.target.closest('[data-reservar]');
  const edicion = evento.target.closest('[data-editar]');
  if (alta) abrirFormulario('alta', { estado: alta.dataset.alta });
  if (reserva) abrirFormulario('reservar', { libro: libros[reserva.dataset.reservar] });
  if (edicion) abrirFormulario('editar', { libro: libros[edicion.dataset.editar] });
});
$('form').addEventListener('submit', guardarFormulario);
$('form').addEventListener('change', actualizarNombre);
campo('isbn').addEventListener('input', completarPorIsbn);
$('form-cerrar').addEventListener('click', () => { $('formulario').hidden = true; });

cargar();
