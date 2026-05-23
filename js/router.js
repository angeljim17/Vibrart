/** Carga de pantallas, historial y navegación con transiciones */
window.VibrartRouter = {
  currentScreen: 'intro',
  history: [],
  isTransitioning: false,
  TRANSITION_MS: 800,

  async loadScreens() {
    const app = document.getElementById('app');
    const { screens } = window.VIBRART_CONFIG;

    for (const { id, file } of screens) {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`No se pudo cargar ${file}`);
      const html = await res.text();
      app.insertAdjacentHTML('beforeend', html);
    }

    this.injectBackButtons();
    this.bindNavigation();
    this.updateBackButtons();
    window.VibrartWarp?.init();
    window.VibrartUpload?.initGrids();
    window.VibrartAdmin?.bindClearButton();
  },

  injectBackButtons() {
    const arrowSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;

    document.querySelectorAll('.screen').forEach((screen) => {
      if (screen.dataset.screen === 'intro') return;

      const content = screen.querySelector('.screen__content');
      if (!content || content.querySelector('.btn-back-arrow')) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-back-arrow';
      btn.setAttribute('aria-label', 'Volver a la página anterior');
      btn.innerHTML = arrowSvg;
      btn.addEventListener('click', () => this.goBack());
      content.prepend(btn);
      content.classList.add('screen__content--has-back');
    });
  },

  bindNavigation() {
    document.getElementById('app').addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-nav]');
      if (!trigger) return;
      e.preventDefault();
      this.navigateTo(trigger.dataset.nav);
    });
  },

  goBack() {
    if (this.isTransitioning || this.history.length === 0) return;
    const prev = this.history.pop();
    this.navigateTo(prev, { fromBack: true });
  },

  afterScreenChange(screenId) {
    if (screenId === 'admin') window.VibrartAdmin?.onEnter();
      if (screenId === 'upload-2026') {
        window.VibrartUpload?.ensureGrid('grid-2026', 'vibrart-2026');
        window.VibrartUpload?.updateUploadButton('vibrart-2026');
      }
      if (screenId === 'upload-souvenirs') {
        window.VibrartUpload?.ensureGrid('grid-souvenirs', 'souvenirs');
        window.VibrartUpload?.updateUploadButton('souvenirs');
      }
    if (screenId === 'gallery-2026' || screenId === 'gallery-souvenirs') {
      window.VibrartPublicGallery?.onEnter(screenId);
    }
    this.updateBackButtons();
  },

  finishTransition(current, next, screenId) {
    current.classList.remove('screen--leaving', 'screen--active');
    next.classList.remove('screen--incoming');
    this.currentScreen = screenId;
    this.afterScreenChange(screenId);
    this.isTransitioning = false;
  },

  navigateTo(screenId, options = {}) {
    if (this.isTransitioning || screenId === this.currentScreen) return;

    const current = document.querySelector(`.screen[data-screen="${this.currentScreen}"]`);
    const next = document.querySelector(`.screen[data-screen="${screenId}"]`);
    if (!current || !next) return;

    if (!options.fromBack) {
      this.history.push(this.currentScreen);
    }

    this.isTransitioning = true;

    if (screenId !== 'intro') {
      window.VibrartWarp?.stop();
    } else {
      window.VibrartWarp?.start();
    }

    // Preparar entrada (crossfade)
    next.classList.add('screen--incoming');
    void next.offsetWidth;

    current.classList.remove('screen--active');
    current.classList.add('screen--leaving');
    next.classList.remove('screen--incoming');
    next.classList.add('screen--active');

    let done = false;
    const complete = () => {
      if (done) return;
      done = true;
      current.removeEventListener('transitionend', onTransitionEnd);
      this.finishTransition(current, next, screenId);
    };

    const onTransitionEnd = (e) => {
      if (e.target !== current || e.propertyName !== 'opacity') return;
      complete();
    };

    current.addEventListener('transitionend', onTransitionEnd);
    setTimeout(complete, this.TRANSITION_MS + 80);
  },

  updateBackButtons() {
    const show = this.currentScreen !== 'intro' && this.history.length > 0;
    document.querySelectorAll('.btn-back-arrow').forEach((btn) => {
      const screen = btn.closest('.screen');
      const isActive = screen?.dataset?.screen === this.currentScreen;
      btn.classList.toggle('btn-back-arrow--visible', show && isActive);
      btn.disabled = !show || !isActive;
    });
  },
};
