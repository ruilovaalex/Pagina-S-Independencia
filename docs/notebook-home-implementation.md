# Libreta y hogar: implementación local

## Alcance acordado

Simulación en `home-preview.html`, dentro del proyecto React existente. No se publicó en GitHub/Vercel ni se modificó una base remota. Datos ficticios en memoria: recargar reinicia la prueba. Las preferencias visuales del fondo pueden usar almacenamiento del navegador; el dinero, las metas y las distribuciones de la simulación no lo usan.

## Arquitectura revisada

- `App.tsx` mantiene los formularios y consultas Supabase existentes. Compra marcada y gasto registrado todavía son operaciones separadas en la app real.
- `HomeLive` y `HomePreview` comparten `RoomScene`, materiales, controles y mascota. Las mejoras visuales y del gato están en componentes del proyecto, no en un HTML aislado.
- `house-state.ts` maneja cuatro distribuciones y una ubicación por objeto. Una posición omitida significa inventario; no vuelve a aparecer al validar. Compra y posición son estados separados.
- `useRoomLayout` admite una fuente externa para la simulación y conserva el mecanismo legado de la app real hasta integrar Supabase. Movimiento, giro, colisiones y deshacer siguen disponibles.
- `notebook.ts` calcula importes en centavos. `NotebookPlanner` aporta presupuesto, reservas y próximos pagos al apartado Finanzas; los formularios existentes de gastos e ingresos se conservan.

## Fases realizadas

1. Identidad crema, verde y rosa; títulos con tratamiento recortado sobre Anton ya instalado. No existe Paper Kuto en el proyecto y no se incorporaron sus glifos. Información funcional en sans-serif limpia. Sticker original del usuario, sin imágenes generadas.
2. Sala, dormitorio, cocina y baño con distribuciones separadas; colores de pared por habitación; catálogo filtrado; devolver al inventario, traslado y deshacer. Los pendientes se muestran como previsualizaciones; comprarlos cambia su apariencia.
3. Mascota pequeña: respiración/idle en intervalos, parpadeo, cola, mirada al objeto, saludo, juego, paseo corto validado contra muebles, sentarse y dormir. Celebraciones ante compras y metas/habitaciones completadas; reacción breve al saldo insuficiente. Canvas a demanda, animaciones finitas, pausa al ocultarse y respeto a movimiento reducido.
4. Presupuesto mensual, metas con reservas y faltante, próximos pagos y resumen. Registrar un pago crea un gasto de prueba y quita el compromiso; planificar o reservar no descuenta dinero.

## Significado de los números

- Saldo = saldo inicial + ingresos registrados − gastos, incluyendo compras ficticias del hogar una vez.
- Libre para gastar = saldo − reservas activas − pagos previstos de 30 días, limitado por el presupuesto del mes actual después de proteger sus pagos pendientes. Nunca negativo. Consultar un mes histórico no aumenta este importe.
- Proyección = saldo − pagos conocidos en 30 días, incluidos vencidos. No supone ingresos futuros ni descuenta reservas otra vez.
- Excedente/porcentaje mensual = ingresos − gastos del mes / ingresos del mes. Es ahorro potencial, no dinero realmente transferido. Sin ingresos no se inventa un porcentaje.
- Comprar un objeto libera su reserva asociada. Quitar una meta libera la reserva sin crear ingresos.

## Preparado, todavía sin activar

Migración creada con Supabase CLI: `20261007013050_personal_notebook_home.sql`. Contiene `home_saves` y `financial_preferences`, RLS por `auth.uid()`, validación de objetos propios y revisión para evitar sobrescrituras. `home-repository.ts` admite cliente y usuario explícitos; **no está conectado ni ejecutado en la simulación**. PGlite verifica la migración localmente.

Antes de conectar al proyecto existente: aplicar y verificar la migración en desarrollo; cargar/validar layouts antes de guardar; mostrar estados de guardado y conflictos; importar el saldo/layout legado mediante una acción explícita. Metas y pagos aún requieren su esquema persistente. Las compras y pagos reales necesitan transacciones e identificadores de vínculo con gastos para evitar doble descuento; no se debe recalcular automáticamente el historial de compras antiguas.

## Investigación utilizada

- [CFPB: Your Money, Your Goals](https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/toolkit/): registro de ingresos/gastos, calendario de pagos y planificación de compras. Se aplicaron patrones generales, con USD, `es-EC` y fechas `America/Guayaquil`; no reglas bancarias estadounidenses.
- [NN/g: Microinteractions](https://www.nngroup.com/articles/microinteractions/): respuesta breve a una acción concreta. Aplicación: gestos del gato tras cambios de estado, sin recompensas que incentiven gastar.
- [W3C: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html): respetar la preferencia de movimiento reducido.
- [React Three Fiber: rendimiento](https://r3f.docs.pmnd.rs/advanced/scaling-performance): render a demanda y animación mediante refs, sin estado React por cuadro. Documentación consultada con Context7 para Fiber 8.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): políticas SELECT y UPDATE con USING/WITH CHECK, permisos explícitos y autorización por propietario.

## Verificación

### Pulido de mascota y papercut

El modelo compartido tiene cuatro patas articuladas, cuerpo más horizontal, tonos crema mate, ojos verde oscuro y detalles rosa. `cat-pose.ts` interpola las articulaciones de pie/sentado/dormido; dormir baja cabeza y torso y recoge las patas, sin comprimir el modelo entero. El descanso se conserva entre gestos y cambios de habitación; despertar interpola hacia la postura inicial. El paseo usa pasos diagonales y giro suave, dentro del recorrido libre validado. Los gestos espontáneos son ráfagas cada 20 segundos; pausa, edición y movimiento reducido detienen la animación.

Se reforzaron los recortes angulares de los títulos sobre la fuente existente y se añadieron detalles de cinta de papel. Los controles y datos financieros conservan su tipografía funcional. El favicon de prueba reutiliza el sticker original. Las pruebas de poses y parpadeo elevan la suite a 41 casos.

`npm test`, `npm run typecheck` y `npm run build`. Playwright en sesiones aisladas: navegación, habitaciones, inventario/deshacer, traslado/giro, zoom, compra, saldo negativo, presupuesto, reservas, pago único, tipografía funcional y diálogos a 320/390 px; revisión visual de escritorio y móvil. La conexión real y el rendimiento en un teléfono físico siguen pendientes.

### Habitaciones y dirección brutalista
La vista de prueba pasa roomId a RoomScene. Sala conserva la arquitectura existente; dormitorio incorpora ventana panorámica y panelado; cocina tiene baldosas, mesón y armarios; baño tiene ducha, lavabo, espejo e inodoro. Las instalaciones de cocina y baño ocupan una franja trasera fuera del área editable, sin crear compras ni alterar el saldo. El tema home-brutalist.css se importa al final y mantiene la tipografía funcional y la paleta crema/verde/rosa.
Verificación: build con TypeScript correcto, 41 pruebas aprobadas y cambio entre las cuatro habitaciones y Gastos en móvil de 390 px sin desbordamiento ni errores de consola. Sigue la advertencia de tamaño del módulo 3D. Datos simulados; sin publicación ni escrituras remotas.
