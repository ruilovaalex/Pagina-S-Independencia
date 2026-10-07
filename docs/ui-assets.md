# Botones y recursos visuales del hogar

Se reutiliza `src/app/components/ui/button.tsx`, basado en Radix Slot 1.1.2 y class-variance-authority 0.7.1. El estilo del hogar vive en `src/styles/home-controls.css`; los controles conservan sus eventos, etiquetas, estado deshabilitado y navegación por teclado. No se añade una biblioteca ni una API remota.

Referencias consultadas:
- [Radix Button](https://www.radix-ui.com/themes/docs/components/button): estados y variantes de botones.
- [Radix Slot](https://www.radix-ui.com/primitives/docs/utilities/slot): composición del componente existente.
- [Uiverse Buttons](https://uiverse.io/buttons): catálogo de componentes abiertos. No se copió código del catálogo.

Imagen utilizada, sin generación ni modificación:
- `public/images/fluent/house-3d.png`: [House 3D de Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji/blob/1ffb34c752ecf5d402f04cfb4b392c77f57c54bc/assets/House/3D/house_3d.png), 43 007 bytes, commit `1ffb34c752ecf5d402f04cfb4b392c77f57c54bc`.
- Copyright Microsoft Corporation. Licencia MIT original conservada en `public/images/fluent/LICENSE.txt`.

La marca y el collage del hero usan ahora `public/images/vintage-kittens.png`, imagen proporcionada por el usuario, sin generación ni modificación. El recurso Fluent se conserva con su licencia y no se usa como marca. Las imágenes se sirven desde el propio proyecto.

Paper Kuto no está en el proyecto. `PaperCutText.tsx` aplica recortes CSS y pequeñas rotaciones a Anton, ya instalada, exclusivamente en títulos, rótulos y botones especiales. Los saldos, precios, formularios, tablas y navegación conservan una sans-serif funcional. No se descargó ni se copió una tipografía protegida.

## Fotografía de papel arrugado
public/images/crumpled-paper.jpg — D Sharon Pruitt / Pink Sherbet Photography. Fuente: https://commons.wikimedia.org/wiki/File:Free_crumpled_paper_texture_for_layers_(2978651767).jpg . CC BY 2.0: https://creativecommons.org/licenses/by/2.0/ . Miniatura 960 px, recorte y tinte mediante CSS; crédito visible en la página.

## Fotografía natural
public/images/meadow.jpg — Small colorful flowers on the meadow, FTKelle, CC0. Fuente: https://commons.wikimedia.org/wiki/File:Small_colorful_flowers_on_the_meadow.jpg . Miniatura 800 px, recorte visual CSS. Inspiración de composición: Pinterest Nurture, sin copiar la imagen del pin.
`n## Fotografía personal`npublic/images/our-photo.png — foto proporcionada por el usuario, mejora suave de nitidez y exposición mediante imagegen. Original conservado en our-photo-original.png. Sustituye el prado en el recorte del hogar.
