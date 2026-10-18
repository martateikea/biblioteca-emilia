// Textos de la estética «bebé»: tiernos, pero siempre claros sobre qué hacer.
const TEXTOS = {
  tituloPre: 'La biblioteca de',
  // "5 cuentos · 1 en su lista de deseos"
  cifra: (total, deseos) => `${total} ${total === 1 ? 'cuento' : 'cuentos'}`
    + (deseos ? ` · ${deseos} en su lista de deseos` : ''),
  resumen: () => '',
  cotillea: (peque) => `Ver la estantería${peque ? ` de ${peque}` : ''}`,
  ocultar: 'Cerrar la estantería',
  estados: { 'En casa': 'Ya vive en casa', 'Reservado': 'Reservado', 'Lista de deseos': 'Lista de deseos ♡' },
  secciones: { 'En casa': 'Ya vive en casa', 'Reservado': 'Reservados', 'Lista de deseos': 'Lista de deseos', otros: 'Otros cuentos' },
  filtrar: 'Filtrar la estantería',
  todos: 'Todos',
  volver: '← Ver toda la estantería',
  vacia: ['Su estantería está esperando su primer cuento.', 'Búscalo arriba y apúntalo.'],

  noLoTiene: ['¡Todavía no lo tiene!', 'Podría ser su próximo cuento favorito.'],
  varios: (n) => [`Hemos encontrado ${n} cuentos.`, 'Mira cómo está cada uno antes de decidir.'],
  noEsNinguno: '¿No es ninguno de estos? Apúntalo',
  enCasa: ['¡Este ya vive en casa!', 'Ya está en su estantería. Busca otro cuento.'],
  reservado: ['¡Uy! Alguien se te ha adelantado.', 'Este ya está reservado. Busca otro cuento.'],
  deseo: ['¡Le haría muchísima ilusión!', 'Está en su lista de deseos. ¡Gran elección!'],
  desconocido: ['Mmm… no conocemos este cuento.', 'Búscalo por el título para asegurarte. Si no está, apúntalo.'],

  botonRegalo: 'Se lo voy a regalar',
  botonEnCasa: 'Ya vive en casa',
  botonReservar: 'Se lo regalo yo\u00a0♡', // espacio fijo: el corazón no se queda solo en otra línea
  botonEditar: 'Editar',
  formAlta: ['¡Apúntalo!', 'Así no se repite.'],
  formReserva: (titulo) => ['¡Qué ilusión!', `«${titulo}» saldrá de su lista de deseos para que no se repita.`],
  apuntadoReservado: ['¡Hecho!', 'Queda reservado para ti. Así no se repite.'],
  apuntadoEnCasa: ['¡Bienvenido a casa!', 'Un cuento más para leer juntos.'],
  formEditar: ['¿Hay novedades?', '¿Ya se lo has dado? Cámbialo aquí.'],
  editado: ['¡Gracias!', 'La estantería ya está al día.'],

  error: ['¡Ups!', 'Los cuentos se han quedado dormidos.', 'Recarga la página y lo intentamos otra vez.'],
};
