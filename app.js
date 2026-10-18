// Lógica de la web: cargar libros, buscar y pintar resultados.

// Orden de las secciones de la estantería y de los resultados de búsqueda.
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
// Fija, sin pasar por palabras(): esa función recorta la "s" final y rompería "lista-deseos".
const CLASES_ESTADO = { 'En casa': 'en-casa', 'Reservado': 'reservado', 'Lista de deseos': 'lista-deseos' };
const claseEstado = (estado) => CLASES_ESTADO[estado] ?? 'sin-estado';
const mensaje = ([titular, explicacion]) => `${escapar(titular)}<small>${escapar(explicacion)}</small>`;

// La portada guardada; si no hay, la de Open Library por ISBN (404 si no la tiene).
function urlPortada(libro) {
  if (/^https?:\/\//.test(libro.portada)) return libro.portada;
  const isbn = soloDigitos(libro.isbn);
  return isbn.length === 10 || isbn.length === 13
    ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`
    : '';
}

const ICONO_LAPIZ = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';

function tarjeta(libro) {
  const indice = libros.indexOf(libro);
  const url = urlPortada(libro);
  const inicial = (String(libro.titulo).match(/[\p{L}\p{N}]/u)?.[0] ?? '').toUpperCase();
  // La inicial queda debajo: se ve mientras carga la imagen y si no hay o falla.
  return `
    <li class="libro">
      <div class="portada">
        <span class="inicial" aria-hidden="true">${escapar(inicial)}</span>
        ${url ? `<img src="${escapar(url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
      </div>
      <div class="datos">
        <h3>${escapar(libro.titulo)}</h3>
        ${libro.autor ? `<p class="autor">${escapar(libro.autor)}</p>` : ''}
        ${libro.nota ? `<p class="nota">${escapar(libro.nota)}</p>` : ''}
        ${libro.estado ? `<span class="estado ${claseEstado(libro.estado)}">${escapar(TEXTOS.estados[libro.estado] ?? libro.estado)}</span>` : ''}
        ${libro.estado === 'Lista de deseos' ? `<button type="button" class="primario regalar" data-reservar="${indice}">${escapar(TEXTOS.botonReservar)}</button>` : ''}
      </div>
      ${libro.estado === 'Lista de deseos' ? '' : `<button type="button" class="editar" data-editar="${indice}" aria-label="${escapar(TEXTOS.botonEditar)} «${escapar(libro.titulo)}»">${ICONO_LAPIZ}</button>`}
    </li>`;
}

const listaLibros = (lista) => `<ul class="lista-libros">${lista.map(tarjeta).join('')}</ul>`;
const porTitulo = (a, b) => String(a.titulo).localeCompare(String(b.titulo), 'es');

// Estantería abierta: los libros por secciones, con filtros para ir directo a una.
let estanteriaAbierta = false;
let filtro = 'todos';

function filtros(grupos) {
  const boton = (clave, texto, n) => `
    <button type="button" class="filtro" data-filtro="${escapar(clave)}" aria-pressed="${filtro === clave}">
      ${escapar(texto)} <span class="cuenta">${n}</span>
    </button>`;
  return `
    <div class="filtros" role="group" aria-label="${escapar(TEXTOS.filtrar)}">
      ${boton('todos', TEXTOS.todos, libros.length)}
      ${grupos.map(([estado, lista]) => boton(estado, TEXTOS.secciones[estado], lista.length)).join('')}
    </div>`;
}

function estanteria() {
  if (!libros.length) return `<p class="vacia">${mensaje(TEXTOS.vacia)}</p>`;
  const grupos = ORDEN_ESTADOS.map((estado) => [estado, libros.filter((l) => l.estado === estado)]);
  grupos.push(['otros', libros.filter((l) => !ORDEN_ESTADOS.includes(l.estado))]);
  const conLibros = grupos.filter(([, lista]) => lista.length);
  // Si el filtro elegido se ha quedado vacío (p. ej. tras editar), volvemos a «Todos».
  if (!conLibros.some(([estado]) => estado === filtro)) filtro = 'todos';
  return filtros(conLibros) + conLibros
    .filter(([estado]) => filtro === 'todos' || estado === filtro)
    .map(([estado, lista]) => `
      <section class="seccion">
        <h2>${escapar(TEXTOS.secciones[estado])} <span class="cuenta">${lista.length}</span></h2>
        ${listaLibros([...lista].sort(porTitulo))}
      </section>`)
    .join('');
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

// `forzados`: resultados ya calculados (p. ej. tras escanear); si no, se busca lo escrito.
function pintar(forzados) {
  const consulta = $('consulta').value.trim();
  const encontrados = (forzados ?? (consulta ? libros.filter((l) => coincide(l, consulta)) : [])).sort(ordenar);

  $('veredicto').hidden = !consulta;
  $('veredicto').innerHTML = consulta ? veredicto(encontrados) + botonVolver() : '';
  $('cotillea').hidden = Boolean(consulta) || !libros.length;
  $('cotillea').setAttribute('aria-expanded', estanteriaAbierta);
  $('cotillea').textContent = estanteriaAbierta ? TEXTOS.ocultar : TEXTOS.cotillea(CONFIG.peque);
  $('resultados').innerHTML = consulta ? listaLibros(encontrados) : (estanteriaAbierta || !libros.length ? estanteria() : '');
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
    $('veredicto').innerHTML = mensaje(TEXTOS.desconocido) + botonesAlta() + botonVolver();
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
  // Si se edita o reserva navegando por la estantería, al guardar seguimos en ella.
  pendiente = { accion, libro, desdeEstanteria: accion !== 'alta' && !$('consulta').value.trim() };
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
    body: JSON.stringify({ ...datos, clave: recordarClave() }),
  });
  const resultado = await respuesta.json();
  if (resultado.clave === false) {
    // La contraseña ha cambiado desde que entró: se la volvemos a pedir.
    $('formulario').hidden = true;
    pedirClave(TEXTOS.accesoCambiada);
  }
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
    const texto = pendiente.accion === 'editar' ? TEXTOS.editado : null;
    if (pendiente.desdeEstanteria) {
      actualizarCifra();
      pintar();
      avisar(texto ?? TEXTOS.apuntadoReservado);
    } else {
      mostrarApuntado(libro, texto);
    }
  } catch (error) {
    $('form-enviar').disabled = false;
    $('form-aviso').textContent = error instanceof TypeError
      ? 'No se ha podido guardar. Revisa la conexión e inténtalo de nuevo.'
      : error.message;
  }
}

