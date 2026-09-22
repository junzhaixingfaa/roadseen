// 生成底栏“故障上报”图标，无第三方依赖。
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const size = 64;
const raw = Buffer.alloc((size * 4 + 1) * size);
const color = [154, 160, 166, 255];

function pixel(x, y) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const offset = y * (size * 4 + 1) + 1 + x * 4;
  raw[offset] = color[0]; raw[offset + 1] = color[1];
  raw[offset + 2] = color[2]; raw[offset + 3] = color[3];
}

for (let y = 0; y < size; y++) raw[y * (size * 4 + 1)] = 0;
for (let y = 5; y < 59; y++) {
  for (let x = 5; x < 59; x++) {
    const d = Math.sqrt((x - 32) ** 2 + (y - 32) ** 2);
    if (d >= 22 && d <= 27) pixel(x, y);
    if (x >= 29 && x <= 35 && y >= 17 && y <= 38) pixel(x, y);
    if ((x - 32) ** 2 + (y - 47) ** 2 <= 13) pixel(x, y);
  }
}

const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  table[n] = c >>> 0;
}
function crc(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0); name.copy(out, 4); data.copy(out, 8);
  out.writeUInt32BE(crc(Buffer.concat([name, data])), data.length + 8);
  return out;
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
]);
fs.writeFileSync(path.join(__dirname, '..', 'images', 'tab-report.png'), png);
