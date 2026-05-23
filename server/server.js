/**
 * API de ejemplo para subida real de fotos VIBRART.
 * Ejecutar: cd server && npm install && npm start
 */
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'));
    }
    cb(null, true);
  },
});

const app = express();
app.use(cors());
app.use('/uploads', express.static(UPLOAD_DIR));

function handleUpload(albumId) {
  return (req, res) => {
    try {
      const files = req.files || [];
      let descriptions = [];
      try {
        descriptions = JSON.parse(req.body.descriptions || '[]');
      } catch {
        descriptions = [];
      }

      if (!files.length) {
        return res.status(400).json({ error: 'No se recibieron fotos' });
      }

      const urls = files.map((f) => `/uploads/${f.filename}`);

      console.log(`[${albumId}] ${files.length} foto(s) recibida(s)`);
      files.forEach((f, i) => {
        console.log(`  - ${f.filename} | ${descriptions[i] || '(sin descripción)'}`);
      });

      res.json({
        ok: true,
        message: `${files.length} foto(s) subida(s) a ${albumId}`,
        album: albumId,
        urls,
        count: files.length,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Error del servidor' });
    }
  };
}

app.post(
  '/api/upload/vibrart-2026',
  upload.array('photos', 20),
  handleUpload('vibrart-2026')
);

app.post(
  '/api/upload/souvenirs',
  upload.array('photos', 20),
  handleUpload('souvenirs')
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'vibrart-upload-api' });
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`VIBRART upload API → http://localhost:${PORT}`);
  console.log(`  POST /api/upload/vibrart-2026`);
  console.log(`  POST /api/upload/souvenirs`);
});
