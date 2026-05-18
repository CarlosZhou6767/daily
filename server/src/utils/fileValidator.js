/**
 * 文件内容真实性校验工具
 * 通过读取文件头部魔数（magic bytes）验证文件格式，防止扩展名伪装攻击
 * 例如：用户将 .exe 改名为 .jpg 后上传，本模块可识别并拒绝
 */
const fs = require('fs');

/**
 * 常见图片格式的魔数（文件头标识字节）
 * 格式：{格式名: { hex: 十六进制魔数字符串, type: 标准类型名 }}
 */
const MAGIC_NUMBERS = {
  jpeg: { hex: 'FFD8FF', type: 'jpeg' },
  png: { hex: '89504E47', type: 'png' },
  gif: { hex: '47494638', type: 'gif' },
  webp: { hex: '52494646', type: 'webp' },
};

/**
 * 将 Buffer 前 N 个字节转换为十六进制字符串
 * @param {Buffer} buffer - 文件内容缓冲区
 * @param {number} length - 读取的字节数
 * @returns {string} 大写的十六进制字符串
 */
function bytesToHex(buffer, length) {
  return buffer.slice(0, length).toString('hex').toUpperCase();
}

/**
 * 校验文件真实类型（基于文件头魔数，非扩展名）
 * 读取文件前8字节，与已知图片格式的魔数比对，判断是否为合法图片文件
 * @param {string} filePath - 待校验文件的绝对路径
 * @returns {{valid: boolean, type: string|null}} 校验结果：valid为true表示合法图片，type返回具体格式
 */
function validateFileContent(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(12);
    fs.readSync(fd, buffer, 0, 12, 0);

    const hex = bytesToHex(buffer, 12);

    if (hex.startsWith(MAGIC_NUMBERS.jpeg.hex)) {
      return { valid: true, type: 'jpeg' };
    }
    if (hex.startsWith(MAGIC_NUMBERS.png.hex)) {
      return { valid: true, type: 'png' };
    }
    if (hex.startsWith(MAGIC_NUMBERS.gif.hex)) {
      return { valid: true, type: 'gif' };
    }
    if (hex.startsWith(MAGIC_NUMBERS.webp.hex) && hex.substring(8, 12) === '57454250') {
      return { valid: true, type: 'webp' };
    }

    return { valid: false, type: null };
  } catch (err) {
    return { valid: false, type: null };
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }
}

module.exports = {
  validateFileContent,
};
