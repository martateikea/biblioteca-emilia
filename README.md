# Prototipo biblioteca

Plantilla maestra. Cada biblioteca (sobrino, amigo…) es un proyecto independiente:
su propio repositorio, su propia web y su propio Google Sheet con su script.

## Crear una biblioteca nueva

**Web**

1. En este repositorio: *Use this template → Create a new repository*. Llámalo, por ejemplo, `biblioteca-nombre`.
2. En el repositorio nuevo: *Settings → Pages → Branch: main, / (root) → Save*.

**Google Sheet** (en la cuenta de proyectos)

3. Abre el Sheet maestro y haz *Archivo → Hacer una copia*. La copia lleva el script incluido.
4. En la copia, borra los libros de prueba (deja la fila de cabeceras).
5. En la copia: *Extensiones → Apps Script → Implementar → Nueva implementación*.
   Tipo *Aplicación web*, *Ejecutar como: Yo*, *Acceso: Cualquier usuario*. Copia la URL que acaba en `/exec`.
6. Comparte el Sheet con los padres como editores.

**Conectar**

7. En el repositorio nuevo, edita `config.js` (icono del lápiz en GitHub): nombre de la app, nombre del peque y la URL del paso 5.
8. El enlace para la familia es `https://<usuario>.github.io/biblioteca-nombre/`.

## Personalizar

- `config.js`: nombre de la app y del peque.
- `tema.css`: colores y tipografía.

## Actualizar el script de una biblioteca ya creada

*Implementar → Gestionar implementaciones → lápiz → Versión: Nueva versión → Implementar.*
Nunca "Nueva implementación": cambiaría la URL y la web dejaría de funcionar.

Los arreglos de la plantilla no llegan solos a las bibliotecas ya creadas: hay que repetirlos en cada una.
