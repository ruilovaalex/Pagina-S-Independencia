# Dirección técnica para Ecuador

Investigación realizada el 6 de octubre de 2026 para Mi Independencia. Este documento convierte las referencias visuales y las necesidades de la app en decisiones de implementación. La prioridad es conservar los gastos actuales, añadir un hogar 3D útil y dejar el backend preparado para que cada compra afecte al saldo una sola vez.

## Decisiones de producto localizadas

La aplicación es privada y de uso propio. Por eso priorizamos sencillez y mantenimiento: no construiremos un banco, una plataforma social, un comparador de precios ni un sistema de analítica de producto.

### Moneda, fechas y lenguaje

Ecuador usa el dólar estadounidense como moneda de curso legal; los registros monetarios deben almacenarse en centavos enteros y mostrarse con `Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })`. La interfaz usará español claro, fechas ISO en datos y `America/Guayaquil` para agrupar meses y días. No se añadirá conversión de divisas, criptomonedas ni lógica tributaria mientras la app sea un presupuesto personal.

El precio de un electrodoméstico o mueble será un valor introducido por la persona. Si más adelante se muestran precios de tiendas, se guardará la fuente y se aclarará si el precio incluye IVA; no se debe inferir un impuesto desde el frontend.

Fuente monetaria: [Banco Central del Ecuador](https://www.bce.fin.ec/los-criptoactivos-no-son-una-moneda-de-curso-legal-ni-un-medio-de-pago-autorizado-en-ecuador/).

### Privacidad y confianza

La app maneja datos financieros personales, aunque no sea un banco. Para una instalación personal es suficiente con:

- una nota sencilla que explique qué se guarda y dónde;
- exportación y eliminación como mejoras posteriores, si realmente hacen falta;
- ninguna analítica ni envío de datos a terceros;
- ningún número de tarjeta, clave bancaria, token de banca ni credencial de una tienda;
- almacenamiento mínimo: nombre visible, movimientos, metas, preferencias visuales y auditoría de cambios.

La SPDP sirve como referencia de minimización y seguridad si la app se comparte en el futuro. Para el uso personal actual, la decisión práctica es pedir pocos datos, mantener RLS y no integrar servicios externos innecesarios. No es una opinión legal.

Fuentes: [consultas de la SPDP 2026](https://spdp.gob.ec/consultas2026/), [guías de la SPDP](https://spdp.gob.ec/guias-spdp/), [política de datos de la SPDP](https://spdp.gob.ec/politica-de-proteccion-de-datos/).

## Backend recomendado

### Fuente única de movimientos

El saldo no debe ser un número editable que se recalcula en varios componentes. Debe derivarse de movimientos en centavos:

```text
saldo = saldo_inicial + ingresos - gastos
```

La compra de un objeto del hogar crea un gasto con `source = 'home_purchase'` y `home_item_id`. El vínculo único evita duplicar el descuento si la persona pulsa dos veces o recarga la página. Anular una compra debe marcar ese movimiento como anulado y recalcular el saldo; no se deben borrar registros financieros silenciosamente.

Para la primera integración se puede representar el saldo inicial como un ingreso especial llamado `Saldo inicial`. Si la experiencia crece, la migración recomendada es:

- `home_items`: objeto, precio objetivo, estado, posición visual y estilo;
- `home_contributions`: aportes a una meta, en centavos;
- `financial_movements`: ingreso o gasto, fecha local, categoría, fuente y vínculo al objeto;
- `room_preferences`: paleta, fondo y nombre del cuarto, sin datos financieros.

Las restricciones de base deben impedir importes negativos accidentales, estados desconocidos y dos movimientos activos para la misma compra. Una operación de compra debe ser atómica: validar saldo permitido, insertar o actualizar el movimiento y cambiar el estado del objeto en una sola transacción.

### Supabase y Vercel

El navegador solo debe usar la URL del proyecto y la clave publicable. Cada tabla expuesta debe tener RLS con `auth.uid()` y políticas de propietario para `SELECT`, `INSERT`, `UPDATE` y `DELETE`. La clave `service_role` o cualquier secreto se queda en una función de servidor y nunca se incluye en `VITE_*`.

La documentación actual de Supabase recomienda exactamente ese reparto: cliente público con RLS y secretos solo en backend. Vite expone al navegador cualquier variable con prefijo `VITE_`, así que las variables privadas deben permanecer sin ese prefijo y solo usarse en funciones del servidor. Separar `.env.local`, preview y producción evita mezclar datos de prueba con el proyecto real.

Fuentes: [Supabase: proteger datos](https://supabase.com/docs/guides/database/secure-data), [Supabase: claves API](https://supabase.com/docs/guides/api/api-keys), [Vite: variables y modos](https://vite.dev/guide/env-and-mode).

### Qué debe ejecutarse en servidor

No necesitamos una API bancaria para esta versión. El cliente puede leer y escribir sus propios movimientos mediante Supabase y RLS. Conviene usar una función/RPC protegida para la compra atómica cuando conectemos el hogar real. Una Edge Function queda reservada para tareas que sí requieran secreto, como un catálogo externo de precios, correos o una integración futura autorizada.

No se debe usar `user_metadata` para autorizar acciones. La autoridad debe provenir de la sesión validada y de las políticas RLS. Toda mutación debe devolver el registro persistido y el saldo calculado desde la base, para que la interfaz no quede con un estado optimista incorrecto.

## Frontend y dirección Supahero

La referencia de [Supahero para Wise](https://supahero.io/hero/wise) funciona por una idea visual concreta: un titular grande, una composición editorial y una acción clara que resume el producto. Para Mi Independencia la traducción será un héroe de “Tu hogar en progreso”, una escena 3D protagonista y una sola acción primaria (“Registrar ahorro” o “Añadir meta”).

La personalidad se mantiene con una tipografía display condensada para titulares, una sans legible para datos y números grandes con aire. La paleta protagonista será rosa pastel y verde salvia, con fondos crema y tinta oscura para contraste. El rosa comunica avance y el verde confirma ahorro o compra; no se usará el color como único indicador: cada estado llevará texto e icono.

La composición en escritorio puede usar un bloque asimétrico: escena al centro, resumen de saldo arriba y próxima meta a la derecha. En celular se convierte en flujo vertical: saldo, acción, escena, próxima meta y objetos. El menú debe conservar dos destinos: **Mi hogar** y **Gastos**. Dentro de Gastos permanecen las pestañas actuales de Gastos, Ingresos y Finanzas.

## 3D que sí conviene para móvil

Los modelos se deben revisar, convertir a GLB y guardar en el proyecto o en Storage propio. Poly Haven ofrece recursos CC0 y Kenney tiene un kit de muebles CC0; Poly Pizza es útil para una mascota, pero cada modelo exige revisar su licencia. No conviene consultar una API de modelos en cada visita: añade latencia, fallos de CORS, cambios de licencia y un peso impredecible.

El cuarto debe comenzar con pocos objetos y cargar los siguientes bajo demanda. Para una escena quieta usaremos `frameloop="demand"`, sombras de contacto de una sola pasada y DPR limitado. En pantallas pequeñas se reducirán texturas, luces y geometría; si WebGL no está disponible aparecerá una tarjeta de objetos con el mismo flujo de metas.

Fuentes: [licencia de Poly Haven](https://polyhaven.com/license), [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit), [R3F: rendimiento](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [Drei ContactShadows](https://drei.docs.pmnd.rs/staging/contact-shadows), [web.dev: WebGL móvil](https://web.dev/case-studies/hobbit).

## Roadmap de implementación

1. Convertir la maqueta en componentes de `App.tsx` sin tocar primero la lógica existente de Gastos.
2. Añadir formato Ecuador, saldo inicial visible y fuente `home_purchase` en el modelo de movimientos.
3. Crear la migración mínima con tablas, restricciones y RLS; probarla en desarrollo antes de producción.
4. Conectar una compra de Mi hogar a un único gasto y verificar compra, anulación, saldo negativo y doble clic.
5. Reemplazar progresivamente los objetos procedurales por dos o tres GLB optimizados con licencia documentada.
6. Probar navegación y saldo en 390, 768 y escritorio, además de un fallback sin WebGL.
7. Revisar consola, tamaño de chunks y RLS antes de publicar en Vercel.

La siguiente implementación debe empezar por el modelo de movimientos y la integración de Mi hogar en la aplicación real. La ruta `home-preview.html` seguirá sirviendo para probar la dirección visual, pero no será la fuente de datos ni el destino de producción.
