# Yerbas Santa — tienda online (v2)

Sitio estático (HTML/CSS/JS, sin build) con panel de administrador integrado
dentro de `index.html`. Pensado mobile-first.

## Novedades de esta versión

- **Arreglo del bug de zoom en celular**: el carrito ahora se oculta con
  `transform` en vez de un `right` negativo, que era lo que hacía que el
  navegador agrandara el ancho de la página y forzara el zoom-out.
- **Menú hamburguesa** en celular (el menú de texto se oculta en pantallas
  chicas y aparece este ícono).
- **Precios por cantidad**: al cargar un producto podés agregar varios
  escalones de precio ("desde 1 unidad: $X", "desde 3 unidades: $Y", etc.).
  El carrito calcula solo el precio que corresponde según cuánto pidió el
  cliente.
- **Ganancia real**: en vez de comparar precio de compra vs. venta por cada
  venta individual, ahora el panel compara **todo lo que invertiste en stock**
  (aunque no se haya vendido) contra **todo lo que efectivamente vendiste**.
  Es normal que la ganancia dé negativa apenas cargás stock nuevo: eso es
  correcto, todavía no lo recuperaste.
- **Categorías anidadas**: cada producto puede tener una categoría (pestaña
  principal, ej. "Mates") y una subcategoría opcional (pestaña secundaria,
  ej. "Torpedo"). Si ningún producto de una categoría tiene subcategoría,
  esa segunda fila de pestañas no aparece.

## Cómo se abre el panel de administrador

5 clics seguidos (en menos de 1,5 segundos) sobre "Yerbas Santa" en el pie de
página del sitio. Contraseña inicial: **12345** (se cambia desde adentro).

## Puesta en marcha

1. Crear un proyecto en https://console.firebase.google.com (gratis).
2. Activar **Firestore Database** y **Authentication → Email/contraseña**.
3. En Authentication → Users, crear un usuario con email `admin@yerbasanta.com`
   y contraseña `12345`.
4. Copiar la configuración web (Firebase config) dentro de `js/firebase-config.js`.
5. Subir el **contenido** de esta carpeta (no la carpeta en sí) a un
   repositorio de GitHub.
6. Importar el repositorio en https://vercel.com → Deploy.

Si no configurás Firebase, el sitio funciona igual en "modo demo" con datos
de ejemplo guardados en el propio navegador — útil para probar el diseño,
pero los cambios no se van a ver en otros dispositivos hasta que conectes
Firebase.
