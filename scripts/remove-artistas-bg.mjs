import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '../assets/artistas.png');

const img = await Jimp.read(file);
img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
  const r = this.bitmap.data[idx];
  const g = this.bitmap.data[idx + 1];
  const b = this.bitmap.data[idx + 2];
  if (r > 238 && g > 238 && b > 238) {
    this.bitmap.data[idx + 3] = 0;
  }
});
await img.write(file);
console.log('Fondo blanco eliminado:', file);
