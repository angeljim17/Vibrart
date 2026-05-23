# Configurar Supabase para VIBRART

Guía paso a paso para que las fotos del álbum se suban a **Supabase** (Storage + base de datos).

---

## 1. Crear proyecto en Supabase

1. Entra en [https://supabase.com](https://supabase.com) e inicia sesión.
2. **New project** → elige nombre (ej. `vibrart`), contraseña de base de datos y región cercana a tus usuarios.
3. Espera a que el proyecto termine de crearse (~2 min).

---

## 2. Obtener URL y clave pública

Supabase cambió los nombres en el panel. Necesitas **dos cosas**:

### A) API URL (la que ya ves)

1. **Project Settings** (engranaje) → **API** o **API Keys**.
2. Copia **API URL** (antes se llamaba *Project URL*).  
   Ejemplo: `https://abcdefgh.supabase.co`  
   → En `config.local.js` va en `url`.

### B) Clave pública para el navegador

En la misma sección (**Settings → API Keys**), busca **una** de estas:

#### Opción 1 — Publishable key (panel nuevo, recomendada)

1. Pestaña **API Keys** (no “Legacy”).
2. Si no hay clave, pulsa **Create new API Keys**.
3. Copia **Publishable key** (empieza con `sb_publishable_...`).
4. En `config.local.js` → `publishableKey: 'sb_publishable_...'`.

#### Opción 2 — anon key (pestaña Legacy)

1. En **API Keys**, abre la pestaña **Legacy API Keys** (o “anon, service_role”).
2. Copia la clave **anon** marcada como **public** (empieza con `eyJ...`, es muy larga).
3. En `config.local.js` → `anonKey: 'eyJ...'`.

| Qué copiar | Dónde en Supabase | En config.local.js |
|------------|-------------------|---------------------|
| API URL | API URL / Project URL | `url` |
| Publishable key | API Keys → Publishable | `publishableKey` |
| anon (legacy) | Legacy API Keys → anon public | `anonKey` |

> Solo usa **Publishable** o **anon** en la web.  
> **Nunca** uses **Secret** ni **service_role** en el navegador.

### Atajo: botón Connect

En el proyecto, el botón **Connect** (arriba) también muestra URL y la clave que debes usar en el frontend.

---

## 3. Ejecutar el SQL de configuración

1. En Supabase: **SQL Editor** → **New query**.
2. Abre el archivo `supabase/setup.sql` de este proyecto.
3. Pega todo el contenido y pulsa **Run**.

Eso crea:

- Tabla `album_photos` (álbum, descripción, ruta, URL pública).
- Bucket `vibrart-album` en Storage (fotos públicas, máx. 12 MB).
- Políticas para **subir** fotos desde la web (público) y leer el álbum completo solo con permisos admin.

4. Ejecuta también **`supabase/admin-auth.sql`** (panel admin seguro).
5. Ejecuta **`supabase/public-gallery.sql`** (botón «Ver lo que otros subieron»: muestra imagen, **nombre** y **descripción**; no expone correo ni teléfono). Si ya existía la vista antigua, el script la borra y la vuelve a crear.
6. Ejecuta **`supabase/admin-delete.sql`** (eliminar fotos desde el panel admin con contraseña).

---

## 3b. Panel admin — usuarios autorizados

El panel **no** es público: hace falta cuenta en Supabase Auth y estar en la tabla `admin_members`. La base de datos (RLS) bloquea la lectura de datos de asistentes si alguien intenta entrar sin permiso.

### Configuración en Supabase

1. **Authentication** → **Providers** → **Email**: activado.
2. **Authentication** → **Settings**: desactiva **Enable sign ups** (solo altas manuales desde el Dashboard).
3. SQL Editor → ejecuta `supabase/admin-auth.sql` (después de `setup.sql`).

### Dar de alta a un administrador

1. **Authentication** → **Users** → **Add user**.
2. Marca **Auto Confirm User** (si no, no podrá iniciar sesión hasta confirmar el correo).
3. Usa el correo y la contraseña que pondrás en la web (anótalos).
4. SQL Editor → ejecuta `supabase/verify-admin.sql` y comprueba que el usuario aparece.
5. Si en la columna `puede_admin` dice **NO — falta INSERT**, ejecuta (mismo correo del paso 3):

```sql
insert into public.admin_members (user_id)
select id from auth.users where lower(email) = lower('correo@del-admin.com')
on conflict (user_id) do nothing;
```

Si ves `duplicate key value violates unique constraint "admin_members_user_id_key"`, **ese correo ya está dado de alta** — no hace falta repetir el INSERT. Ejecuta `verify-admin.sql` y comprueba que diga **SÍ — puede entrar al panel**.

6. Vuelve a ejecutar `verify-admin.sql`: debe decir **SÍ — puede entrar al panel**.
7. En la web → **Admin** → inicia sesión con ese correo y contraseña.

### Si ves «Correo o contraseña incorrectos»

| Causa | Qué hacer |
|--------|-----------|
| Contraseña distinta a la de Supabase | Users → el usuario → reset password o créalo de nuevo |
| Cuenta sin confirmar | Users → confirm user, o créalo con **Auto Confirm User** |
| Correo con mayúsculas/espacios | Usa el mismo correo exacto; la app lo pasa a minúsculas |
| Clave API incorrecta en `config.local.js` | Publishable o anon pública, no Secret |

### Si ves «no está en admin_members» (pero la contraseña sí entra)

La sesión **sí** funcionó; falta el paso 5 del alta:

1. Ejecuta `supabase/admin-auth.sql` si no lo hiciste.
2. Ejecuta el `INSERT` con el **mismo** correo del usuario Auth.
3. Comprueba con `supabase/verify-admin.sql`.

### Seguridad

| Qué | Dónde |
|-----|--------|
| Publishable / anon key | Navegador (`config.local.js`) — correcto |
| Secret / service_role | **Nunca** en la web |
| Lista de admins | Tabla `admin_members` — solo SQL con privilegios de proyecto |
| Fotos + datos de contacto | Solo usuarios autenticados que pasan `is_admin()` |

---

## 4. Comprobar Storage

1. **Storage** → deberías ver el bucket **`vibrart-album`** (público).
2. Si no aparece, créalo manualmente:
   - **New bucket** → Name: `vibrart-album`
   - Marca **Public bucket**
   - Allowed MIME types: `image/jpeg, image/png, image/webp, image/gif`

---

## 5. Configurar el proyecto VIBRART

En la carpeta del proyecto:

```bash
cp js/config.local.example.js js/config.local.js
```

Edita `js/config.local.js`:

```javascript
window.VIBRART_CONFIG_LOCAL = {
  supabase: {
    url: 'https://TU-PROYECTO.supabase.co',
    publishableKey: 'sb_publishable_...',  // la nueva (recomendada)
    // anonKey: 'eyJ...',                  // o la legacy, solo una de las dos
  },
};
```

`config.local.js` está en `.gitignore` para no subir tus claves a Git.

---

## 6. Probar en local

Terminal 1 — sirve la web:

```bash
npx serve .
```

Terminal 2 — abre `http://localhost:3000` (o el puerto que indique).

1. Ve a **VIBRART 2026** o **SOUVENIRS**.
2. Sube una foto en un recuadro.
3. Pulsa **Subir fotos al álbum**.

Si todo está bien:

- En Supabase → **Storage** → `vibrart-album` verás carpetas `vibrart-2026` o `souvenirs`.
- En **Table Editor** → `album_photos` verás una fila por foto.

---

## 7. Ver fotos subidas en Supabase

| Qué | Dónde |
|-----|--------|
| Archivos | **Storage** → `vibrart-album` → `vibrart-2026/` o `souvenirs/` |
| Metadatos | **Table Editor** → `album_photos` |

Columnas útiles: `description`, `public_url`, `created_at`, `album`.

---

## Errores frecuentes

### `new row violates row-level security policy`

- Vuelve a ejecutar `supabase/setup.sql` completo.
- Revisa que RLS en `album_photos` tenga política de `INSERT` para `anon`.

### `Bucket not found`

- El bucket debe llamarse exactamente **`vibrart-album`** (igual que en `js/config.js` → `supabase.bucket`).

### `Invalid API key` / no conecta

- Revisa que `url` y `publishableKey` (o `anonKey`) no tengan espacios ni comillas de más.
- Usa **Publishable** o **anon public**, nunca **Secret** / **service_role**.

### Solo veo “API URL”, no veo anon

- Es normal en el panel nuevo: usa **Publishable key** en la pestaña **API Keys**.
- Si prefieres la clave antigua: pestaña **Legacy API Keys** → **anon** → public.

### `Failed to fetch` al subir

1. **Servidor local:** ejecuta `npx serve .` y abre la URL que muestra (ej. `http://localhost:3000`). No abras `index.html` con doble clic (`file://`).
2. **Permisos de tabla:** en proyectos nuevos, ejecuta también `supabase/fix-grants.sql` en el SQL Editor.
3. Recarga la página con **Ctrl+F5** después de cambiar `config.local.js`.

### `permission denied for table album_photos`

- Ejecuta `supabase/fix-grants.sql` (o vuelve a correr `setup.sql` completo).
- La foto puede haberse subido a Storage pero no guardarse en la tabla hasta arreglar esto.

### «Access denied» al eliminar una foto (panel admin)

1. En **SQL Editor**, ejecuta **`supabase/admin-delete.sql`** (solo si ya corriste `setup.sql` y `admin-auth.sql`).
2. Ese script permite a los admins **borrar** filas en `album_photos` y archivos en el bucket `vibrart-album`.
3. Recarga la web (**Ctrl+F5**) e inténtalo otra vez con tu contraseña de admin.

Si la foto desaparece del panel pero ves un aviso del archivo en Storage, el registro ya se borró; vuelve a ejecutar `admin-delete.sql` y borra el archivo huérfano en **Storage** → `vibrart-album` si hace falta.

### «La foto se guardó a medias» (móvil o web)

Suele pasar **después de ejecutar `admin-auth.sql`**: la imagen **sí** llega a Storage, pero falla el registro en `album_photos` porque `anon` ya no puede **leer** filas y el insert antiguo pedía `return=representation`.

1. **Actualiza la app** (el cliente ya usa `return=minimal` al subir).
2. Recarga en el celular con **Ctrl+F5** o borra caché del navegador.
3. Si sigue fallando, ejecuta `supabase/fix-anon-upload.sql` en el SQL Editor.
4. En **Storage** → `vibrart-album` puedes borrar archivos huérfanos sin fila en la tabla.

---

## Producción

1. Despliega la carpeta del proyecto (Netlify, Vercel, GitHub Pages con servidor, etc.).
2. Añade tu dominio en Supabase si activas autenticación.
3. Para un festival abierto, las políticas actuales permiten subida anónima; para más control, limita subidas con **Edge Functions** o login.

---

## Estructura que usa la app

```
Storage: vibrart-album/
  └── vibrart-2026/
  │     └── {uuid}-nombre.jpg
  └── souvenirs/
        └── {uuid}-nombre.jpg

Tabla album_photos:
  album, description, storage_path, public_url, created_at
```

La clave **anon** en el navegador es segura si RLS está bien configurado (como en `setup.sql`).
