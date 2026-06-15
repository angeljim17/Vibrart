# VIBRART — Álbum Digital

App web del festival **VIBRART** para que los asistentes suban fotos a álbumes colaborativos (**VIBRART 2026** y **Souvenirs**), con galerías públicas y panel de administración.

## Stack

- HTML, CSS, JavaScript (SPA modular)
- Supabase (PostgreSQL, Storage, Auth)
- Node.js (servidor local alternativo)

## Funcionalidades

- Pantalla de bienvenida con animación y logo del festival
- Álbumes **VIBRART 2026** y **Souvenirs** con subida de fotos y descripción
- Galerías públicas para ver las fotos subidas
- Panel de administración para gestionar y eliminar contenido
- Enlaces a redes sociales: Instagram, Facebook y LIVE·TEC

## Estructura

```
Vibrart/
├── index.html
├── screens/
│   ├── intro.html
│   ├── landing.html
│   ├── upload-2026.html
│   ├── upload-souvenirs.html
│   ├── gallery-2026.html
│   ├── gallery-souvenirs.html
│   └── admin.html
├── css/
├── js/
├── supabase/
└── docs/SUPABASE.md
```

## Cómo ejecutar

Las pantallas se cargan con `fetch`, así que necesitas un servidor local:

```bash
npx serve .
```

Abre siempre **`index.html`** con el servidor. Los archivos en `screens/` son fragmentos HTML, no páginas completas.

## Configurar Supabase

Guía completa: **[docs/SUPABASE.md](docs/SUPABASE.md)**

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ejecuta `supabase/setup.sql` en el SQL Editor
3. Copia `js/config.local.example.js` → `js/config.local.js` y agrega tu URL y clave
4. Inicia el servidor y sube fotos al álbum

Alternativa local sin Supabase: `cd server && npm start` (ver `server/README.md`).

## Enlaces del festival

- [Instagram](https://www.instagram.com/vibrartfestival/)
- [Facebook](https://www.facebook.com/VibrArtFestival/)
- [LIVE·TEC](https://live.tec.mx/vibrart)

## Autor

**Ángel Jiménez Morales** — [GitHub](https://github.com/angeljim17)
