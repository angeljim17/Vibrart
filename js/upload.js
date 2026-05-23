/** Grillas de subida de fotos y envío al servidor */
window.VibrartUpload = {
  INITIAL_SLOTS: 3,
  albumData: null,
  /** Archivos originales en memoria (clave: album:index) */
  fileStore: new Map(),

  UPLOAD_ICON: `
    <svg class="upload-slot__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g class="upload-slot__cloud" transform="translate(12 11.5) scale(1.22) translate(-12 -11.5)">
        <path
          class="upload-slot__cloud-base"
          pathLength="100"
          d="M6.8 17.2h10.4c2.35 0 4.25-1.75 4.25-4.1 0-1.95-1.35-3.55-3.15-3.85.35-2.15-2.15-3.95-4.35-3.5-.95-1.65-2.85-2.45-4.75-1.95-2.15.55-3.65 2.35-3.95 4.35-1.55.35-2.65 1.55-2.65 3.25 0 1.85 1.55 3.4 3.6 3.8z"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linejoin="round"
        />
        <path
          class="upload-slot__cloud-ring"
          pathLength="100"
          d="M6.8 17.2h10.4c2.35 0 4.25-1.75 4.25-4.1 0-1.95-1.35-3.55-3.15-3.85.35-2.15-2.15-3.95-4.35-3.5-.95-1.65-2.85-2.45-4.75-1.95-2.15.55-3.65 2.35-3.95 4.35-1.55.35-2.65 1.55-2.65 3.25 0 1.85 1.55 3.4 3.6 3.8z"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </g>
      <g class="upload-slot__upload-inner">
        <path
          class="upload-slot__tray"
          d="M7.2 16.2H16.8"
          stroke="currentColor"
          stroke-width="1.45"
          stroke-linecap="round"
        />
        <path
          class="upload-slot__arrow"
          d="M12 14.8V10M12 10L9.8 12.2M12 10L14.2 12.2"
          stroke="currentColor"
          stroke-width="1.45"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
    </svg>
  `,

  initGrids() {
    this.bindContactForm();
    this.albumData = window.VibrartUtils.loadAlbumData();
    document.querySelectorAll('.upload-grid').forEach((grid) => {
      const album = grid.dataset.album;
      if (album) this.ensureGrid(grid.id, album);
    });
  },

  getAlbumKey(album) {
    return album === 'vibrart-2026' ? 'vibrart-2026' : 'souvenirs';
  },

  fileKey(album, index) {
    return `${album}:${index}`;
  },

  _formBound: false,
  _formResolver: null,

  bindContactForm() {
    if (this._formBound) return;
    this._formBound = true;

    const modal = document.getElementById('upload-contact-modal');
    const form = document.getElementById('upload-contact-form');
    const cancel = document.getElementById('upload-modal-cancel');
    const backdrop = modal?.querySelector('.upload-modal__backdrop');
    const errorEl = document.getElementById('upload-modal-error');

    const close = (result) => {
      if (!modal) return;
      modal.hidden = true;
      document.body.style.overflow = '';
      if (errorEl) errorEl.hidden = true;
      const resolve = this._formResolver;
      this._formResolver = null;
      resolve?.(result);
    };

    cancel?.addEventListener('click', () => close(null));
    backdrop?.addEventListener('click', () => close(null));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.hidden) close(null);
    });

    const phoneInput = form?.querySelector('input[name="phone"]');
    phoneInput?.addEventListener('input', () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const contact = this.validateContact({
        fullName: data.get('fullName'),
        email: data.get('email'),
        phone: data.get('phone'),
      });

      if (!contact.ok) {
        if (errorEl) {
          errorEl.textContent = contact.message;
          errorEl.hidden = false;
        }
        return;
      }

      close(contact.value);
    });
  },

  validateContact({ fullName, email, phone }) {
    const name = String(fullName || '').trim();
    const mail = String(email || '').trim();
    const digits = String(phone || '').replace(/\D/g, '').slice(0, 10);

    if (name.length < 2) {
      return { ok: false, message: 'Escribe tu nombre completo.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      return { ok: false, message: 'Escribe un correo electrónico válido.' };
    }
    if (digits.length !== 10) {
      return { ok: false, message: 'El teléfono debe tener exactamente 10 dígitos.' };
    }

    return {
      ok: true,
      value: { fullName: name, email: mail, phone: digits },
    };
  },

  promptUploaderForm() {
    this.bindContactForm();
    const modal = document.getElementById('upload-contact-modal');
    const form = document.getElementById('upload-contact-form');
    const errorEl = document.getElementById('upload-modal-error');

    if (!modal || !form) {
      return Promise.resolve(null);
    }

    form.reset();
    if (errorEl) errorEl.hidden = true;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    form.querySelector('input[name="fullName"]')?.focus();

    return new Promise((resolve) => {
      this._formResolver = resolve;
    });
  },

  async handleSubmitClick(album) {
    const pending = this.getPendingItems(album);
    if (!pending.length) {
      window.VibrartUtils.showToast('Primero elige al menos una foto.');
      this.setStatus(album, 'Toca un recuadro para elegir tu foto.', '');
      return;
    }

    const contact = await this.promptUploaderForm();
    if (!contact) return;

    await this.uploadAlbum(album, contact);
  },

  getEndpoint(album) {
    const cfg = window.VIBRART_CONFIG.upload;
    const key = this.getAlbumKey(album);
    return (cfg.endpoints && cfg.endpoints[key]) || cfg.endpoint || '';
  },

  hasSupabaseConfig() {
    const s = window.VIBRART_CONFIG?.supabase;
    const key = window.VIBRART_CONFIG.getSupabaseKey?.() || '';
    return Boolean(s?.url?.trim() && key);
  },

  useSupabase() {
    const provider = window.VIBRART_CONFIG.upload?.provider || 'auto';
    if (provider === 'rest') return false;
    window.VibrartSupabase?.init();
    if (provider === 'supabase') return window.VibrartSupabase?.isReady();
    if (this.hasSupabaseConfig()) return window.VibrartSupabase?.isReady();
    return false;
  },

  isUploadConfigured() {
    if (this.hasSupabaseConfig()) return this.useSupabase();
    return (
      this.useSupabase() ||
      Boolean(this.getEndpoint('vibrart-2026')) ||
      Boolean(this.getEndpoint('souvenirs'))
    );
  },

  getActionsEl(album) {
    const key = this.getAlbumKey(album);
    return document.querySelector(`[data-upload-actions="${key}"]`);
  },

  /** Mensaje corto para pantalla y toast (sin tecnicismos) */
  friendlyError(message) {
    if (!message) {
      return 'No pudimos subir la foto. Revisa tu internet e inténtalo de nuevo.';
    }
    const m = message.toLowerCase();
    if (m.includes('config.local') || (m.includes('supabase') && m.includes('http'))) {
      return 'El álbum no está disponible en este momento. Avísanos en el evento.';
    }
    if (message.length <= 160 && !m.includes('pgrst') && !m.includes('statuscode')) {
      return message;
    }
    return 'No pudimos subir la foto. Revisa tu internet e inténtalo de nuevo.';
  },

  setStatus(album, message, type = '') {
    const actions = this.getActionsEl(album);
    const status = actions?.querySelector('.upload-page__status');
    if (status) {
      status.textContent = message;
      status.className = `upload-page__status${type ? ` upload-page__status--${type}` : ''}`;
    }
  },

  updateUploadButton(album) {
    const actions = this.getActionsEl(album);
    const btn = actions?.querySelector('.btn-upload-submit');
    if (!btn) return;

    const pending = this.getPendingItems(album);
    const configured = this.useSupabase() || this.getEndpoint(album);

    btn.disabled = pending.length === 0 || !configured;
    btn.textContent =
      pending.length > 0
        ? `Subir ${pending.length} foto${pending.length > 1 ? 's' : ''} al álbum`
        : 'Subir fotos al álbum';

    if (!configured) {
      this.setStatus(album, 'El álbum no está disponible por ahora.', 'warn');
    } else if (pending.length === 0) {
      this.setStatus(album, 'Toca un recuadro para elegir tu foto.', '');
    } else if (pending.length === 1) {
      this.setStatus(album, 'Tienes 1 foto lista. Pulsa el botón para compartirla.', '');
    } else {
      this.setStatus(album, `Tienes ${pending.length} fotos listas. Pulsa el botón para compartirlas.`, '');
    }
  },

  getPendingItems(album) {
    const key = this.getAlbumKey(album);
    const items = this.albumData[key] || [];
    const pending = [];

    items.forEach((item, index) => {
      if (item?.image && !item.uploaded) {
        pending.push({ index, item });
      }
    });

    return pending;
  },

  getFileForSlot(album, index, item) {
    const stored = this.fileStore.get(this.fileKey(album, index));
    if (stored) return stored;
    if (!item?.image) return null;
    const name = item.fileName || `vibrart-${album}-${index + 1}.jpg`;
    return window.VibrartUtils.dataUrlToFile(item.image, name);
  },

  REMOVE_ICON: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 6h18"/>
      <path d="M8 6V4h8v2"/>
      <path d="M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6"/>
      <path d="M10 11v6M14 11v6"/>
    </svg>
  `,

  setDescInputState(descInput, enabled) {
    if (!descInput) return;
    descInput.disabled = !enabled;
    descInput.placeholder = enabled
      ? '(descripción de la foto)'
      : 'Primero elige una foto';
    descInput.setAttribute('aria-disabled', enabled ? 'false' : 'true');
  },

  syncSlotUI(slot, { hasImage, uploaded }, descInput = null) {
    const zone = slot.querySelector('.upload-slot__zone');
    const removeBtn = slot.querySelector('.upload-slot__remove');
    const desc = descInput || slot.querySelector('.upload-slot__desc');
    let badge = slot.querySelector('.upload-slot__badge');

    slot.classList.toggle('upload-slot--uploaded', Boolean(hasImage && uploaded));
    slot.classList.toggle('upload-slot--pending', Boolean(hasImage && !uploaded));
    this.setDescInputState(desc, hasImage);

    if (hasImage && !uploaded) {
      if (removeBtn) removeBtn.hidden = false;
      badge?.remove();
      return;
    }

    if (removeBtn) removeBtn.hidden = true;

    if (hasImage && uploaded) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'upload-slot__badge';
        zone?.appendChild(badge);
      }
      badge.textContent = '✓';
      badge.setAttribute('aria-label', 'Ya en el álbum');
    } else {
      badge?.remove();
    }
  },

  clearSlotPhoto(album, index, slot, zone, fileInput, descInput) {
    const { showToast } = window.VibrartUtils;
    const albumKey = this.getAlbumKey(album);

    this.fileStore.delete(this.fileKey(album, index));
    this.albumData[albumKey][index] = {};
    window.VibrartUtils.saveAlbumData(this.albumData);

    zone.classList.remove('has-image');
    zone.querySelector('img')?.remove();
    fileInput.value = '';
    descInput.value = '';

    this.syncSlotUI(slot, { hasImage: false, uploaded: false }, descInput);
    this.updateUploadButton(album);
    showToast('Foto quitada del listado.');
  },

  clearAlbumGrid(album) {
    const key = this.getAlbumKey(album);
    const gridId = album === 'vibrart-2026' ? 'grid-2026' : 'grid-souvenirs';
    const prefix = `${album}:`;

    this.albumData[key] = [];
    for (const storeKey of [...this.fileStore.keys()]) {
      if (storeKey.startsWith(prefix)) this.fileStore.delete(storeKey);
    }

    window.VibrartUtils.saveAlbumData(this.albumData);

    const grid = document.getElementById(gridId);
    if (!grid) return;

    delete grid.dataset.initialized;
    grid.innerHTML = '';
    this.ensureGrid(gridId, album);
    this.setStatus(album, '¡Gracias! Ya puedes subir más momentos.', 'ok');
  },

  refreshSlotBadges(album) {
    const grid = document.getElementById(
      album === 'vibrart-2026' ? 'grid-2026' : 'grid-souvenirs'
    );
    if (!grid) return;

    const key = this.getAlbumKey(album);
    grid.querySelectorAll('.upload-slot').forEach((slot) => {
      const index = Number(slot.dataset.index);
      const item = this.albumData[key]?.[index];
      const descInput = slot.querySelector('.upload-slot__desc');
      if (item?.image) {
        this.syncSlotUI(slot, { hasImage: true, uploaded: Boolean(item.uploaded) }, descInput);
      } else {
        this.syncSlotUI(slot, { hasImage: false, uploaded: false }, descInput);
      }
    });
  },

  bindUploadActions(album) {
    const actions = this.getActionsEl(album);
    const btn = actions?.querySelector('.btn-upload-submit');
    if (!btn || btn.dataset.bound) return;

    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => this.handleSubmitClick(album));
    this.updateUploadButton(album);
  },

  async uploadAlbum(album, uploader = null) {
    if (this.useSupabase()) {
      return this.uploadAlbumSupabase(album, uploader);
    }
    return this.uploadAlbumRest(album, uploader);
  },

  async uploadAlbumSupabase(album, uploader) {
    const { showToast } = window.VibrartUtils;
    const pending = this.getPendingItems(album);
    const debug = window.VIBRART_CONFIG?.debugUpload !== false;
    const log = (...args) => debug && console.log('[VIBRART Upload]', ...args);

    log('click Subir', {
      album,
      origin: location.origin,
      protocol: location.protocol,
      supabaseReady: window.VibrartSupabase?.isReady(),
      pendingCount: pending.length,
    });

    window.VibrartSupabase?.init();
    if (!window.VibrartSupabase?.isReady()) {
      log('ABORT: Supabase no listo', {
        tieneConfig: this.hasSupabaseConfig(),
        url: window.VIBRART_CONFIG?.supabase?.url,
      });
      showToast('El álbum no está disponible en este momento.');
      this.setStatus(album, 'El álbum no está disponible por ahora.', 'warn');
      return;
    }
    if (!pending.length) {
      log('ABORT: sin fotos pendientes');
      showToast('Primero elige al menos una foto.');
      this.setStatus(album, 'Toca un recuadro para elegir tu foto.', '');
      return;
    }

    const actions = this.getActionsEl(album);
    const btn = actions?.querySelector('.btn-upload-submit');
    const key = this.getAlbumKey(album);
    const maxMb = window.VIBRART_CONFIG.upload?.maxSizeMb || 12;
    const total = pending.length;
    let done = 0;

    if (btn) {
      btn.disabled = true;
      btn.classList.add('btn-upload-submit--loading');
      btn.textContent = total > 1 ? 'Subiendo fotos…' : 'Subiendo foto…';
    }

    const uploadBatchId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `batch-${Date.now()}`;

    try {
      for (const { index, item } of pending) {
        done += 1;
        this.setStatus(
          album,
          total > 1
            ? `Guardando foto ${done} de ${total}…`
            : 'Guardando tu foto…',
          ''
        );

        const fromStore = this.fileStore.has(this.fileKey(album, index));
        let file = this.getFileForSlot(album, index, item);
        if (!file) {
          log(`slot ${index}: sin archivo, se omite`);
          continue;
        }

        file = await window.VibrartUtils.preparePhotoForUpload(file);

        log(`slot ${index}: archivo listo`, {
          source: fromStore ? 'fileStore (original)' : 'localStorage (dataUrl)',
          name: file.name,
          size: file.size,
          type: file.type,
        });

        if (file.size > maxMb * 1024 * 1024) {
          throw new Error(`La foto ${index + 1} es muy pesada. Usa una de menos de ${maxMb} MB.`);
        }

        const result = await window.VibrartSupabase.uploadOne(
          key,
          file,
          item.description || '',
          uploadBatchId,
          uploader
        );

        if (!this.albumData[key][index]) this.albumData[key][index] = {};
        this.albumData[key][index].uploaded = true;
        this.albumData[key][index].uploadedAt = new Date().toISOString();
        this.albumData[key][index].remoteUrl = result.publicUrl;
        this.albumData[key][index].storagePath = result.storagePath;
        this.albumData[key][index].supabaseId = result.recordId;
      }

      window.VibrartUtils.saveAlbumData(this.albumData);
      showToast(
        total > 1
          ? `¡Listo! Tus ${total} fotos ya están en el álbum.`
          : '¡Listo! Tu foto ya está en el álbum.'
      );
      this.clearAlbumGrid(album);
    } catch (err) {
      console.error('[VIBRART Upload] ERROR final', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
      });
      const friendly = this.friendlyError(err.message);
      showToast(friendly);
      this.setStatus(album, friendly, 'error');
    } finally {
      if (btn) {
        btn.classList.remove('btn-upload-submit--loading');
        this.updateUploadButton(album);
      }
    }
  },

  async uploadAlbumRest(album, uploader) {
    const { showToast } = window.VibrartUtils;
    const endpoint = this.getEndpoint(album);
    const pending = this.getPendingItems(album);

    if (!endpoint) {
      showToast('El álbum no está disponible en este momento.');
      return;
    }

    const actions = this.getActionsEl(album);
    const btn = actions?.querySelector('.btn-upload-submit');
    const key = this.getAlbumKey(album);
    const maxMb = window.VIBRART_CONFIG.upload?.maxSizeMb || 12;

    if (btn) {
      btn.disabled = true;
      btn.classList.add('btn-upload-submit--loading');
      btn.textContent = 'Subiendo…';
    }
    this.setStatus(album, 'Guardando tus fotos…', '');

    const formData = new FormData();
    formData.append('album', key);
    const descriptions = [];

    try {
      for (const { index, item } of pending) {
        const file = this.getFileForSlot(album, index, item);
        if (!file) continue;

        if (file.size > maxMb * 1024 * 1024) {
          throw new Error(`La foto ${index + 1} es muy pesada. Usa una de menos de ${maxMb} MB.`);
        }

        formData.append('photos', file, file.name);
        descriptions.push(item.description || '');
      }

      formData.append('descriptions', JSON.stringify(descriptions));
      if (uploader) {
        formData.append('uploader_name', uploader.fullName);
        formData.append('uploader_email', uploader.email);
        formData.append('uploader_phone', uploader.phone);
      }

      const response = await fetch(endpoint, { method: 'POST', body: formData });

      let result = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = { message: await response.text() };
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || `Error ${response.status}`);
      }

      pending.forEach(({ index }, i) => {
        if (!this.albumData[key][index]) this.albumData[key][index] = {};
        this.albumData[key][index].uploaded = true;
        this.albumData[key][index].uploadedAt = new Date().toISOString();
        if (result.urls?.[i]) {
          this.albumData[key][index].remoteUrl = result.urls[i];
        }
      });

      window.VibrartUtils.saveAlbumData(this.albumData);
      showToast('¡Listo! Tus fotos ya están en el álbum.');
      this.clearAlbumGrid(album);
    } catch (err) {
      console.error(err);
      const friendly = this.friendlyError(err.message);
      showToast(friendly);
      this.setStatus(album, friendly, 'error');
    } finally {
      if (btn) {
        btn.classList.remove('btn-upload-submit--loading');
        this.updateUploadButton(album);
      }
    }
  },

  createSlotElement(album, index, data = {}) {
    const { escapeHtml, showToast } = window.VibrartUtils;
    const slot = document.createElement('div');
    slot.className = 'upload-slot';
    if (data.uploaded) slot.classList.add('upload-slot--uploaded');
    else if (data.image) slot.classList.add('upload-slot--pending');
    slot.dataset.index = index;

    const hasImage = Boolean(data.image);
    const inputId = `upload-file-${this.getAlbumKey(album)}-${index}`;
    slot.innerHTML = `
      <input type="file" id="${inputId}" class="upload-slot__input" accept="image/*" hidden>
      <div class="upload-slot__frame">
        <label for="${inputId}" class="upload-slot__zone ${hasImage ? 'has-image' : ''}">
          ${this.UPLOAD_ICON}
          ${hasImage ? `<img src="${data.image}" alt="Vista previa">` : ''}
          ${hasImage && data.uploaded ? '<span class="upload-slot__badge" aria-hidden="true">✓</span>' : ''}
        </label>
        <button type="button" class="upload-slot__remove" hidden aria-label="Quitar esta foto">
          ${this.REMOVE_ICON}
        </button>
      </div>
      <input type="text" class="upload-slot__desc" placeholder="(descripción de la foto)" value="${escapeHtml(data.description || '')}" maxlength="120">
    `;

    const zone = slot.querySelector('.upload-slot__zone');
    const fileInput = slot.querySelector('.upload-slot__input');
    const descInput = slot.querySelector('.upload-slot__desc');
    const removeBtn = slot.querySelector('.upload-slot__remove');

    this.syncSlotUI(slot, { hasImage, uploaded: Boolean(data.uploaded) }, descInput);

    removeBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const albumKey = this.getAlbumKey(album);
      const item = this.albumData[albumKey]?.[index];
      if (!item?.image || item.uploaded) return;
      this.clearSlotPhoto(album, index, slot, zone, fileInput, descInput);
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!window.VibrartUtils.isImageFile(file)) {
        showToast('Elige un archivo de imagen (JPG, PNG, etc.).');
        fileInput.value = '';
        return;
      }

      const maxMb = window.VIBRART_CONFIG.upload?.maxSizeMb || 12;
      if (file.size > maxMb * 1024 * 1024) {
        showToast(`Esa imagen es muy pesada. Prueba con una de menos de ${maxMb} MB.`);
        return;
      }

      this.fileStore.set(this.fileKey(album, index), file);

      const reader = new FileReader();
      reader.onload = () => {
        const albumKey = this.getAlbumKey(album);
        if (!this.albumData[albumKey][index]) this.albumData[albumKey][index] = {};
        this.albumData[albumKey][index].image = reader.result;
        this.albumData[albumKey][index].uploaded = false;
        this.albumData[albumKey][index].fileName = file.name;
        window.VibrartUtils.saveAlbumData(this.albumData);

        let img = zone.querySelector('img');
        if (!img) {
          img = document.createElement('img');
          img.alt = 'Vista previa';
          zone.appendChild(img);
        }
        img.src = reader.result;
        zone.classList.add('has-image');
        this.syncSlotUI(slot, { hasImage: true, uploaded: false }, descInput);
        showToast('Foto lista.');
        this.updateUploadButton(album);
        fileInput.value = '';
      };
      reader.readAsDataURL(file);
    });

    descInput.addEventListener('input', () => {
      if (descInput.disabled) return;
      const albumKey = this.getAlbumKey(album);
      if (!this.albumData[albumKey][index]) this.albumData[albumKey][index] = {};
      this.albumData[albumKey][index].description = descInput.value;
      if (this.albumData[albumKey][index].uploaded) {
        this.albumData[albumKey][index].uploaded = false;
        this.syncSlotUI(
          slot,
          {
            hasImage: Boolean(this.albumData[albumKey][index].image),
            uploaded: false,
          },
          descInput
        );
        this.updateUploadButton(album);
      }
      window.VibrartUtils.saveAlbumData(this.albumData);
    });

    return slot;
  },

  ensureGrid(gridId, album) {
    const grid = document.getElementById(gridId);
    if (!grid || grid.dataset.initialized) return;

    grid.dataset.initialized = 'true';
    const key = this.getAlbumKey(album);
    const items = this.albumData[key] || [];
    const count = Math.max(this.INITIAL_SLOTS, items.length);

    grid.innerHTML = '';

    for (let i = 0; i < count; i++) {
      grid.appendChild(this.createSlotElement(album, i, items[i] || {}));
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'upload-add';
    addBtn.setAttribute('aria-label', 'Añadir cuadro');
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => {
      const idx = grid.querySelectorAll('.upload-slot').length;
      grid.insertBefore(this.createSlotElement(album, idx), addBtn);
      window.VibrartUtils.showToast('Añadiste otro recuadro para otra foto.');
      this.updateUploadButton(album);
    });
    grid.appendChild(addBtn);

    this.bindUploadActions(album);
    this.refreshSlotBadges(album);
    this.updateUploadButton(album);

    this.setupStickyUploadBar(album);
    if (gridId === 'grid-2026') this.setupFabScroll(grid);
  },

  setupStickyUploadBar(album) {
    const actions = this.getActionsEl(album);
    const main = actions?.closest('.upload-page__main');
    if (!main || !actions || actions.dataset.stickyBound) return;

    actions.dataset.stickyBound = 'true';

    let spacer = actions.previousElementSibling;
    if (!spacer?.classList?.contains('upload-page__actions-spacer')) {
      spacer = document.createElement('div');
      spacer.className = 'upload-page__actions-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      actions.parentNode.insertBefore(spacer, actions);
    }

    const isMobileBar = () => window.matchMedia('(max-width: 768px)').matches;

    const refreshMobileSpacer = () => {
      spacer.style.display = 'block';
      spacer.style.height = `${actions.offsetHeight}px`;
    };

    if (isMobileBar()) {
      refreshMobileSpacer();
      window.addEventListener('resize', refreshMobileSpacer, { passive: true });
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(refreshMobileSpacer).observe(actions);
      }
      return;
    }

    let stuck = false;
    let rafId = 0;
    const ON = 96;
    const OFF = 48;

    const applyStuck = (next) => {
      if (next === stuck) return;
      stuck = next;

      if (stuck) {
        const h = actions.offsetHeight;
        spacer.style.height = `${h}px`;
        spacer.style.display = 'block';
        actions.classList.add('upload-page__actions--stuck');
      } else {
        actions.classList.remove('upload-page__actions--stuck');
        spacer.style.height = '';
        spacer.style.display = 'none';
      }
    };

    const update = () => {
      rafId = 0;
      const y = main.scrollTop;
      const shouldStuck = stuck ? y > OFF : y > ON;
      applyStuck(shouldStuck);
    };

    const onScroll = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    main.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  },

  setupFabScroll(grid) {
    const fab = grid.closest('.screen')?.querySelector('.fab-scroll');
    const container = grid.closest('.upload-page__main') || grid.closest('.screen__content');
    if (!fab || !container) return;

    container.addEventListener('scroll', () => {
      fab.classList.toggle('visible', container.scrollTop > 120);
    });

    fab.addEventListener('click', () => {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    });
  },

  resetGrids() {
    this.fileStore.clear();
    document.querySelectorAll('.upload-grid').forEach((g) => {
      delete g.dataset.initialized;
      g.innerHTML = '';
    });
  },
};
