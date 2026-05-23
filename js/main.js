/** Punto de entrada */
document.addEventListener('DOMContentLoaded', async () => {
  const supaReady = window.VibrartSupabase?.init();
  if (window.VIBRART_CONFIG?.debugUpload) {
    const cfg = window.VIBRART_CONFIG.supabase || {};
    const key = window.VIBRART_CONFIG.getSupabaseKey?.() || '';
    console.log('[VIBRART] Inicio', {
      protocol: location.protocol,
      origin: location.origin,
      supabaseReady: supaReady,
      supabaseUrl: cfg.url || '(vacío)',
      keyPreview: key ? `${key.slice(0, 18)}…${key.slice(-4)}` : '(vacío)',
      bucket: cfg.bucket || 'vibrart-album',
    });
  }

  try {
    await window.VibrartRouter.loadScreens();
  } catch (err) {
    console.error(err);
    document.getElementById('app').innerHTML =
      '<p style="padding:2rem;color:#fff;text-align:center">Error al cargar las pantallas. Usa un servidor local (ej. <code>npx serve .</code>).</p>';
  }
});
