/** Cliente Supabase — subida vía fetch (compatible con publishable key en navegador) */
window.VibrartSupabase = {
  url: '',
  apiKey: '',
  SESSION_KEY: 'vibrart-admin-session',

  log(...args) {
    if (window.VIBRART_CONFIG?.debugUpload !== false) {
      console.log('[VIBRART Upload]', ...args);
    }
  },

  logError(label, err, extra = {}) {
    console.error('[VIBRART Upload]', label, {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      cause: err?.cause,
      status: err?.status,
      ...extra,
    });
  },

  maskKey(key) {
    if (!key) return '(vacío)';
    if (key.length <= 24) return `${key.slice(0, 8)}…`;
    return `${key.slice(0, 18)}…${key.slice(-4)}`;
  },

  init() {
    const cfg = window.VIBRART_CONFIG.supabase;
    const apiKey = window.VIBRART_CONFIG.getSupabaseKey?.() || cfg?.publishableKey || cfg?.anonKey;

    if (!cfg?.url || !apiKey) {
      this.log('init FALLÓ: falta url o clave en config.local.js');
      return false;
    }

    this.url = cfg.url.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
    this.apiKey = apiKey.trim();
    this.log('init OK', {
      url: this.url,
      key: this.maskKey(this.apiKey),
      bucket: cfg.bucket || 'vibrart-album',
    });
    return true;
  },

  isReady() {
    return Boolean(this.url && this.apiKey);
  },

  getConfig() {
    return window.VIBRART_CONFIG.supabase || {};
  },

  sanitizeName(name) {
    return (name || 'foto.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  },

  encodePath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  },

  headers(extra = {}) {
    return {
      apikey: this.apiKey,
      Authorization: `Bearer ${this.apiKey}`,
      ...extra,
    };
  },

  authHeaders(extra = {}) {
    const token = this.getSession()?.access_token;
    if (!token) {
      throw new Error('Debes iniciar sesión para acceder al panel.');
    }
    return {
      apikey: this.apiKey,
      Authorization: `Bearer ${token}`,
      ...extra,
    };
  },

  getSession() {
    try {
      const raw = localStorage.getItem(this.SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.access_token) return null;
      return data;
    } catch {
      return null;
    }
  },

  saveSession(payload) {
    const expiresAt = Date.now() + (payload.expires_in || 3600) * 1000;
    const session = {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at: expiresAt,
      user: payload.user
        ? { id: payload.user.id, email: payload.user.email }
        : this.getSession()?.user,
    };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  },

  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  async parseAuthError(res) {
    let body = {};
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    const msg = body.msg || body.message || body.error_description || body.error || '';
    const code = body.error_code || body.code || '';
    return { msg: String(msg), code: String(code), status: res.status };
  },

  async attachUserToSession(accessToken) {
    try {
      const res = await fetch(`${this.url}/auth/v1/user`, {
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) return;
      const user = await res.json();
      const session = this.getSession();
      if (session && user?.id) {
        session.user = { id: user.id, email: user.email };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      }
    } catch (err) {
      this.logError('attachUserToSession', err);
    }
  },

  async signIn(email, password) {
    if (!this.isReady()) {
      throw new Error('El panel no está conectado al servidor de fotos…');
    }

    const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    if (!res.ok) {
      const authErr = await this.parseAuthError(res);
      this.logError('signIn → rechazado', authErr);
      const hint = `${authErr.msg} ${authErr.code}`.toLowerCase();

      if (hint.includes('confirm') || authErr.code === 'email_not_confirmed') {
        throw new Error('Pide activarla al equipo.');
      }
      if (authErr.status === 400 || authErr.status === 401 || authErr.code === 'invalid_credentials') {
        throw new Error('Correo o contraseña incorrectos.');
      }
      if (hint.includes('invalid') && hint.includes('api')) {
        throw new Error('La conexión con el servidor no es válida. Revisa la configuración del evento.');
      }
      throw new Error('No pudimos iniciar sesión. Revisa tus datos e inténtalo otra vez.');
    }

    const data = await res.json();
    this.saveSession(data);
    await this.attachUserToSession(data.access_token);

    const adminCheck = await this.checkIsAdmin();
    if (!adminCheck.ok) {
      this.clearSession();
      throw new Error(adminCheck.message);
    }

    return this.getSession();
  },

  /** Comprueba la contraseña del admin conectado (sin cerrar sesión si falla). */
  async verifyAdminPassword(password) {
    const session = await this.ensureAdminSession();
    const email = session?.user?.email;
    if (!email) {
      throw new Error('Tu sesión caducó. Vuelve a entrar con tu correo y contraseña.');
    }

    const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    if (!res.ok) {
      const authErr = await this.parseAuthError(res);
      if (authErr.status === 400 || authErr.status === 401 || authErr.code === 'invalid_credentials') {
        throw new Error('Contraseña incorrecta.');
      }
      throw new Error('No pudimos verificar tu contraseña. Inténtalo otra vez.');
    }

    const data = await res.json();
    this.saveSession({ ...data, user: session.user });
    return true;
  },

  async deleteStorageObject(storagePath) {
    const bucket = this.getConfig().bucket || 'vibrart-album';
    const path = (storagePath || '').replace(/^\/+/, '');
    if (!path) return;

    // API oficial: DELETE /object/{bucket} con body { prefixes: [...] }
    const url = `${this.url}/storage/v1/object/${bucket}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefixes: [path] }),
    });

    if (res.ok || res.status === 404) {
      this.log('deleteStorageObject → OK', { path, status: res.status });
      return;
    }

    const err = await this.parseErrorResponse(res, 'No se pudo borrar el archivo');
    this.logError('deleteStorageObject → error', err, { status: res.status });
    const msg = (err.message || '').toLowerCase();
    if (
      res.status === 403 ||
      msg.includes('access denied') ||
      msg.includes('permission') ||
      msg.includes('row-level security')
    ) {
      throw new Error(
        'No tienes permiso para borrar el archivo. En Supabase → SQL Editor ejecuta supabase/admin-delete.sql (después de admin-auth.sql).'
      );
    }
    throw new Error(err.message || 'No se pudo borrar el archivo de la foto.');
  },

  async deleteAlbumPhotoRow(photoId) {
    const table = this.getConfig().table || 'album_photos';
    const url = `${this.url}/rest/v1/${table}?id=eq.${encodeURIComponent(photoId)}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.authHeaders({ Prefer: 'return=minimal' }),
    });

    if (!res.ok) {
      const err = await this.parseErrorResponse(res, 'No se pudo borrar el registro');
      this.logError('deleteAlbumPhotoRow → error', err, { status: res.status });
      const msg = (err.message || '').toLowerCase();
      if (res.status === 403 || msg.includes('permission') || msg.includes('row-level security')) {
        throw new Error(
          'No tienes permiso para eliminar. Ejecuta supabase/admin-delete.sql en Supabase.'
        );
      }
      throw new Error(err.message || 'No se pudo borrar la foto de la base de datos.');
    }

    this.log('deleteAlbumPhotoRow → OK', { photoId });
  },

  /** Elimina archivo en Storage y fila en album_photos (solo admin autenticado). */
  async deleteAlbumPhoto(photo) {
    if (!photo?.id) {
      throw new Error('Falta el identificador de la foto.');
    }

    await this.ensureAdminSession();

    // Primero la fila (desaparece del panel); luego el archivo en Storage
    await this.deleteAlbumPhotoRow(photo.id);

    if (photo.storage_path) {
      try {
        await this.deleteStorageObject(photo.storage_path);
      } catch (storageErr) {
        this.logError('deleteAlbumPhoto → storage', storageErr);
        const hint = storageErr?.message || '';
        throw new Error(
          hint.includes('admin-delete.sql')
            ? hint
            : 'La foto se quitó del álbum, pero no se pudo borrar el archivo en el servidor. Ejecuta supabase/admin-delete.sql en Supabase.'
        );
      }
    }
  },

  async signOut() {
    const session = this.getSession();
    if (session?.access_token) {
      try {
        await fetch(`${this.url}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            apikey: this.apiKey,
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      } catch {
        /* ignorar error de red al cerrar sesión */
      }
    }
    this.clearSession();
  },

  async refreshSession() {
    const session = this.getSession();
    if (!session?.refresh_token) {
      this.clearSession();
      return null;
    }

    const res = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });

    if (!res.ok) {
      this.clearSession();
      return null;
    }

    const data = await res.json();
    const next = this.saveSession({ ...data, user: session.user });
    return next;
  },

  async checkIsAdmin() {
    if (!this.getSession()?.access_token) {
      return { ok: false, message: 'No hay sesión activa.' };
    }

    try {
      const memberRes = await fetch(`${this.url}/rest/v1/admin_members?select=id&limit=1`, {
        headers: this.authHeaders(),
      });

      this.log('checkIsAdmin → admin_members', { status: memberRes.status });

      if (memberRes.status === 404) {
        return {
          ok: false,
          message: 'El panel de administración no está activado en el servidor. El equipo técnico debe completar la configuración.',
        };
      }

      if (memberRes.ok) {
        const rows = await memberRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return { ok: true, message: '' };
        }
      }

      const rpcRes = await fetch(`${this.url}/rest/v1/rpc/is_admin`, {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: '{}',
      });

      this.log('checkIsAdmin → rpc/is_admin', { status: rpcRes.status });

      if (rpcRes.ok) {
        const data = await rpcRes.json();
        if (data === true) {
          return { ok: true, message: '' };
        }
      }

      return {
        ok: false,
        message: 'Usuario sin permisos de administrador.',
      };
    } catch (err) {
      this.logError('checkIsAdmin', err);
      return {
        ok: false,
        message: 'No pudimos verificar tu acceso. Comprueba tu internet e inténtalo de nuevo.',
      };
    }
  },

  /** Sesión válida y usuario en admin_members */
  async ensureAdminSession() {
    let session = this.getSession();
    if (!session) return null;

    if (Date.now() >= session.expires_at - 60_000) {
      session = await this.refreshSession();
      if (!session) return null;
    }

    const adminCheck = await this.checkIsAdmin();
    if (!adminCheck.ok) {
      this.clearSession();
      return null;
    }

    return session;
  },

  normalizeUploadFile(file) {
    const name = file.name || 'foto.jpg';
    const ext = (name.split('.').pop() || '').toLowerCase();
    const byExt = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      heic: 'image/heic',
      heif: 'image/heif',
    };

    let type = file.type;
    if (!type || type === 'application/octet-stream') {
      type = byExt[ext] || 'image/jpeg';
    }

    if (type === file.type) return file;

    return new File([file], name, { type, lastModified: file.lastModified || Date.now() });
  },

  formatError(error, step) {
    const msg = (error?.message || '').toLowerCase();
    const status = error?.status;

    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed')) {
      if (location.protocol === 'file:') {
        return 'Abre la página desde el enlace que te dio el equipo (no el archivo suelto en tu carpeta).';
      }
      return 'No pudimos enviar la foto. Revisa tu internet (Wi‑Fi o datos) e inténtalo de nuevo.';
    }

    if (
      msg.includes('permission denied') ||
      msg.includes('row-level security') ||
      msg.includes('violates') ||
      error?.code === '42501' ||
      status === 403
    ) {
      if (step === 'storage') {
        return 'No pudimos guardar la foto en el servidor. Avísanos en el evento.';
      }
      return 'La foto se guardó a medias. Avisa al equipo de VIBRART en el evento.';
    }

    if (msg.includes('bucket') && msg.includes('not found')) {
      return 'El álbum aún no está listo. Avisa al equipo de VIBRART.';
    }

    if (
      msg.includes('payload too large') ||
      msg.includes('too large') ||
      msg.includes('entity too large') ||
      status === 413
    ) {
      return 'La imagen es muy pesada. Prueba con otra más liviana.';
    }

    if (
      msg.includes('mime') ||
      msg.includes('invalid_request') ||
      msg.includes('not supported') ||
      status === 415
    ) {
      return 'Ese formato de foto no es compatible. Prueba otra imagen o haz una captura en JPG.';
    }

    if (msg.includes('invalid api') || msg.includes('api key') || msg.includes('jwt') || status === 401) {
      return 'El álbum no está disponible en este momento. Avísanos en el evento.';
    }

    if (
      msg.includes('column') ||
      msg.includes('pgrst') ||
      msg.includes('schema cache') ||
      msg.includes('could not find')
    ) {
      return 'El álbum aún no está listo del todo. Avísanos en el evento.';
    }

    if (msg.includes('check constraint') || msg.includes('album')) {
      return 'No pudimos clasificar la foto en el álbum. Inténtalo otra vez.';
    }

    if (msg.includes('caché inválida') || msg.includes('leeer esa foto') || msg.includes('preparar la foto')) {
      return error.message;
    }

    return 'No pudimos subir la foto. Revisa tu internet e inténtalo de nuevo.';
  },

  async parseErrorResponse(res, fallback) {
    let message = fallback;
    try {
      const body = await res.json();
      message = body.message || body.error || body.error_description || fallback;
      if (body.hint) message += ` (${body.hint})`;
    } catch {
      try {
        message = (await res.text()) || fallback;
      } catch {
        /* ignore */
      }
    }
    const err = new Error(message);
    err.status = res.status;
    return err;
  },

  buildStoragePath(album, fileName) {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${album}/${id}-${this.sanitizeName(fileName)}`;
  },

  getPublicUrl(storagePath) {
    const bucket = this.getConfig().bucket || 'vibrart-album';
    return `${this.url}/storage/v1/object/public/${bucket}/${this.encodePath(storagePath)}`;
  },

  async storageUpload(bucket, storagePath, file) {
    const url = `${this.url}/storage/v1/object/${bucket}/${this.encodePath(storagePath)}`;
    this.log('storage → inicio', {
      url,
      storagePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || '(vacío)',
    });

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: this.headers({
          'Content-Type': file.type || 'image/jpeg',
          'cache-control': 'max-age=3600',
          'x-upsert': 'false',
        }),
        body: file,
      });
    } catch (err) {
      this.logError('storage → fetch lanzó excepción (red/CORS/bloqueador)', err, { url });
      throw err;
    }

    this.log('storage → respuesta', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
    });

    if (!res.ok) {
      const err = await this.parseErrorResponse(res, 'Error al subir la imagen');
      this.logError('storage → error HTTP', err, { status: res.status });
      throw err;
    }

    this.log('storage → OK');
  },

  /**
   * Inserta una fila. Por defecto return=minimal: anon no tiene SELECT en album_photos
   * (admin-auth) y return=representation falla aunque el INSERT sea válido.
   */
  async insertRow(table, row, { returnRow = false } = {}) {
    const url = `${this.url}/rest/v1/${table}`;
    const prefer = returnRow ? 'return=representation' : 'return=minimal';
    this.log('database → inicio', { url, prefer, row });

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: this.headers({
          'Content-Type': 'application/json',
          Prefer: prefer,
        }),
        body: JSON.stringify(row),
      });
    } catch (err) {
      this.logError('database → fetch lanzó excepción (red/CORS/bloqueador)', err, { url });
      throw err;
    }

    this.log('database → respuesta', {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
    });

    if (!res.ok) {
      const err = await this.parseErrorResponse(res, 'Error al guardar en la base de datos');
      const errMsg = (err.message || '').toLowerCase();
      if (
        res.status === 401 ||
        res.status === 403 ||
        errMsg.includes('permission denied') ||
        errMsg.includes('row-level security')
      ) {
        err.code = '42501';
      }
      this.logError('database → error HTTP', err, { status: res.status });
      throw new Error(this.formatError(err, 'database'));
    }

    const raw = await res.text();
    if (!raw) {
      this.log('database → OK (sin cuerpo, return=minimal)');
      return null;
    }

    try {
      const data = JSON.parse(raw);
      const rowOut = Array.isArray(data) ? data[0] : data;
      this.log('database → OK', { id: rowOut?.id });
      return rowOut;
    } catch {
      this.log('database → OK (respuesta no JSON)');
      return null;
    }
  },

  /**
   * Sube una foto a Storage y guarda metadatos en la tabla.
   * @returns {{ storagePath, publicUrl, recordId }}
   */
  async uploadOne(album, file, description, uploadBatchId = null, uploader = null) {
    const cfg = this.getConfig();
    const bucket = cfg.bucket || 'vibrart-album';
    const table = cfg.table || 'album_photos';
    const storagePath = this.buildStoragePath(album, file.name);

    const uploadFile = this.normalizeUploadFile(file);
    this.log('uploadOne → inicio', {
      album,
      description,
      storagePath,
      fileType: uploadFile.type,
      fileSize: uploadFile.size,
    });

    try {
      await this.storageUpload(bucket, storagePath, uploadFile);
    } catch (err) {
      this.logError('uploadOne → falló en storage', err);
      throw new Error(this.formatError(err, 'storage'));
    }

    const publicUrl = this.getPublicUrl(storagePath);

    const rowPayload = {
      album,
      description: description || '',
      storage_path: storagePath,
      file_name: file.name,
      public_url: publicUrl,
    };
    if (uploadBatchId) rowPayload.upload_batch_id = uploadBatchId;
    if (uploader) {
      rowPayload.uploader_name = uploader.fullName;
      rowPayload.uploader_email = uploader.email;
      rowPayload.uploader_phone = uploader.phone;
    }

    const row = await this.insertRow(table, rowPayload);

    const result = {
      storagePath,
      publicUrl,
      recordId: row?.id,
    };
    this.log('uploadOne → completado', result);
    return result;
  },

  /** Lista fotos del álbum — solo administradores autenticados (RLS) */
  async fetchAlbumPhotos() {
    const session = await this.ensureAdminSession();
    if (!session) {
      throw new Error('Tu sesión caducó. Vuelve a entrar con tu correo y contraseña.');
    }

    const table = this.getConfig().table || 'album_photos';
    const url = `${this.url}/rest/v1/${table}?select=id,album,description,storage_path,file_name,public_url,upload_batch_id,uploader_name,uploader_email,uploader_phone,created_at&order=created_at.desc`;

    let res;
    try {
      res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          ...this.authHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
    } catch (err) {
      this.logError('fetchAlbumPhotos → red', err, { url });
      throw new Error('No pudimos conectar. Comprueba tu internet e inténtalo otra vez.');
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        this.clearSession();
        throw new Error('No tienes permiso para ver las fotos. Cierra sesión y vuelve a entrar.');
      }
      const err = await this.parseErrorResponse(res, 'No se pudo leer el álbum');
      throw new Error(err.message || 'No pudimos cargar las fotos. Pulsa «Actualizar galería».');
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  /** Galería pública — imagen, nombre y descripción (vista album_photos_gallery) */
  async fetchPublicGallery(album) {
    if (!this.isReady()) {
      throw new Error('El álbum no está configurado.');
    }

    const view = this.getConfig().galleryView || 'album_photos_gallery';
    const params = new URLSearchParams({
      select: 'id,public_url,uploader_name,description,created_at',
      album: `eq.${album}`,
      order: 'created_at.desc',
    });
    const url = `${this.url}/rest/v1/${view}?${params}`;

    let res;
    try {
      res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          ...this.headers(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (err) {
      this.logError('fetchPublicGallery → red', err, { url });
      throw new Error('No pudimos conectar. Comprueba tu internet e inténtalo de nuevo.');
    }

    if (!res.ok) {
      const err = await this.parseErrorResponse(res, 'No se pudo cargar la galería');
      this.logError('fetchPublicGallery → HTTP', err, { status: res.status });
      throw new Error(
        res.status === 404
          ? 'La galería pública aún no está activada. Ejecuta supabase/public-gallery.sql en Supabase.'
          : err.message || 'No pudimos cargar las fotos.'
      );
    }

    const data = await res.json();
    const rows = Array.isArray(data) ? data : [];
    return rows.filter((row) => row?.public_url && String(row.public_url).trim());
  },
};