function mostrarApuntado(libro, texto) {
  $('aviso-flotante').hidden = true;
  actualizarCifra();
  $('consulta').value = libro.titulo;
  $('escaneado').hidden = true;
  ultimaFicha = null;
  pintar([libro]);
  $('veredicto').innerHTML = mensaje(texto ?? (libro.estado === 'Reservado' ? TEXTOS.apuntadoReservado : TEXTOS.apuntadoEnCasa)) + botonVolver();
}

// Salida siempre visible cuando hay algo en el buscador.
const botonVolver = () => `<button type="button" class="enlace volver" data-volver>${escapar(TEXTOS.volver)}</button>`;

function volverAEstanteria() {
  $('consulta').value = '';
  $('escaneado').hidden = true;
  ultimaFicha = null;
  estanteriaAbierta = true;
  filtro = 'todos';
  $('aviso-flotante').hidden = true;
  pintar();
}

// Aviso breve abajo de la pantalla, que se va solo.
let temporizadorAviso = null;
function avisar([titular, explicacion]) {
  $('aviso-flotante').innerHTML = mensaje([titular, explicacion]);
  $('aviso-flotante').hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { $('aviso-flotante').hidden = true; }, 3500);
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
  const deseos = libros.filter((l) => l.estado === 'Lista de deseos').length;
  $('cifra').textContent = TEXTOS.cifra(libros.length, deseos);
}

