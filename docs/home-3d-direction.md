# Mi hogar: siguiente etapa del 3D

La referencia visual requiere modelos detallados, materiales y luces trabajados. La escena geométrica actual es un prototipo interactivo, no una reproducción de esa calidad visual.

## Camino recomendado, sin suscripción de 3D

- Conservar React 18.3.1 + React Three Fiber 8.18.0 + Drei 9.122.0 + Three 0.170.0 del proyecto.
- Preparar una habitación en Blender y exportar GLB. Separar cada objeto comprable para enlazarlo con su producto. Mantener rosa pastel y verde salvia.
- Usar materiales PBR y sombras precalculadas; texturas pequeñas y modelos optimizados para móvil. La calidad debe comprobarse en dispositivos reales antes de publicar.
- Servir los archivos desde la propia app, sin depender de una API en cada visita. Cargar la escena de forma diferida y conservar la lista como alternativa accesible.
- Animaciones breves: selección, aparición al comprar y reacción del gato. Respetar movimiento reducido.

## Recursos verificados el 6 de octubre de 2026

- [Poly Haven](https://polyhaven.com/license): modelos, texturas y HDRI CC0. Es la opción más cercana a materiales realistas. [API y términos](https://github.com/Poly-Haven/Public-API/blob/master/ToS.md): acceso básico gratuito; condiciones del servicio separadas de la licencia de los modelos.
- [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit): 140 recursos CC0. Útil para una estética estilizada ligera; por sí solo no reproduce el acabado de la referencia.
- [pmndrs/gltfjsx](https://github.com/pmndrs/gltfjsx): repositorio para convertir modelos GLTF en componentes reutilizables. Revisar y fijar versión antes de usar el CLI.
- [Poly Pizza](https://poly.pizza): catálogo adicional para mascotas y mobiliario; verificar la licencia de cada modelo antes de incorporarlo. No asumir que todo el catálogo es CC0.

## Alcance financiero de la prueba local

La prueba recupera Gastos, Ingresos y Finanzas, con filtro por mes, altas, edición y eliminación. El saldo inicial, los ingresos y los gastos alimentan el mismo saldo de Mi hogar. Las compras de objetos son un único movimiento derivado; anularlas devuelve el objeto a pendientes. Los datos de prueba viven en memoria y se reinician al recargar.

La app publicada, su autenticación y Supabase permanecen intactos. Al integrar, reutilizar las operaciones existentes de App.tsx. El saldo inicial y el enlace compra-gasto necesitarán persistencia validada y una operación atómica en servidor; no trasladar el modelo temporal de fecha de compra del prototipo a producción. La vista local no reemplaza toda la funcionalidad histórica de Finanzas (gráficos y períodos), que se conservará al integrar.

## Pulido local del hero y del editor

- `HomeIntro` y `home-editorial.css` dan la misma composición a `HomeLive` y `HomePreview`: título condensado, cuarto protagonista, saldo accesible e inventario con divisores. Las reglas de contenido están limitadas a `home-home-view`; no cambian los cálculos ni las operaciones financieras.
- Referencias consultadas: [Analogue en Supahero](https://supahero.io/hero/analogue) y [creamu en Supahero](https://supahero.io/hero/creamu-inc). Se adapta la jerarquía de texto e imagen, manteniendo rosa y verde, sin reutilizar sus assets.
- Suelo útil virtual de 6,4 × 5,6; los muebles conservan su tamaño. Geometría, límites, obstáculos, rejilla y encuadre usan `ROOM_BOUNDS`. Las posiciones guardadas que siguen siendo válidas se conservan.
- Girar conserva el centro cuando cabe; cuando no, busca el lugar libre más cercano con la nueva orientación. El estado explica el ajuste. Giro y desplazamiento forman una sola acción para deshacer; no desplazan otros muebles.
- Las acciones del gato se agrupan en «Gato». Al cerrar por acción o Escape, el foco vuelve a su botón. El modo «Acomodar» permite arrastrar, colocar sobre el piso y usar flechas/R, además de los controles táctiles.
- Estos cambios siguen locales para revisión del usuario. No implican publicación en GitHub ni Vercel.

### Fondo con movimiento y collage

`HomeAtmosphere` añade dos luces de color pastel, la pegatina de tres gatitos proporcionada por el usuario y flores SVG originales con textura de puntos. Se monta en Mi hogar, con la misma implementación en app y demostración; Gastos conserva su fondo quieto.

Se consultaron [Motion](https://motion.dev/docs/react-accessibility), [dotLottie](https://docs.lottiefiles.com/en/runtimes/distributions/react) y [Rive](https://rive.app/docs/runtimes/react/react). Para esta decoración se eligieron animaciones CSS de transform, sin dependencia nueva ni API remota. El botón «Fondo animado» guarda la pausa en el navegador; la capa se pausa al ocultar la pestaña y se detiene con `prefers-reduced-motion`, incluyendo cambios de esa preferencia durante la sesión. Las imágenes son decorativas y no capturan toques.

La pegatina se copia sin modificar píxeles a `public/images/vintage-kittens.png` (PNG con transparencia, 1145 × 1374; aproximadamente 2,35 MB), con dimensiones explícitas y carga diferida. La flor usa únicamente inspiración de collage y no reproduce la imagen adjunta.
