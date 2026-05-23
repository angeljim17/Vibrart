/** Utilidades compartidas */
window.VibrartUtils = {
  STORAGE_KEY: 'vibrart-album-data',

  loadAlbumData() {
    try {
      return (
        JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {
          'vibrart-2026': [],
          souvenirs: [],
        }
      );
    } catch {
      return { 'vibrart-2026': [], souvenirs: [] };
    }
  },

  saveAlbumData(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  },

  logoImg(sizeClass = '') {
    const src = window.VIBRART_CONFIG.logo;
    const cls = ['vibrart-logo', sizeClass].filter(Boolean).join(' ');
    return `<img src="${src}" alt="VIBRART" class="${cls}" width="320" height="80">`;
  },

  dataUrlToFile(dataUrl, filename) {
    const match = /^data:([^;,]+)?(?:;base64)?,(.*)$/s.exec(dataUrl);
    if (!match) {
      throw new Error('Imagen en caché inválida. Vuelve a elegir la foto.');
    }
    const mime = match[1] || 'image/jpeg';
    const base64 = match[2].replace(/\s/g, '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime });
  },

  isImageFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith('image/')) return true;
    return /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name || '');
  },

  /** HEIC / fotos grandes del móvil → JPEG compatible con el servidor */
  async preparePhotoForUpload(file) {
    const normalized = window.VibrartSupabase?.normalizeUploadFile(file) || file;
    const name = normalized.name || '';
    const needsConvert =
      /heic|heif/i.test(normalized.type) ||
      /\.heic|\.heif$/i.test(name) ||
      normalized.size > 2.8 * 1024 * 1024;

    if (!needsConvert) return normalized;

    const url = URL.createObjectURL(normalized);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () =>
          reject(new Error('No pudimos leer esa foto. Prueba con otra imagen o hazla más pequeña.'));
        img.src = url;
      });

      const maxSide = 2400;
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        const scale = maxSide / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('No pudimos preparar la foto.'))),
          'image/jpeg',
          0.88
        );
      });

      const baseName = name.replace(/\.[^.]+$/, '') || 'foto';
      return new File([blob], `${baseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  },
};
