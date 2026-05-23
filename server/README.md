# API de subida (ejemplo)

Servidor Node para recibir las fotos del álbum.

## Iniciar

```bash
cd server
npm install
npm start
```

Escucha en `http://localhost:3001`.

Las fotos se guardan en `server/uploads/`.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/upload/vibrart-2026` | Fotos VIBRART 2026 |
| POST | `/api/upload/souvenirs` | Fotos SOUVENIRS |

**Body:** `multipart/form-data`

- `photos` — archivos imagen (varios)
- `descriptions` — JSON array de strings
- `album` — identificador del álbum

**Respuesta OK:**

```json
{
  "ok": true,
  "message": "3 foto(s) subida(s) a vibrart-2026",
  "urls": ["/uploads/..."],
  "count": 3
}
```

En producción, cambia las URLs en `js/config.js` → `upload.endpoints`.
