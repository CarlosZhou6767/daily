/**
 * 文件上传路由 - 图片上传、压缩、安全校验与入库
 * 基础路径: /api/upload
 * 需要登录认证
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateFileContent: validateFileContentMiddleware } = require('../middleware/upload');
const { compressImage } = require('../utils/imageCompress');
const { getDb } = require('../db');
const { success, fail } = require('../utils/responseHelper');

// 允许的文件扩展名白名单，仅允许常见图片格式
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const DANGEROUS_EXTENSIONS = [
  '.php', '.php5', '.php7', '.phtml', '.pht',
  '.jsp', '.jspx', '.jspa', '.jsw', '.jsv',
  '.asp', '.aspx', '.asa', '.asax', '.ascx',
  '.exe', '.dll', '.bat', '.cmd', '.com', '.scr',
  '.sh', '.bash', '.zsh', '.fish',
  '.py', '.rb', '.pl', '.cgi',
  '.htaccess', '.htpasswd',
  '.svg', '.xml',
  '.html', '.htm', '.js', '.mjs',
  '.sql', '.db', '.sqlite',
];

/**
 * 验证文件路径安全性
 * 防止路径遍历攻击（Path Traversal），确保文件始终在 uploads 目录内
 * @param {string} filePath - 要检查的文件路径
 * @param {string} baseDir  - 允许的基础目录（uploads）
 * @returns {boolean} 文件路径是否在基础目录范围之内
 */
function isPathSafe(filePath, baseDir) {
  // 解析绝对路径，消除 ../ 等路径遍历符号
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);
  return resolvedPath.startsWith(resolvedBase + path.sep) || resolvedPath === resolvedBase;
}

/**
 * 上传图片 - 单文件上传（字段名 image）
 * POST /api/upload
 * 权限：登录用户
 * 请求体：multipart/form-data
 *   image - 图片文件（必填）
 *   type  - 关联类型（可选，如 checkin/avatar，默认为 checkin）
 * 处理流程：
 *   1. 验证文件存在和扩展名白名单
 *   2. 路径安全性检查（防路径遍历攻击）
 *   3. 文件内容 Magic Number 校验（防伪造文件）
 *   4. 图片压缩并生成缩略图
 *   5. 记录图片信息到数据库
 * 返回：{ path, width, height } 图片相对路径及尺寸
 */
router.post('/', auth, upload.single('image'), validateFileContentMiddleware, async (req, res, next) => {
  try {
    if (!req.file) {
      return fail(res, 400, '请选择图片');
    }

    // 验证文件扩展名是否在白名单内，防止上传可执行文件等危险类型
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return fail(res, 400, '不支持的文件类型');
    }

    const lowerName = req.file.originalname.toLowerCase();
    if (DANGEROUS_EXTENSIONS.some(d => lowerName.includes(d))) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return fail(res, 400, '检测到危险文件类型');
    }

    const nameWithoutExt = lowerName.slice(0, lowerName.length - ext.length);
    if (DANGEROUS_EXTENSIONS.some(d => nameWithoutExt.endsWith(d))) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return fail(res, 400, '检测到危险文件类型');
    }

    // 验证文件路径安全性，防止路径遍历攻击将文件写至 uploads 目录外
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!isPathSafe(req.file.path, uploadDir)) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return fail(res, 400, '非法文件路径');
    }

    // 压缩图片并生成缩略图，减少存储空间和传输带宽
    const compressed = await compressImage(req.file.path);

    // 验证压缩后的路径安全性
    if (!isPathSafe(compressed.compressedPath, uploadDir)) {
      return fail(res, 500, '文件处理异常');
    }

    // 计算相对路径用于存储和返回，统一使用正斜杠
    const relativePath = path.relative(path.join(__dirname, '../../'), compressed.compressedPath).replace(/\\/g, '/');

    // 记录图片信息到数据库，关联当前用户
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
    // 异常情况下清理已上传的文件，防止磁盘残留
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        // 忽略清理过程中可能出现的错误，避免覆盖原始异常
      }
    }
    next(err);
  }
});

module.exports = router;