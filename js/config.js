/** Rutas, assets y enlaces externos */
window.VIBRART_CONFIG = {
  /** Logs de subida en consola (F12). Pon false para silenciar. */
  debugUpload: true,

  logo: 'assets/Logo_Vibrart.png',
  hero: 'assets/artistas.png',
  links: {
    instagram: 'https://www.instagram.com/vibrartfestival/',
    facebook: 'https://www.facebook.com/VibrArtFestival/',
    liveTec:
      'https://live.tec.mx/vibrart?_gl=1*m9wnj1*_gcl_au*MTg2ODYzNDc5Mi4xNzczMTAwMjE4*_ga*NzkzMDgwNTI2LjE3MjM0MDYzOTU.*_ga_D9LSDN87GD*czE3Nzk0NjYxMjQkbzYwJGcxJHQxNzc5NDY2MTc2JGo4JGwwJGgxNjgyNTQ3MTc.',
  },
  screens: [
    { id: 'intro', file: 'screens/intro.html' },
    { id: 'landing', file: 'screens/landing.html' },
    { id: 'upload-2026', file: 'screens/upload-2026.html' },
    { id: 'gallery-2026', file: 'screens/gallery-2026.html' },
    { id: 'upload-souvenirs', file: 'screens/upload-souvenirs.html' },
    { id: 'gallery-souvenirs', file: 'screens/gallery-souvenirs.html' },
    { id: 'admin', file: 'screens/admin.html' },
  ],

  /**
   * Supabase — rellena en js/config.local.js (copia config.local.example.js)
   * Dashboard: Project Settings → API → URL y anon public key
   */
  supabase: {
    /** Project URL (Settings → API → API URL) */
    url: '',
    /**
     * Clave pública del navegador — usa UNA de estas dos:
     * • Publishable key (nueva): sb_publishable_...
     * • anon key (legacy): eyJhbGciOiJIUzI1NiIs...
     */
    publishableKey: '',
    anonKey: '',
    bucket: 'vibrart-album',
    table: 'album_photos',
    /** Vista pública (imagen, nombre, descripción). Ver supabase/public-gallery.sql */
    galleryView: 'album_photos_gallery',
  },

  /**
   * Subida: 'supabase' (recomendado) o 'rest' (servidor Node en server/)
   * Con 'auto' usa Supabase si url + publishableKey (o anonKey) están configurados.
   */
  upload: {
    provider: 'auto',
    maxSizeMb: 12,
    endpoints: {
      'vibrart-2026': 'http://localhost:3001/api/upload/vibrart-2026',
      souvenirs: 'http://localhost:3001/api/upload/souvenirs',
    },
  },
};

function applyVibrartLocalConfig() {
  const local = window.VIBRART_CONFIG_LOCAL;
  if (!local || !window.VIBRART_CONFIG) return;
  if (local.supabase) Object.assign(window.VIBRART_CONFIG.supabase, local.supabase);
  if (local.upload) Object.assign(window.VIBRART_CONFIG.upload, local.upload);
}

applyVibrartLocalConfig();

if (window.VIBRART_CONFIG.debugUpload) {
  const s = window.VIBRART_CONFIG.supabase;
  const key = (s?.publishableKey || s?.anonKey || '').trim();
  console.log('[VIBRART] Config cargada', {
    tieneUrl: Boolean(s?.url),
    tieneClave: Boolean(key),
    localPresente: Boolean(window.VIBRART_CONFIG_LOCAL),
  });
}

/** Clave pública efectiva (publishable o anon legacy) */
window.VIBRART_CONFIG.getSupabaseKey = function () {
  const s = window.VIBRART_CONFIG.supabase || {};
  return (s.publishableKey || s.anonKey || '').trim();
};
