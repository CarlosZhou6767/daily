/**
 * 图片压缩工具
 * 基于 Sharp 库实现图片压缩和缩略图生成
 * 自动转换为 WebP 格式以减小文件体积
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const config = require('../config');

/**
 * 压缩图片并生成缩略图
 * - 原图压缩为 WebP 格式（限制最大宽度）
 * - 生成 200px 宽的缩略图
 * - 非 WebP 格式的原图在上传后自动删除
 * @param {string} filePath - 原始图片文件路径
 * @returns {Promise<Object>} 包含 compressedPath, thumbPath, width, height 的对象
 * @throws {Error} 压缩失败时抛出错误，不再静默返回原文件
 */
async function compressImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const parsed = path.parse(filePath);
  const compressedPath = path.join(parsed.dir, `${parsed.name}_compressed.webp`);
  const thumbPath = path.join(parsed.dir, `${parsed.name}_thumb.webp`);

  try {
    // 读取图片元数据
    const metadata = await sharp(filePath).metadata();

    // 并行生成压缩版本和缩略图，提升处理速度
    const [compressedResult, thumbResult] = await Promise.all([
      // 生成压缩版本（限制最大宽度，转为 WebP）
      sharp(filePath)
        .resize({ width: config.imageMaxWidth, withoutEnlargement: true })
        .webp({ quality: config.imageQuality })
        .toFile(compressedPath),
      // 生成缩略图（200px 宽）
      sharp(filePath)
        .resize({ width: 200, withoutEnlargement: true })
        .webp({ quality: 70 })
        .toFile(thumbPath),
    ]);

    // 删除非 WebP 格式的原始文件，节省磁盘空间
    if (ext !== '.webp' && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      compressedPath,
      thumbPath,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (err) {
    console.error('Image compress error:', err.message);

    // 清理已生成的临时文件
    [compressedPath, thumbPath].forEach((p) => {
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (cleanupErr) {
          // 忽略清理错误
        }
      }
    });

    // 抛出错误，让调用方处理失败情况
    throw new Error('图片压缩失败: ' + err.message);
  }
}

module.exports = { compressImage };
