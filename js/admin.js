/** Panel de administración — galería compacta + visor carrete */
window.VibrartAdmin = {
  _renderToken: 0,
  _batches: [],
  _viewerBatchIdx: 0,
  _viewerPhotoIdx: 0,
  _viewerBound: false,
  _loginBound: false,
  _deleteBound: false,
  /** Caché de la última galería cargada (persiste al salir y volver sin cerrar sesión) */
  _galleryCache: null,

  formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  },

  /** Convierte errores técnicos en mensajes claros para quien opera el panel */
  friendlyAdminMessage(raw) {
    if (!raw || typeof raw !== 'string') {
      return 'Algo salió mal. Inténtalo otra vez o pide ayuda al equipo técnico.';
    }

    const m = raw.toLowerCase();

    if (
      m.includes('no está configurado') ||
      m.includes('configuración del evento') ||
      m.includes('configuracion del evento')
    ) {
      return 'El panel no está conectado al servidor de fotos…';
    }
    if (m.includes('introduce correo') || m === 'correo y contraseña') {
      return 'Escribe tu correo y tu contraseña para entrar.';
    }
    if (
      m.includes('correo o contraseña incorrect') ||
      m.includes('invalid_credentials') ||
      (m.includes('correo') && m.includes('contraseña') && m.includes('incorrect'))
    ) {
      return 'Correo o contraseña incorrectos.';
    }
    if (m.includes('confirmada') || m.includes('email_not_confirmed') || m.includes('no está confirmada')) {
      return 'Pide activarla al equipo.';
    }
    if (
      m.includes('admin_members') ||
      m.includes('no está autorizado') ||
      m.includes('permiso de administrador') ||
      m.includes('permisos de administrador')
    ) {
      return 'Usuario sin permisos de administrador.';
    }
    if (m.includes('admin-auth') || m.includes('falta configurar el panel') || m.includes('panel de administración no está')) {
      return 'El servidor aún no tiene listo el panel de administración. El equipo técnico debe completar la configuración.';
    }
    if (m.includes('sesión expirada') || m.includes('sesion expirada') || m.includes('vuelve a iniciar')) {
      return 'Tu sesión caducó. Vuelve a entrar con tu correo y contraseña.';
    }
    if (
      m.includes('sin permisos') ||
      m.includes('no tienes permiso') ||
      m.includes('permission denied') ||
      m.includes('row-level security')
    ) {
      return 'No tienes permiso para ver las fotos. Cierra sesión, vuelve a entrar y, si sigue igual, avisa al equipo técnico.';
    }
    if (m.includes('failed to fetch') || m.includes('network') || m.includes('revisa tu conexión') || m.includes('revisa tu conexion')) {
      return 'No pudimos conectar. Comprueba el Wi‑Fi o los datos móviles e inténtalo otra vez.';
    }
    if (m.includes('invalid api') || m.includes('api key')) {
      return 'La conexión con el servidor no es válida. El equipo técnico debe revisar las claves de acceso.';
    }
    if (m.includes('f12') || m.includes('consola')) {
      return 'No pudimos verificar tu acceso. Comprueba tu internet e inténtalo de nuevo.';
    }
    if (m.includes('no se pudo iniciar sesión')) {
      return 'No pudimos iniciar sesión. Revisa tus datos e inténtalo otra vez.';
    }
    if (m.includes('no se pudo cargar') || m.includes('no se pudo leer') || m.includes('error al cargar')) {
      return 'No pudimos cargar las fotos. Comprueba tu internet y pulsa «Actualizar galería».';
    }
    if (m.includes('contraseña incorrecta')) {
      return 'Contraseña incorrecta.';
    }
    if (m.includes('access denied') || m.includes('acceso denegado')) {
      return 'No tienes permiso para borrar en el servidor. El equipo técnico debe ejecutar supabase/admin-delete.sql en Supabase.';
    }
    if (m.includes('admin-delete.sql')) {
      return 'Falta activar el borrado en Supabase. Ejecuta supabase/admin-delete.sql en el SQL Editor (después de admin-auth.sql).';
    }
    if (m.includes('eliminar') || m.includes('borrar') || m.includes('delete')) {
      return 'No pudimos eliminar la foto. Comprueba tu conexión o tus permisos de administrador.';
    }
    if (m.includes('supabase') || m.includes('sql editor') || m.includes('docs/') || m.includes('.sql')) {
      return 'Hay un problema de configuración en el servidor. Avísale al equipo técnico de VIBRART.';
    }
    if (raw.length > 160) {
      return 'Algo salió mal. Inténtalo otra vez o pide ayuda al equipo técnico.';
    }

    return raw;
  },

  async onEnter() {
    this.closeViewer();
    this.bindClearButton();
    await this.syncAuthUI();
  },

  async syncAuthUI() {
    const login = document.getElementById('admin-login');
    const panel = document.getElementById('admin-panel');
    window.VibrartSupabase?.init();

    if (!window.VibrartSupabase?.isReady()) {
      if (login) login.hidden = false;
      if (panel) panel.hidden = true;
      this.setLoginError('El panel no está conectado al servidor de fotos…');
      return;
    }

    const session = await window.VibrartSupabase.ensureAdminSession();
    const logoutBtn = document.getElementById('admin-logout');

    if (session) {
      if (login) login.hidden = true;
      if (panel) panel.hidden = false;
      if (logoutBtn) logoutBtn.hidden = false;
      this.setLoginError('');
      if (this._galleryCache) {
        this.restoreGalleryFromCache();
      } else {
        this.showIdleState();
      }
      return;
    }

    if (login) login.hidden = false;
    if (panel) panel.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;
    this.clearGalleryCache();
  },

  clearGalleryCache() {
    this._galleryCache = null;
    this._batches = [];
  },

  restoreGalleryFromCache() {
    const gallery = document.getElementById('admin-gallery');
    const desc = document.querySelector('#admin-panel .admin-page__desc');
    if (!gallery || !this._galleryCache) {
      this.showIdleState();
      return;
    }
    gallery.innerHTML = this._galleryCache.html;
    if (desc && this._galleryCache.desc) desc.textContent = this._galleryCache.desc;
    this.bindTiles(gallery);
  },

  setLoginError(message) {
    const el = document.getElementById('admin-login-error');
    if (!el) return;
    if (message) {
      el.textContent = this.friendlyAdminMessage(message);
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  },

  showIdleState() {
    const gallery = document.getElementById('admin-gallery');
    const desc = document.querySelector('#admin-panel .admin-page__desc');
    if (desc) {
      desc.textContent = 'Pulsa «Actualizar galería» para cargar las fotos.';
    }
    if (gallery) {
      gallery.innerHTML =
        '<p class="admin-empty">Pulsa el botón de abajo para ver las fotos subidas.</p>';
    }
  },

  async refresh() {
    await this.render();
    window.VibrartUtils.showToast('Galería actualizada');
  },

  groupKey(photo) {
    if (photo.upload_batch_id) {
      return `batch:${photo.upload_batch_id}`;
    }
    const name = (photo.uploader_name || '').trim().toLowerCase();
    const email = (photo.uploader_email || '').trim().toLowerCase();
    const phone = (photo.uploader_phone || '').replace(/\D/g, '');
    if (name || email || phone) {
      return `person:${email}|${phone}|${name}`;
    }
    return `photo:${photo.id}`;
  },

  groupPhotosByUploader(photos) {
    const groups = new Map();

    photos.forEach((photo) => {
      const key = this.groupKey(photo);
      if (!groups.has(key)) {
        groups.set(key, {
          photos: [],
          name: photo.uploader_name || '',
          email: photo.uploader_email || '',
          phone: photo.uploader_phone || '',
          latestAt: photo.created_at || '',
        });
      }
      const group = groups.get(key);
      group.photos.push(photo);
      if (photo.created_at && photo.created_at > (group.latestAt || '')) {
        group.latestAt = photo.created_at;
      }
      if (!group.name && photo.uploader_name) group.name = photo.uploader_name;
      if (!group.email && photo.uploader_email) group.email = photo.uploader_email;
      if (!group.phone && photo.uploader_phone) group.phone = photo.uploader_phone;
    });

    return [...groups.values()]
      .map((group) => ({
        ...group,
        photos: [...group.photos].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        ),
      }))
      .sort((a, b) => new Date(b.latestAt || 0) - new Date(a.latestAt || 0));
  },

  photoSrc(item) {
    const imgUrl = item.public_url || '';
    const cacheBust = item.id ? `?v=${encodeURIComponent(item.id)}` : '';
    return imgUrl ? `${imgUrl}${cacheBust}` : '';
  },

  countLabel(count) {
    if (count === 0) return 'Sin fotos';
    if (count === 1) return '1 foto';
    return `${count} fotos`;
  },

  renderSection(sectionKey, title, batches, photoCount, startIdx) {
    const { escapeHtml } = window.VibrartUtils;
    const envios = batches.length;
    const enviosLabel = envios === 1 ? '1 envío' : `${envios} envíos`;

    return `
      <section class="admin-section admin-section--${escapeHtml(sectionKey)}">
        <header class="admin-section__head">
          <h2 class="admin-section__title">${escapeHtml(title)}</h2>
          <span class="admin-section__count">${escapeHtml(enviosLabel)} · ${escapeHtml(this.countLabel(photoCount))}</span>
        </header>
        <div class="admin-tiles">
          ${batches.map((b, i) => this.renderTile(b, startIdx + i)).join('')}
        </div>
      </section>
    `;
  },

  renderTile(batch, index) {
    const { escapeHtml } = window.VibrartUtils;
    const primary = batch.photos[0];
    const src = escapeHtml(this.photoSrc(primary));
    const count = batch.photos.length;
    const extra = count - 1;
    const name = escapeHtml(batch.name || 'Sin nombre');

    return `
      <button
        type="button"
        class="admin-tile"
        data-batch-idx="${index}"
        aria-label="${name}, ${count} foto${count === 1 ? '' : 's'}"
      >
        <span class="admin-tile__img-wrap">
          <img class="admin-tile__img" src="${src}" alt="" loading="lazy" decoding="async">
          ${extra > 0 ? `<span class="admin-tile__more">+${extra}</span>` : ''}
        </span>
        <span class="admin-tile__name">${name}</span>
      </button>
    `;
  },

  async render() {
    const gallery = document.getElementById('admin-gallery');
    const desc = document.querySelector('#admin-panel .admin-page__desc');
    if (!gallery) return;

    const session = await window.VibrartSupabase?.ensureAdminSession();
    if (!session) {
      await this.syncAuthUI();
      window.VibrartUtils.showToast('Tu sesión caducó. Vuelve a entrar al panel.');
      return;
    }

    const token = ++this._renderToken;
    const { escapeHtml } = window.VibrartUtils;

    gallery.innerHTML = '<p class="admin-loading">Cargando fotos del álbum…</p>';
    if (desc) desc.textContent = 'Cargando…';

    window.VibrartSupabase?.init();

    if (!window.VibrartSupabase?.isReady()) {
      if (token !== this._renderToken) return;
      if (desc) desc.textContent = 'El panel no está conectado al servidor de fotos…';
      gallery.innerHTML =
        '<p class="admin-empty">El panel no está conectado al servidor de fotos…</p>';
      return;
    }

    let photos = [];
    try {
      photos = await window.VibrartSupabase.fetchAlbumPhotos();
    } catch (err) {
      console.error(err);
      if (token !== this._renderToken) return;
      if (desc) desc.textContent = 'No se pudieron cargar las fotos.';
      const friendly = this.friendlyAdminMessage(err.message || 'Error al cargar el álbum.');
      gallery.innerHTML = `<p class="admin-empty">${escapeHtml(friendly)}</p>`;
      return;
    }

    if (token !== this._renderToken) return;

    const vibrart = photos.filter((p) => p.album === 'vibrart-2026');
    const souvenirs = photos.filter((p) => p.album === 'souvenirs');
    const other = photos.filter((p) => p.album !== 'vibrart-2026' && p.album !== 'souvenirs');
    const total = photos.length;

    const vibrartBatches = this.groupPhotosByUploader(vibrart);
    const souvenirsBatches = this.groupPhotosByUploader(souvenirs);
    const otherBatches = other.length ? this.groupPhotosByUploader(other) : [];

    this._batches = [...vibrartBatches, ...souvenirsBatches, ...otherBatches];

    if (desc) {
      desc.textContent =
        total === 0
          ? 'Aún no hay fotos en el álbum.'
          : 'Pulsa una miniatura para abrir el carrete.';
    }

    if (!total) {
      const emptyHtml = '<p class="admin-empty">Todavía no hay fotos subidas al álbum.</p>';
      gallery.innerHTML = emptyHtml;
      this._galleryCache = {
        html: emptyHtml,
        desc: desc?.textContent || 'Aún no hay fotos en el álbum.',
      };
      return;
    }

    let html = '';
    let offset = 0;

    if (vibrartBatches.length) {
      html += this.renderSection('vibrart-2026', 'VIBRART 2026', vibrartBatches, vibrart.length, offset);
      offset += vibrartBatches.length;
    } else {
      html += `
        <section class="admin-section admin-section--vibrart-2026">
          <header class="admin-section__head">
            <h2 class="admin-section__title">VIBRART 2026</h2>
            <span class="admin-section__count">Sin fotos</span>
          </header>
          <p class="admin-section__empty">No hay fotos en esta sección.</p>
        </section>
      `;
    }

    if (souvenirsBatches.length) {
      html += this.renderSection('souvenirs', 'SOUVENIRS', souvenirsBatches, souvenirs.length, offset);
      offset += souvenirsBatches.length;
    } else {
      html += `
        <section class="admin-section admin-section--souvenirs">
          <header class="admin-section__head">
            <h2 class="admin-section__title">SOUVENIRS</h2>
            <span class="admin-section__count">Sin fotos</span>
          </header>
          <p class="admin-section__empty">No hay fotos en esta sección.</p>
        </section>
      `;
    }

    if (otherBatches.length) {
      html += this.renderSection('otros', 'Otros', otherBatches, other.length, offset);
    }

    gallery.innerHTML = html;
    this.bindTiles(gallery);

    this._galleryCache = {
      html,
      desc: desc?.textContent || 'Pulsa una miniatura para abrir el carrete.',
    };
  },

  bindTiles(gallery) {
    gallery.querySelectorAll('.admin-tile').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.batchIdx);
        if (!Number.isNaN(idx)) this.openViewer(idx, 0);
      });
    });
  },

  openViewer(batchIdx, photoIdx = 0) {
    const batch = this._batches[batchIdx];
    if (!batch?.photos?.length) return;

    this._viewerBatchIdx = batchIdx;
    this._viewerPhotoIdx = Math.max(0, Math.min(photoIdx, batch.photos.length - 1));

    const box = document.getElementById('admin-viewer');
    if (!box) return;

    this.syncViewer();
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    box.querySelector('.admin-viewer__close')?.focus();
  },

  closeViewer() {
    this.closeDeleteModal();

    const box = document.getElementById('admin-viewer');
    if (!box || box.hidden) return;

    box.hidden = true;
    const img = box.querySelector('.admin-viewer__stage-img');
    if (img) {
      img.removeAttribute('src');
      img.alt = '';
    }
    document.body.style.overflow = '';
  },

  syncViewer() {
    const { escapeHtml } = window.VibrartUtils;
    const box = document.getElementById('admin-viewer');
    const batch = this._batches[this._viewerBatchIdx];
    if (!box || !batch) return;

    const photos = batch.photos;
    const photo = photos[this._viewerPhotoIdx];
    const count = photos.length;
    const idx = this._viewerPhotoIdx;

    const img = box.querySelector('.admin-viewer__stage-img');
    const counter = box.querySelector('.admin-viewer__counter');
    const nameEl = box.querySelector('[data-viewer="name"]');
    const emailEl = box.querySelector('[data-viewer="email"]');
    const phoneEl = box.querySelector('[data-viewer="phone"]');
    const dateEl = box.querySelector('[data-viewer="date"]');
    const descEl = box.querySelector('[data-viewer="desc"]');
    const reel = box.querySelector('.admin-viewer__reel');

    const src = this.photoSrc(photo);
    if (img) {
      img.src = src;
      img.alt = (photo.description || '').trim() || 'Foto del álbum';
    }
    if (counter) counter.textContent = `${idx + 1} / ${count}`;

    if (nameEl) nameEl.textContent = batch.name || 'Sin nombre';
    if (emailEl) {
      emailEl.textContent = batch.email || '—';
      emailEl.href = batch.email ? `mailto:${batch.email}` : '#';
      emailEl.classList.toggle('admin-viewer__link--muted', !batch.email);
    }
    if (phoneEl) {
      phoneEl.textContent = batch.phone || '—';
      phoneEl.href = batch.phone ? `tel:${batch.phone.replace(/\D/g, '')}` : '#';
      phoneEl.classList.toggle('admin-viewer__link--muted', !batch.phone);
    }
    if (dateEl) dateEl.textContent = this.formatDate(batch.latestAt) || '—';
    if (descEl) {
      const d = (photo.description || '').trim();
      descEl.textContent = d || 'Sin descripción';
      descEl.hidden = false;
    }

    const prev = box.querySelector('.admin-viewer__nav--prev');
    const next = box.querySelector('.admin-viewer__nav--next');
    if (prev) prev.disabled = idx <= 0;
    if (next) next.disabled = idx >= count - 1;

    if (reel) {
      reel.innerHTML = photos
        .map((p, i) => {
          const thumb = escapeHtml(this.photoSrc(p));
          const active = i === idx ? ' admin-viewer__reel-item--active' : '';
          return `
            <button
              type="button"
              class="admin-viewer__reel-item${active}"
              data-photo-idx="${i}"
              aria-label="Foto ${i + 1} de ${count}"
              aria-current="${i === idx ? 'true' : 'false'}"
            >
              <img src="${thumb}" alt="" loading="lazy">
            </button>
          `;
        })
        .join('');

      reel.querySelectorAll('.admin-viewer__reel-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          const pi = Number(btn.dataset.photoIdx);
          if (!Number.isNaN(pi)) this.goToPhoto(pi);
        });
      });

      const activeThumb = reel.querySelector('.admin-viewer__reel-item--active');
      activeThumb?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  },

  goToPhoto(photoIdx) {
    const batch = this._batches[this._viewerBatchIdx];
    if (!batch) return;
    this._viewerPhotoIdx = Math.max(0, Math.min(photoIdx, batch.photos.length - 1));
    this.syncViewer();
  },

  stepPhoto(delta) {
    this.goToPhoto(this._viewerPhotoIdx + delta);
  },

  getCurrentViewerPhoto() {
    const batch = this._batches[this._viewerBatchIdx];
    return batch?.photos?.[this._viewerPhotoIdx] || null;
  },

  setDeleteError(message) {
    const el = document.getElementById('admin-delete-error');
    if (!el) return;
    if (message) {
      el.textContent = this.friendlyAdminMessage(message);
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  },

  openDeleteModal() {
    const { showToast } = window.VibrartUtils;
    const photo = this.getCurrentViewerPhoto();
    if (!photo?.id) {
      showToast('No se puede eliminar esta foto.');
      return;
    }

    const modal = document.getElementById('admin-delete-modal');
    const form = document.getElementById('admin-delete-form');
    if (!modal || !form) {
      showToast('No se cargó el formulario de eliminación. Recarga la página.');
      return;
    }

    this.setDeleteError('');
    form.password.value = '';
    modal.hidden = false;
    setTimeout(() => form.password?.focus(), 50);
  },

  closeDeleteModal() {
    const modal = document.getElementById('admin-delete-modal');
    const form = document.getElementById('admin-delete-form');
    if (modal) modal.hidden = true;
    if (form) form.password.value = '';
    this.setDeleteError('');
  },

  async confirmDeletePhoto(password) {
    const { showToast } = window.VibrartUtils;
    const photo = this.getCurrentViewerPhoto();
    if (!photo?.id) return;

    const submitBtn = document.getElementById('admin-delete-submit');
    if (submitBtn) submitBtn.disabled = true;

    try {
      window.VibrartSupabase?.init();
      await window.VibrartSupabase.verifyAdminPassword(password);
      await window.VibrartSupabase.deleteAlbumPhoto(photo);

      this.closeDeleteModal();
      this.closeViewer();
      this.clearGalleryCache();
      await this.render();
      showToast('Foto eliminada.');
    } catch (err) {
      console.error('[VIBRART Admin] delete', err);
      this.setDeleteError(err.message || 'No se pudo eliminar la foto.');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  },

  bindDeleteModal() {
    if (this._deleteBound) return;

    const modal = document.getElementById('admin-delete-modal');
    const form = document.getElementById('admin-delete-form');
    if (!modal || !form) {
      console.warn('[VIBRART Admin] Falta #admin-delete-modal en index.html');
      return;
    }

    this._deleteBound = true;

    document.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('#admin-delete-photo');
      if (!deleteBtn) return;
      const viewer = document.getElementById('admin-viewer');
      if (!viewer || viewer.hidden) return;
      e.preventDefault();
      e.stopPropagation();
      this.openDeleteModal();
    });

    document.getElementById('admin-delete-cancel')?.addEventListener('click', () => this.closeDeleteModal());
    modal.querySelector('.admin-delete-modal__backdrop')?.addEventListener('click', () =>
      this.closeDeleteModal()
    );

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = form.password?.value;
      if (!password) {
        this.setDeleteError('Escribe tu contraseña.');
        return;
      }
      await this.confirmDeletePhoto(password);
    });

    document.addEventListener('keydown', (e) => {
      if (modal.hidden) return;
      if (e.key === 'Escape') this.closeDeleteModal();
    });
  },

  bindViewer() {
    if (this._viewerBound) return;
    this._viewerBound = true;

    const box = document.getElementById('admin-viewer');
    if (!box) return;

    box.querySelector('.admin-viewer__close')?.addEventListener('click', () => this.closeViewer());
    box.querySelector('.admin-viewer__backdrop')?.addEventListener('click', () => this.closeViewer());
    box.querySelector('.admin-viewer__nav--prev')?.addEventListener('click', () => this.stepPhoto(-1));
    box.querySelector('.admin-viewer__nav--next')?.addEventListener('click', () => this.stepPhoto(1));

    document.addEventListener('keydown', (e) => {
      if (box.hidden) return;
      const deleteModal = document.getElementById('admin-delete-modal');
      if (deleteModal && !deleteModal.hidden) return;
      if (e.key === 'Escape') this.closeViewer();
      if (e.key === 'ArrowLeft') this.stepPhoto(-1);
      if (e.key === 'ArrowRight') this.stepPhoto(1);
    });
  },

  bindLogin() {
    if (this._loginBound) return;
    this._loginBound = true;

    const form = document.getElementById('admin-login-form');
    const submitBtn = document.getElementById('admin-login-submit');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.setLoginError('');

      const email = form.email?.value?.trim();
      const password = form.password?.value;
      if (!email || !password) {
        this.setLoginError('Escribe tu correo y tu contraseña.');
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      try {
        window.VibrartSupabase?.init();
        await window.VibrartSupabase.signIn(email, password);
        form.password.value = '';
        await this.syncAuthUI();
        window.VibrartUtils.showToast('Sesión iniciada');
      } catch (err) {
        this.setLoginError(err.message || 'No se pudo iniciar sesión.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    document.getElementById('admin-logout')?.addEventListener('click', async () => {
      await window.VibrartSupabase?.signOut();
      this.clearGalleryCache();
      await this.syncAuthUI();
      window.VibrartUtils.showToast('Sesión cerrada');
    });
  },

  bindClearButton() {
    document.getElementById('btn-refresh-admin')?.addEventListener('click', () => {
      this.refresh();
    });
    this.bindViewer();
    this.bindDeleteModal();
    this.bindLogin();
  },
};
