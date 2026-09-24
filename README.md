# Mi Independencia

App personal en español para organizar compras del hogar, gastos, ingresos, presupuesto, tiendas y precios. React 18 + Vite 6 + Tailwind 4 + Supabase JS 2.

## Desarrollo

Requiere Node.js 22.18 o superior (probado con Node 24) y npm.

1. Ejecutar `npm ci`.
2. Copiar `.env.example` a `.env.local` y completar los dos valores del proyecto Supabase.
3. Ejecutar `npm run dev`.

Sin configuración, la pantalla de acceso se muestra, indica que falta conectar Supabase y mantiene el inicio de sesión deshabilitado. No se conecta al proyecto original de Figma.

Comandos:

- `npm test`: fechas, cálculos, validaciones y migración SQL con permisos RLS sobre PostgreSQL en memoria.
- `npm run typecheck`: verifica el código TypeScript usado por la app.
- `npm run build`: verifica TypeScript y genera `dist/`.
- `npm run preview`: sirve la compilación local.

## Supabase: configuración para una sola persona

1. Crear un proyecto propio. Este código está preparado para un proyecto **nuevo**.
2. Ejecutar `supabase/migrations/202609240001_initial_schema.sql` en SQL Editor. La migración es transaccional y crea siete tablas, restricciones, índices y políticas RLS. Si ya hay tablas con esos nombres, primero revisar su estructura y sus datos; no borrarlos ni ejecutar la migración a ciegas.
3. Crear tu usuario en **Authentication → Users** (con correo confirmado) y desactivar **Allow new users to sign up** en la configuración de Auth. La aplicación solo tiene inicio de sesión.
4. Obtener la URL y la **publishable key** del proyecto y configurar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Iniciar sesión con la cuenta creada. Los registros quedan asociados a su usuario. El presupuesto inicial mostrado es $1500 y puede editarse, incluso a $0.

La clave publicable puede estar en el navegador; la protección la aplican las políticas RLS. No usar claves secretas ni `service_role` en variables `VITE_`. No subir `.env.local` a Git.

Tablas: `profiles`, `app_settings`, `products`, `expenses`, `incomes`, `stores` y `price_searches`. No se necesitan las Edge Functions generadas por Figma ni una API adicional.

## Vercel

1. Subir este directorio a tu repositorio de GitHub.
2. Importarlo en Vercel, seleccionando Vite y el directorio raíz que contiene `package.json`.
3. Configurar las dos variables anteriores en el entorno correspondiente.
4. Compilar con `npm run build`; la carpeta de salida es `dist`.
5. Configurar en Supabase la **Site URL** con la URL definitiva de Vercel.
6. Al cambiar variables `VITE_`, volver a desplegar: se incorporan durante la compilación.

`vercel.json` incluye la configuración de compilación, la navegación SPA y cabeceras básicas.

## Cómo se cuentan los datos

- Los precios de productos son **unitarios** y se multiplican por la cantidad.
- “Por comprar” suma únicamente productos pendientes, sin verse afectado por descuentos o sobreprecios de los ya comprados.
- Compras y movimientos de dinero son independientes. Marcar un producto como comprado actualiza la lista. Registrar su pago **una vez** en Gastos lo incluye en el balance.
- El balance es ingresos menos gastos del período. El historial de 3/6/12 meses incluye el mes actual y los meses calendario anteriores.
- Las fechas por defecto usan `America/Guayaquil`.
- La lista sugerida solo se agrega al pulsar su botón; una lista vacía permanece vacía.
- “Descargar respaldo” exporta tus registros de todas las tablas a JSON, con paginación. Es una exportación de datos de la app, no incluye contraseñas, sesiones ni una copia completa del servicio Auth. Todavía no hay restauración desde la interfaz.

## Verificación antes de usar datos reales

- Entrar, crear/editar/eliminar un producto, un gasto, un ingreso, una tienda y un precio.
- Cambiar la fecha de un movimiento a otro mes y comprobar ambos meses.
- Probar febrero, septiembre y diciembre; comprobar que el resumen no suma meses futuros.
- Guardar presupuesto cero y recargar.
- Eliminar todos los productos y recargar: no deben reaparecer.
- Cerrar sesión, volver a entrar y abrir desde otro dispositivo.
- Exportar JSON y comprobar que incluye los registros guardados.
- Confirmar que nuevos registros de usuarios están desactivados.

Las pruebas locales verifican el SQL y la lógica; la conexión, Auth y persistencia del proyecto real se verifican después de conectarlo.

## Referencias

- [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Permisos RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Claves de Supabase](https://supabase.com/docs/guides/api/api-keys)
  
