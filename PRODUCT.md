# Mi Independencia

## Propósito
App web personal para organizar dinero en USD y construir visualmente un hogar. Uso individual en Ecuador; no es un producto bancario, una landing comercial ni un dashboard empresarial.

## Tareas principales
- Consultar saldo disponible y registrar saldo inicial, ingresos y gastos.
- Planificar compras y ahorro sin perder la información financiera existente.
- Cambiar de habitación, colocar muebles y personalizar el hogar con decoración gratuita.
- Disfrutar de un gato pequeño y tranquilo como compañero.

## Estructura
Dos apartados principales: Mi hogar y Gastos. Gastos conserva los flujos de ingresos, gastos y finanzas. Mi hogar concentra habitaciones, catálogo, inventario y personalización.

## Reglas de comportamiento
- Quitar un objeto de una habitación no elimina su compra ni devuelve dinero.
- Una compra afecta el saldo una sola vez; decoración gratuita no genera movimientos.
- Mantener visibles las consecuencias financieras de una compra, incluido saldo negativo.
- No ocultar funcionalidades necesarias en celular.
- En la vista de prueba, simular datos en memoria. La conexión a Supabase se hará después; no presentar esa simulación como guardado permanente.
- No publicar en GitHub ni Vercel durante la revisión local.

## Prioridades
Habitación protagonista; controles discretos; cifras fáciles de leer; interacción directa y alternativa a arrastrar. Menos instrucciones repetidas y gráficos; más información accionable.

## Límites de esta revisión
Documentar y auditar frontend. No sustituir modelos, modificar colisiones, cambiar autenticación ni conectar datos remotos.
