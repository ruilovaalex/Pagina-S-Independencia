# Hogar conectado

Proyecto de producción verificado: `itrvbevqzqklgwtggwgb`.
Vercel usa esta URL en `VITE_SUPABASE_URL`; las credenciales privadas siguen solo en el servidor.

El 7 de octubre de 2026 se aplicaron mediante SQL Editor las migraciones
`20261007013050_personal_notebook_home.sql` y `20261007232201_home_personalization.sql`.
No volver a ejecutarlas sobre este proyecto: ya existen las tablas y políticas.
La migración inicial no se ejecutó: las tablas originales ya estaban creadas.

Se conservaron 5 gastos, 1 ingreso y 1 usuario. El catálogo real estaba vacío.
No se copiaron datos ficticios de la vista de prueba ni se borraron datos originales.

HomeLive carga el hogar y el saldo inicial desde Supabase. El botón Guardar hogar
persiste muebles, posiciones, rotaciones, paredes, suelo, decoración, habitación activa
y nombre del gato. Las revisiones impiden sobrescribir cambios de otra pestaña.
El saldo inicial se guarda por separado en financial_preferences, sin localStorage.
Ingresos, gastos y presupuesto conservan sus tablas originales.

Validación remota: inserción y actualización con rol authenticated y auth.uid(),
seguidas de rollback; RLS activado en ambas tablas y recuentos originales conservados.
La vista home-preview.html sigue siendo una simulación aislada.
