/** Galería pública — fotos con nombre y descripción de quien subió */
window.VibrartPublicGallery = {
  _photos: [],
  _index: 0,
  _activeScreenId: null,
  _loadToken: 0,
  _bound: false,

  screenToAlbum: {
    'gallery-2026': 'vibrart-2026',
    'gallery-souvenirs': 'souvenirs',
  },

  init() {
    if (this._bound) return;
    this._bound = true;

    const lightbox = document.getElementById('public-gallery-lightbox');
    if (!lightbox) return;

    lightbox.querySelector('.public-gallery-lightbox__backdrop')?.addEventListener('click', () =>
      this.closeLightbox()
    );
    lightbox.querySelector('.public-gallery-lightbox__close')?.addEventListener('click', () =>
      this.closeLightbox()
    );
    lightbox.querySelector('.public-gallery-lightbox__prev')?.addEventListener('click', () =>
      this.stepLightbox(-1)
    );
    lightbox.querySelector('.public-gallery-lightbox__next')?.addEventListener('click', () =>
      this.stepLightbox(1)
    );

    document.addEventListener('keydown', (e) => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') this.closeLightbox();
      if (e.key === 'ArrowLeft') this.stepLightbox(-1);
      if (e.key === 'ArrowRight') this.stepLightbox(1);
    });
  },

  getScreenEl(screenId) {
    return document.querySelector(`.screen[data-screen="${screenId}"]`);
  },

  displayName(photo) {
    const name = (photo?.uploader_name || '').trim();
    return name || 'Participante';
  },

  displayDescription(photo) {
    return (photo?.description || '').trim();
  },

  captionHtml(photo, { truncate = false } = {}) {
    const { escapeHtml } = window.VibrartUtils;
    const name = escapeHtml(this.displayName(photo));
    const desc = this.displayDescription(photo);
    const descClass = truncate
      ? 'gallery-page__tile-desc'
      : 'public-gallery-lightbox__desc';
    const descHtml = desc
      ? `<p class="${descClass}">${escapeHtml(desc)}</p>`
      : `<p class="${descClass} gallery-page__tile-desc--empty">Sin descripción</p>`;
    const authorClass = truncate ? 'gallery-page__tile-author' : 'public-gallery-lightbox__author';
    return `<p class="${authorClass}">${name}</p>${descHtml}`;
  },

  onEnter(screenId) {
    this.init();
    this.closeLightbox();
    this._activeScreenId = screenId;

    const screen = this.getScreenEl(screenId);
    const album = this.screenToAlbum[screenId] || screen?.dataset?.album;
    if (!screen || !album) return;

    this.loadForScreen(screen, album);
  },

  async loadForScreen(screen, album) {
    const token = ++this._loadToken;
    this._photos = [];

    const countEl = screen.querySelector('.gallery-page__count');
    const loading = screen.querySelector('.gallery-page__loading');
    const grid = screen.querySelector('.gallery-page__grid');
    const empty = screen.querySelector('.gallery-page__empty');

    if (countEl) countEl.textContent = '';
    if (grid) {
      grid.hidden = true;
      grid.innerHTML = '';
    }
    if (empty) empty.hidden = true;
    if (loading) loading.hidden = false;

    window.VibrartSupabase?.init();
    if (!window.VibrartSupabase?.isReady()) {
      if (token !== this._loadToken) return;
      if (loading) loading.hidden = true;
      if (empty) {
        empty.hidden = false;
        empty.textContent = 'El álbum no está disponible en este momento.';
      }
      return;
    }

    try {
      this._photos = await window.VibrartSupabase.fetchPublicGallery(album);
    } catch (err) {
      console.error('[VIBRART Gallery]', err);
      if (token !== this._loadToken) return;
      if (loading) loading.hidden = true;
      if (empty) {
        empty.hidden = false;
        empty.textContent = 'No pudimos cargar las fotos. Revisa tu internet e inténtalo de nuevo.';
      }
      return;
    }

    if (token !== this._loadToken) return;
    if (loading) loading.hidden = true;

    if (!this._photos.length) {
      if (empty) {
        empty.hidden = false;
        empty.textContent = 'Aún no hay fotos aquí. ¡Sé el primero en compartir el tuyo!';
      }
      return;
    }

    if (countEl) {
      const n = this._photos.length;
      countEl.textContent = `${n} foto${n === 1 ? '' : 's'} compartida${n === 1 ? '' : 's'}`;
    }

    this.renderGrid(screen);
  },

  renderGrid(screen) {
    const grid = screen.querySelector('.gallery-page__grid');
    const { escapeHtml } = window.VibrartUtils;
    if (!grid) return;

    grid.innerHTML = this._photos
      .map((photo, i) => {
        const name = this.displayName(photo);
        const desc = this.displayDescription(photo);
        const label = desc ? `${name}: ${desc}` : name;
        return `
      <button type="button" class="gallery-page__tile" data-index="${i}" aria-label="${escapeHtml(label)}">
        <img src="${escapeHtml(photo.public_url)}" alt="" loading="lazy" decoding="async">
        <div class="gallery-page__tile-caption">
          ${this.captionHtml(photo, { truncate: true })}
        </div>
      </button>
    `;
      })
      .join('');

    grid.hidden = false;
    grid.querySelectorAll('.gallery-page__tile').forEach((tile) => {
      tile.addEventListener('click', () => this.openLightbox(Number(tile.dataset.index)));
    });
  },

  openLightbox(index) {
    if (!this._photos.length) return;
    this._index = ((index % this._photos.length) + this._photos.length) % this._photos.length;

    const lightbox = document.getElementById('public-gallery-lightbox');
    const img = lightbox?.querySelector('.public-gallery-lightbox__img');
    const caption = lightbox?.querySelector('.public-gallery-lightbox__caption');
    const counter = lightbox?.querySelector('.public-gallery-lightbox__counter');
    if (!lightbox || !img) return;

    const photo = this._photos[this._index];
    img.src = photo.public_url;
    img.alt = this.displayDescription(photo) || `Foto de ${this.displayName(photo)}`;
    if (caption) {
      caption.innerHTML = this.captionHtml(photo);
    }
    if (counter) {
      counter.textContent = `${this._index + 1} / ${this._photos.length}`;
    }
    lightbox.hidden = false;
  },

  closeLightbox() {
    const lightbox = document.getElementById('public-gallery-lightbox');
    if (lightbox) lightbox.hidden = true;
  },

  stepLightbox(delta) {
    if (document.getElementById('public-gallery-lightbox')?.hidden) return;
    this.openLightbox(this._index + delta);
  },
};