// "La biblioteca de" pequeño y el nombre del peque en grande.
function pintarTitulo() {
  $('titulo-biblioteca').innerHTML = CONFIG.peque
    ? `<span class="titulo-pre">${escapar(TEXTOS.tituloPre)}</span> <span class="titulo-nombre">${escapar(CONFIG.peque)}</span>`
    : `<span class="titulo-nombre">${escapar(CONFIG.nombre)}</span>`;
}

// --- Contraseña de la casa: la comprueba el script del Sheet; aquí solo se pide y se recuerda ---

const CLAVE_GUARDADA = `clave:${CONFIG.urlDatos}`; // una por biblioteca: todas comparten dirección web

function recordarClave(clave) {
  try {
    if (clave === undefined) return localStorage.getItem(CLAVE_GUARDADA) ?? '';
    localStorage.setItem(CLAVE_GUARDADA, clave);
  } catch (error) {
    return '';
  }
}

async function pedirLibros(clave) {
  const respuesta = await fetch(`${CONFIG.urlDatos}?clave=${encodeURIComponent(clave)}`);
  return respuesta.json();
}

function pedirClave(aviso = '') {
  document.body.classList.add('bloqueada');
  $('acceso').hidden = false;
  $('cifra').textContent = '';
  $('acceso-aviso').textContent = aviso;
  $('acceso-entrar').disabled = false;
  $('clave').focus();
}

function mostrarBiblioteca() {
  document.body.classList.remove('bloqueada');
  $('acceso').hidden = true;
  $('acceso-aviso').textContent = '';
  actualizarCifra();
  $('resumen').textContent = `${TEXTOS.resumen(CONFIG.peque)}${CONFIG.urlDatos ? '' : ' (Datos de ejemplo)'}`;
  pintar();
}

async function entrar(evento) {
  evento.preventDefault();
  const clave = $('clave').value.trim();
  if (!clave) return;
  $('acceso-entrar').disabled = true;
  $('acceso-aviso').textContent = TEXTOS.accesoComprobando;
  try {
    const datos = await pedirLibros(clave);
    if (datos.clave === false) {
      pedirClave(TEXTOS.accesoError);
      $('clave').select();
      return;
    }
    recordarClave(clave);
    libros = datos.libros;
    mostrarBiblioteca();
  } catch (error) {
    pedirClave(TEXTOS.accesoSinConexion);
  }
}

async function cargar() {
  document.title = CONFIG.nombre;
  pintarTitulo();
  if (!CONFIG.urlDatos) {
    libros = DATOS_EJEMPLO;
    mostrarBiblioteca();
    return;
  }
  try {
    const datos = await pedirLibros(recordarClave());
    if (datos.clave === false) {
      pedirClave();
      return;
    }
    libros = datos.libros;
    mostrarBiblioteca();
  } catch (error) {
    [$('cifra').textContent, $('lema').textContent, $('resumen').textContent] = TEXTOS.error;
  }
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
  estanteriaAbierta = !estanteriaAbierta;
  pintar();
});
$('camara').addEventListener('click', abrirEscaner);
$('escaner-cerrar').addEventListener('click', cerrarEscaner);

document.addEventListener('click', (evento) => {
  const alta = evento.target.closest('[data-alta]');
  const reserva = evento.target.closest('[data-reservar]');
  const edicion = evento.target.closest('[data-editar]');
  const boton = evento.target.closest('[data-filtro]');
  if (evento.target.closest('[data-volver]')) volverAEstanteria();
  if (boton) {
    filtro = boton.dataset.filtro;
    pintar();
  }
  if (alta) abrirFormulario('alta', { estado: alta.dataset.alta });
  if (reserva) abrirFormulario('reservar', { libro: libros[reserva.dataset.reservar] });
  if (edicion) abrirFormulario('editar', { libro: libros[edicion.dataset.editar] });
});
$('form').addEventListener('submit', guardarFormulario);
$('acceso').addEventListener('submit', entrar);
$('form').addEventListener('change', actualizarNombre);
campo('isbn').addEventListener('input', completarPorIsbn);
$('form-cerrar').addEventListener('click', () => { $('formulario').hidden = true; });

cargar();
