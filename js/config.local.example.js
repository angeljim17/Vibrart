/**
 * Copia este archivo como config.local.js y rellena tus datos de Supabase.
 * config.local.js NO se sube a Git (está en .gitignore).
 *
 *   cp js/config.local.example.js js/config.local.js
 *
 * index.html carga config.local.js ANTES que config.js (obligatorio).
 *
 * En Supabase: Project Settings → API (o API Keys)
 */
window.VIBRART_CONFIG_LOCAL = {
  supabase: {
    /** API URL — solo el dominio, SIN /rest/v1/ al final */
    url: 'https://TU-PROYECTO.supabase.co',

    /**
     * Publishable key (sb_publishable_...) — NO uses Secret key aquí
     */
    publishableKey: 'sb_publishable_TU_CLAVE_AQUI',
    // anonKey: 'eyJ...',  // alternativa legacy, solo una de las dos
  },
};
