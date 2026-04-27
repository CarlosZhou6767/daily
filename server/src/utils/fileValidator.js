const fs = require('fs');

const MAGIC_NUMBERS = {
  jpeg: { hex: 'FFD8FF', type: 'jpeg' },
  png: { hex: '89504E47', type: 'png' },
  gif: { hex: '47494638', type: 'gif' },
  webp: { hex: '52494646', type: 'webp' },
};

function bytesToHex(buffer, length) {
  return buffer.slice(0, length).toString('hex').toUpperCase();
}

function validateFileContent(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    const hex = bytesToHex(buffer, 8);

    if (hex.startsWith(MAGIC_NUMBERS.jpeg.hex)) {
      return { valid: true, type: 'jpeg' };
    }
    if (hex.startsWith(MAGIC_NUMBERS.png.hex)) {
      return { valid: true, type: 'png' };
    }
    if (hex.startsWith(MAGIC_NUMBERS.gif.hex)) {
      return { valid: true, type: 'gif' };
    }
    if (hex.startsWith(MAGIC_NUMBERS.webp.hex)) {
      return { valid: true, type: 'webp' };
    }

    return { valid: false, type: null };
  } catch (err) {
    return { valid: false, type: null };
  }
}

module.exports = {
  validateFileContent,
};
