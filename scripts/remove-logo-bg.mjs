import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logoPath = path.join(__dirname, '../assets/LOGO DE VIBRART.png');

const img = await Jimp.read(logoPath);

img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
  const r = this.bitmap.data[idx];
  const g = this.bitmap.data[idx + 1];
  const b = this.bitmap.data[idx + 2];

  // Fondo blanco → transparente
  if (r > 235 && g > 235 && b > 235) {
    this.bitmap.data[idx + 3] = 0;
    return;
  }

  // Texto azul oscuro → blanco (legible sobre fondo negro)
  this.bitmap.data[idx] = 255;
  this.bitmap.data[idx + 1] = 255;
  this.bitmap.data[idx + 2] = 255;
  this.bitmap.data[idx + 3] = 255;
});

await img.write(logoPath);
console.log('Logo actualizado:', logoPath);
