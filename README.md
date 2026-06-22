# Ganchito — Landing page (prototipo)

Landing de una sola página para Ganchito, hecha en HTML + CSS + JS puro
(sin frameworks, sin build, sin npm). Se abre directo en el navegador o
con Live Server desde VS Code.

## Cómo verla

1. Descomprimí la carpeta `ganchito/` tal cual está (no muevas los
   archivos de lugar, las rutas son relativas).
2. En VS Code: clic derecho sobre `index.html` → **Open with Live Server**
   (o lo que uses vos). También funciona si abrís `index.html` directo
   con doble clic.

## Estructura

```
ganchito/
├── index.html      → toda la estructura y el contenido de la página
├── styles.css       → estilos (paleta, tipografías, layout, responsive)
├── script.js        → WhatsApp, menú mobile, modal de producto, mosaico interactivo
└── assets/
    └── images/
        ├── logo-icono.png              → ícono del carrito-G (header y footer)
        ├── logo-ganchito.png           → logo completo con texto (sin usar todavía, queda disponible)
        ├── mesa-rustica-negra.jpg      → foto real (hero + card "Mosaico Negro")
        ├── mesa-rustica-amarilla.jpg   → foto real (card "Mosaico Mostaza")
        └── mesa-rustica-amarilla-detalle.jpg → recorte de la misma foto (sección "Nuestro oficio")
```

## Qué hace cada sección

- **Header**: logo, menú (Mesas / Nuestro oficio / Contacto) y botón
  directo a WhatsApp. En mobile el menú se colapsa en un botón ☰.
- **Hero**: título, bajada y dos botones que llevan a la colección y a
  la mesa personalizada.
- **Mesas ratonas**: 3 cards con precio fijo de `$100.000` cada una
  (`Desde $100.000` en la personalizada). Cada card tiene:
  - **Ver más** → abre un modal con foto grande, descripción, medidas,
    materiales y entrega.
  - **Comprar** → abre WhatsApp en una pestaña nueva con un mensaje ya
    armado (nombre de la mesa + precio). No hay carrito ni checkout real,
    es directo al chat como pediste.
  - La tercera card (**Personalizada**) no tiene foto real: tiene un
    mosaico hecho en CSS/JS con 4 paletas de color que se pueden tocar
    (navy, mostaza, nogal, oliva), pensado para la idea de "diseños
    personalizados" que ya usás en tus fotos de Instagram.
- **Nuestro oficio**: texto de marca + la foto del mate/libreta,
  conectando el oficio con la idea de "armar a mano, como una guitarra
  criolla" (paleta y maderas tomadas de tu propia foto de la mesa con
  la guitarra).
- **Footer**: WhatsApp, Instagram (ya apunta a `ganchito.olav`),
  ubicación y envíos.

## Lo único que tenés que cambiar antes de publicarla

1. **Número de WhatsApp** — en `script.js`, línea 11:
   ```js
   const WHATSAPP_NUMBER = "5492280000000"; // TODO: reemplazar
   ```
   Poné tu número real en formato `549` + código de área + número, sin
   espacios ni guiones (ej: `5492284123456`). Con ese único cambio se
   actualizan TODOS los botones de WhatsApp de la página (header,
   footer y las 3 cards).

2. **Fotos de las mesas** — hoy hay 2 fotos reales tuyas (mosaico negro
   y mosaico mostaza) y una tercera card sin foto (resuelta con el
   mosaico interactivo). Cuando tengas la foto de una tercera mesa real,
   reemplazá la card "Personalizada" o agregá una cuarta — el HTML de
   cada card está comentado para que sea fácil de copiar y pegar.

3. **Precios y textos** — están todos en `index.html`, buscá `$100.000`
   o el texto que quieras cambiar y editalo directo ahí. Las medidas,
   materiales y tiempos de entrega del modal son de ejemplo
   (`data-medidas`, `data-materiales`, `data-entrega` en cada card).

4. **Dominio / hosting** — es un prototipo estático, así que se puede
   subir tal cual a cualquier hosting (o incluso a GitHub Pages) sin
   necesidad de servidor ni base de datos.

## Notas de diseño

- Paleta: navy del logo (`#14213E`), crema de fondo (`#F7F3EC`) y los
  tonos de madera/mostaza sacados de tus propias fotos (la guitarra
  criolla y el mosaico mostaza).
  Tipografías: Zilla Slab para títulos (efecto "tallado/quemado en
  madera"), Jost para botones y menú (eco de las letras del logo) y
  Work Sans para el texto general.
- El detalle de "mosaico" (la franja a rayas debajo del hero y del
  footer) es un guiño directo a las baldosas reales de tus mesas.
- Es 100% responsive (mobile, tablet, desktop) y respeta accesibilidad
  básica: navegación por teclado, `alt` en imágenes, modal con foco y
  cierre con `Esc`.
