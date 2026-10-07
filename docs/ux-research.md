# Dirección de producto y diseño

Investigación realizada el 6 de octubre de 2026 para Mi Independencia. La referencia principal es una app de finanzas que ayuda a construir un hogar poco a poco; la habitación 3D debe hacer visible el avance sin ocultar el saldo ni los movimientos.

## Hallazgos de producto

Las apps citadas sirven como referencias de claridad, no como una lista de funciones obligatorias. Como Mi Independencia es de uso propio, vamos a conservar solo lo que ayude a entender el saldo, elegir una meta y ver el cuarto avanzar.

### YNAB: objetivos visibles y accionables

YNAB presenta el progreso de una meta con cuánto hay y cuánto falta. Tomaremos únicamente esa lectura rápida para los objetos del hogar; no añadiremos reglas de financiación, calendarios ni alertas complejas.

Fuentes: [Goal Tracking](https://www.ynab.com/features/goal-tracking), [Targets](https://support.ynab.com/how-to-use-targets-rk5kkI9ks).

### Monzo y Revolut: separar dinero con un propósito

Monzo y Revolut separan dinero por propósito. Para Mi Independencia basta con un saldo disponible y metas informativas por objeto. Una meta no descuenta el saldo hasta que se registra una compra.

Fuentes: [Monzo Pots](https://monzo.com/features/pots), [Revolut Budget Planner](https://www.revolut.com/best-budget-planner/).

### IKEA Kreativ: experimentar antes de comprar

IKEA permite partir de una habitación vacía, colocar objetos, intercambiarlos y visualizar el resultado. También reconoce que las herramientas con más detalle no siempre funcionan igual en móvil. Por eso nuestra interfaz debe mantener un plano 3D simple en celular y mostrar la edición avanzada como panel secundario.

Fuentes: [IKEA Kreativ](https://www.ikea.com/us/en/customer-service/knowledge/articles/43460e1e-dd01-4fe8-86ac-74efecd7743f.html), [IKEA planners](https://www.ikea.com/us/en/planners/).

## Arquitectura de la experiencia

### Navegación

Mantener dos destinos principales:

1. **Mi hogar**: saldo disponible, meta más cercana, cuarto 3D, objetos comprados y próximos objetos.
2. **Gastos**: saldo persistente arriba, y dentro tres pestañas: Gastos, Ingresos y Finanzas.

El botón de saldo debe estar visible en ambos destinos. «Añadir meta» vive dentro de Mi hogar y Gastos solo muestra el efecto financiero de esa meta.

### Mi hogar

El primer bloque debe responder tres preguntas: cuánto tengo, qué estoy construyendo y cuál es el siguiente paso. El cuarto ocupa el centro; una tarjeta lateral o inferior muestra la próxima meta. En móvil la tarjeta pasa debajo de la escena y conserva una acción grande de 44 px o más.

Cada objeto necesita estos estados:

- **Pendiente**: aparece como volumen translúcido y no resta dinero.
- **En progreso**: tiene aportes parciales y una barra de objetivo.
- **Comprado**: aparece sólido y crea un único gasto relacionado.
- **Anulado**: vuelve a pendiente y revierte el gasto relacionado.

### Gastos

El resumen superior siempre muestra saldo disponible, ingresos, gastos y compras del hogar. Los registros conservan el comportamiento actual: mes, categoría, total, alta, edición y eliminación. El enlace con un objeto debe identificarse con una etiqueta como «Compra de Mi hogar».

### Microinteracciones

- El objeto seleccionado levanta ligeramente su base y muestra un anillo salvia.
- Añadir una meta deja el objeto en estado translúcido y muestra el saldo sin cambios.
- Confirmar una compra anima el objeto de translúcido a sólido y actualiza la barra.
- El gato responde a un toque con un movimiento corto y un mensaje breve.
- Una compra anulada hace la transición inversa y devuelve el objeto a pendientes.
- Todas las animaciones deben apagarse o reducirse con `prefers-reduced-motion`.

## Estrategia 3D gratuita

### Qué hacen realmente las referencias

`ScreensDesign` es principalmente una biblioteca de pantallas y recorridos de apps. Su portada organiza capturas de teléfonos, categorías y videos; sirve para estudiar jerarquía, onboarding y navegación, pero no es el motor 3D que debemos copiar.

`StringTune` sí usa una escena 3D real. La página expone varios canvas identificados como `three.js r157`, carga un modelo `katana.glb`, mapas separados de color, normales, rugosidad, metálico y altura, un entorno `lightroom.exr` y un decodificador Draco. Alrededor del modelo mezcla canvas 2D, SVG, imágenes y videos. La cámara y el modelo responden al scroll y al cursor, mientras que el resto de efectos se apoya en CSS y JavaScript modular.

La lección para Mi Independencia es separar las capas: un solo canvas R3F para el cuarto y los objetos, HTML/CSS para saldo y controles, y pequeñas animaciones ligadas a selección, pointer y scroll. No necesitamos replicar varias escenas ni mantener un render continuo. La mascota puede ser un GLB independiente con su propia animación; los objetos del hogar deben compartir escala, luces y materiales para que el cuarto se sienta uno solo.

Fuentes: [ScreensDesign](https://screensdesign.com/), [StringTune](https://string-tune.fiddle.digital/).

### Tecnología

Conservar React 18 + React Three Fiber 8 + Drei + Three, porque Fiber 8 corresponde a React 18 y ya está instalado. Usar GLB/GLTF para modelos externos y componentes propios para elementos simples. `gltfjsx` puede convertir un GLB en componentes React revisables.

### Fuentes de modelos

- [Poly Haven](https://polyhaven.com/license): modelos, texturas y HDRI con licencia CC0. Es la mejor fuente para materiales realistas.
- [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit): 140 recursos 3D con CC0, adecuados para una estética ligera y consistente.
- [Poly Pizza](https://poly.pizza): útil para mascotas y mobiliario low-poly; comprobar la licencia individual de cada recurso.
- [three-js-room-demo](https://github.com/adrianhensler/three-js-room-demo): referencia de interacción e iluminación, no dependencia ni fuente de assets.

No conviene consultar una API de modelos en cada visita. Los assets deben revisarse, optimizarse y guardarse dentro del proyecto o en almacenamiento propio, con licencia y atribución documentadas.

### Rendimiento móvil

La documentación de React Three Fiber recomienda `frameloop="demand"` para no renderizar continuamente una escena quieta. Drei permite `ContactShadows` con `frames={1}` para una sombra estática. La experiencia de WebGL de web.dev confirma que en móvil pesan especialmente el tamaño del canvas, los materiales, los shaders y la iluminación.

Decisiones iniciales:

- Canvas con DPR limitado y resolución reducida en pantallas pequeñas.
- GLB por habitación, con objetos comprables separados solo cuando necesiten interacción.
- Texturas de 1K o 2K para móvil; evitar HDRI pesado en el primer render.
- Pocos materiales y luces cálidas; sombras de contacto en una sola pasada.
- Carga diferida del cuarto y fallback de lista si WebGL falla.
- Objetivo de carga: escena inicial pequeña y objetos adicionales bajo demanda. El tamaño final se medirá en un teléfono real antes de publicar; no se fija un número sin medir el modelo elegido.

Fuentes: [R3F scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [Drei ContactShadows](https://drei.docs.pmnd.rs/staging/contact-shadows), [web.dev WebGL móvil](https://web.dev/case-studies/hobbit), [Three.js DRACO](https://threejs.org/docs/pages/DRACOExporter.html).

## Orden recomendado para mañana

1. Revisar el cuarto 3D y elegir una dirección visual: low-poly suave o GLB realista estilizado. Recomiendo low-poly suave con dos o tres assets CC0 destacados para no perder rendimiento.
2. Definir el modelo de datos de metas y la relación compra-gasto antes de conectar botones reales.
3. Integrar Mi hogar en `App.tsx` con datos de Supabase conservando las vistas de Gastos actuales.
4. Probar la escena y el flujo de saldo en 390 px, 768 px y escritorio.
5. Publicar solo después de comprobar compras, anulaciones, saldos negativos, RLS y carga en móvil.
