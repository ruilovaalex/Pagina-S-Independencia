# Auditoría frontend · 7 octubre 2026

## Alcance y método
Vista local `home-preview.html`; HomePreview, RoomScene y estilos de hogar. No es una auditoría completa de Gastos, seguridad, Supabase ni modelos 3D. Se cargó Impeccable 4.5.0 desde `pbakaus/impeccable`, revisión `4758b4d397086048db2517e4603686c9a9a4708f`, instalado solo en `.agents/skills/impeccable` del proyecto. Contexto cargado mediante su launcher; detector ejecutado una vez sobre cuatro archivos. No se habilitaron hooks.

Playwright: contexto aislado, escritorio 1191×668, móvil 390×844 y segunda comprobación con entrada táctil emulada. Capturas tomadas tras abrir Acomodar, con desplazamiento de página; no representan el primer viewport. Build de producción ejecutado. No se modificó la interfaz.

## Integridad de implementación
**Parcial:** la dirección del hogar y la separación de herramientas ya son propias del producto. La cascada de estilos conserva decisiones de varias etapas, lo que dificulta mantener un único sistema. Las alertas estéticas del detector no deben reemplazar la identidad aprobada.

## Puntuación orientativa
No equivale a certificación WCAG ni a medición Lighthouse.

| Dimensión | /4 | Evidencia principal |
| --- | --- | --- |
| Accesibilidad | 2 | Etiquetas y capas decorativas aria-hidden presentes; faltan comprobaciones exhaustivas de contraste, teclado y lector de pantalla. |
| Rendimiento | 2 | Escena diferida y render demand presentes; chunk 3D grande. No hay medición de FPS ni de equipo físico. |
| Responsive | 3 | Sin overflow en los tamaños probados; editor y controles fuera del canvas. Puntos de decoración pequeños. |
| Tokens y tema | 1 | Colores repetidos y hard-coded en varias hojas. Tema oscuro no es requisito y no se penaliza su ausencia. |
| Integridad | 2 | Identidad clara pero overrides sucesivos y una alerta estética contextual. |
| Total | **10/20** | Priorizar consistencia y controles táctiles antes de más efectos. |

## Hallazgos priorizados

### P2 · Puntos de decoración de 28×28 px
- Ubicación: `src/styles/home-brutalist.css`, regla `.decor-slot`; puntos Html en RoomScene.
- Evidencia: los cuatro puntos midieron 28 px. La regla final sobrescribe el tamaño anterior de 38 px; no reciben la ampliación coarse de otros controles.
- Impacto: precisión exigida para colocar decoración, especialmente en celular.
- Recomendación: objetivo táctil invisible de 44 px manteniendo símbolo pequeño; revisar separación y oclusión de puntos en cámara. No declarar una infracción WCAG únicamente por no alcanzar 44 px: el mínimo y sus excepciones son distintos.
- Siguiente acción: Impeccable adapt.

### P2 · Sistema visual repartido en overrides
- Ubicación: `src/home-preview.tsx` importa home, pastel, finance, editorial, controls, papercut y brutalist; `home-brutalist.css` redefine repetidamente stage, controles, catálogo y editor.
- Impacto: futuros ajustes pueden reintroducir solapamientos o diferencias entre móvil y escritorio.
- Recomendación: consolidar tokens y reglas por componente conservando la apariencia actual. No sustituir toda la página.
- Siguiente acción: Impeccable extract y polish.

### P2 · Chunk 3D pesado
- Evidencia: build correcto; RoomScene 971.86 kB minificado, 270.31 kB gzip; advertencia Vite >500 kB. La escena ya tiene carga diferida.
- Impacto: posible demora al entrar al hogar; tamaño por sí solo no demuestra bajo FPS.
- Recomendación: medir carga de escena, llamadas de dibujo y tiempo de frame antes de dividir módulos o introducir modelos nuevos. Instancing para geometría repetida si las mediciones lo justifican.
- Siguiente acción: Impeccable optimize. Tratamiento de geometrías específico de Three.js.

### P3 · Borde de acento en saldo
- Detector: `side-tab`, `home-brutalist.css:95`, borde izquierdo rosa de 3 px.
- Verificación: el bloque existe y tiene radio computado de 0 px. Es una decisión editorial de papel, no un defecto funcional demostrado.
- Recomendación: comparar una variante con etiqueta o línea fina solo si mejora jerarquía; no eliminar rosa ni crema por obedecer al detector.
- Siguiente acción: Impeccable critique/polish.

## Falso positivo del detector
`border-accent-on-rounded`, `home-brutalist.css:26`: señala un borde superior de 3 px en objects-panel. Una regla posterior lo reduce a 1 px; el detector estático no resuelve toda la cascada. No tratarlo como defecto confirmado.

## Qué funciona
- Cuarto como superficie principal, resumen y título debajo.
- Editor y barra de vista no cubren el canvas: mobile canvas bottom 298.38, editor top 312.38, controles top 556.55 (coordenadas durante scroll).
- Sin overflow horizontal en escritorio ni móvil, incluida emulación coarse.
- En coarse, pestañas y presets de color tienen al menos 44 px. Sus tamaños menores en viewport estrecho sin touch no son un fallo táctil confirmado.
- No hubo excepciones JavaScript en el flujo de abrir/cerrar edición y abrir catálogo.
- Imágenes vintage cargadas; alt vacío coherente con carácter decorativo.
- Inputs inspeccionados con etiquetas; capas papercut con aria-hidden, por lo que textContent duplicado no prueba lectura duplicada accesible.

## Pendientes de verificación
- Tap emulado en un punto ejecutado, pero no se confirmó persistencia de decoración con la aserción usada. No declarar colocación táctil validada ni fallida con esa evidencia.
- No se probó arrastre táctil sintético, teléfono físico, teclado completo, contraste de todos los estados, preferencias de movimiento dinámicas ni accesibilidad del diálogo.
- No se midieron LCP, FPS o memoria. No se certifican rendimiento ni WCAG.
- Finanzas y backend fuera del alcance. Datos simulados y sin conexión remota.
- Impeccable informa que PRODUCT.md no usa su esquema completo actual; `init` puede migrarlo posteriormente conservando las decisiones confirmadas. No bloquea esta revisión.

## Orden recomendado
1. Adapt: puntos de decoración táctiles y comprobación de colocación.
2. Extract: tokens y limpieza de cascada sin cambios visuales grandes.
3. Optimize: medición de carga y render 3D.
4. Polish: pase final de jerarquía y controles, siguiendo DESIGN.md.

Separar la fase Three.js: huellas de colisión, superficies de apoyo, actualización de sombras y modelos coherentes. Estos cambios no se hicieron en esta auditoría.
