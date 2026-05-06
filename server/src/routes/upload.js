/**
 * 文件上传路由 - 图片上传与压缩
 * 基础路径: /api/upload
 * 需要登录认证
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { compressImage } = require('../utils/imageCompress');
const { validateFileContent } = require('../utils/fileValidator');
const { getDb } = require('../db');
const { success, fail } = require('../utils/responseHelper');

// 允许的文件扩展名白名单
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * 验证文件路径安全性
 * 防止路径遍历攻击，确保文件在 uploads 目录内
 * @param {string} filePath - 文件路径
 * @param {string} baseDir - 基础目录
 * @returns {boolean} 是否安全
 */
function isPathSafe(filePath, baseDir) {
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);
  return resolvedPath.startsWith(resolvedBase);
}

// 上传图片（单文件，字段名 image）
router.post('/', auth, upload.single('image'), (req, res, next) => {
  try {
    if (!req.file) {
      return fail(res, 400, '请选择图片');
    }

    // 验证文件扩展名
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      // 删除非法文件
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return fail(res, 400, '不支持的文件类型');
    }

    // 验证文件路径安全性，防止路径遍历
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!isPathSafe(req.file.path, uploadDir)) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return fail(res, 400, '非法文件路径');
    }

    // 验证文件 Magic Number，确保是真实图片
    const contentValidation = validateFileContent(req.file.path);
    if (!contentValidation.valid) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return fail(res, 400, '文件内容验证失败');
    }

    // 压缩图片并生成缩略图
    const compressed = compressImage(req.file.path);

    // 验证压缩后的路径安全性
    if (!isPathSafe(compressed.compressedPath, uploadDir)) {
      return fail(res, 500, '文件处理异常');
    }

    const relativePath = path.relative(path.join(__dirname, '../../'), compressed.compressedPath).replace(/\\/g, '/');

    // 记录图片信息到数据库
    const db = getDb();
    db.prepare(
      'INSERT INTO images (user_id, file_path, original_name, file_size, width, height, related_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.userId, relativePath, req.file.originalname, req.file.size, compressed.width, compressed.height, req.body.type || 'checkin');

    success(res, {
      path: '/' + relativePath,
      width: compressed.width,
      height: compressed.height,
    }, '上传成功');
  } catch (err) {
    // 清理上传的文件，防止残留
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        // 忽略清理错误
      }
    }
    next(err);
  }
});

module.exports = router;
