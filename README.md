# VIBRART — Álbum Digital

Aplicación del álbum digital del festival VIBRART, organizada por pantallas en archivos separados.

## Estructura del proyecto

```
Vibrart/
├── index.html              # Contenedor principal
├── screens/                # Una pantalla por archivo HTML
│   ├── intro.html
│   ├── landing.html
│   ├── upload-2026.html
│   ├── upload-souvenirs.html
│   └── admin.html
├── css/
│   ├── base.css            # Estilos globales y transiciones
│   ├── intro.css
│   ├── landing.css
│   ├── upload.css
│   └── admin.css
├── js/
│   ├── config.js           # Rutas y enlaces sociales
│   ├── utils.js            # localStorage, toast
│   ├── router.js           # Carga de pantallas y navegación
│   ├── warp.js             # Animación fondo intro
│   ├── upload.js           # Subida de fotos
│   ├── admin.js            # Panel admin
│   └── main.js             # Inicio
└── assets/
    ├── Logo_Vibrart.png
    └── artistas.png (foto de artistas, 2.ª pantalla)
```

## Enlaces sociales (landing)

- [Instagram](https://www.instagram.com/vibrartfestival/)
- [Facebook](https://www.facebook.com/VibrArtFestival/)
- [LIVE·TEC](https://live.tec.mx/vibrart)

## Cómo ejecutar

Las pantallas se cargan con `fetch`, así que necesitas un servidor local:

```bash
npx serve .
```

Luego abre la URL que indique (por ejemplo `http://localhost:3000`).

### Vista previa en Cursor / VS Code

Abre siempre **`index.html`** (tiene `<head>` y `<body>`).

Los archivos en `screens/` son **fragmentos** (solo un `<section>`), no páginas completas. Si abres `screens/landing.html` con Live Preview, verás el aviso:

> *Live Reload is not possible without a head or body tag.*

Eso es normal: usa `index.html` con un servidor local, no los `.html` sueltos de `screens/`.

## Subida real de fotos (Supabase recomendado)

Guía completa: **[docs/SUPABASE.md](docs/SUPABASE.md)**

Resumen:

1. Crea proyecto en [supabase.com](https://supabase.com).
2. Ejecuta `supabase/setup.sql` en el SQL Editor.
3. Copia `js/config.local.example.js` → `js/config.local.js` y pega tu **URL** y **anon key**.
4. `npx serve .` → sube fotos → **Subir fotos al álbum**.

Alternativa local sin Supabase: `cd server && npm start` (ver `server/README.md`).

Las fotos pendientes muestran **●**; al subir correctamente pasan a **✓**.

## Pantallas

1. **intro** — Álbum digital, logo, CTA
2. **landing** — Elegir VIBRART 2026 o SOUVENIRS
3. **upload-2026** / **upload-souvenirs** — Subir fotos con descripción
4. **admin** — Ver y borrar fotos guardadas en el navegador
