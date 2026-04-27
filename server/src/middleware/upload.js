/**
 * 文件上传中间件
 * 基于 Multer 实现，支持图片上传、文件类型过滤、大小限制
 * 上传目录按年/月自动分目录存储，文件名使用时间戳+随机字符串防冲突
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// 自定义存储策略
const storage = multer.diskStorage({
  // 按年/月创建子目录，避免单目录文件过多
  destination: (req, file, cb) => {
    const now = new Date();
    const subDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const uploadPath = path.join(config.uploadDir, subDir);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  // 文件命名：时间戳 + 随机字符串 + 原始扩展名
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.uploadMaxSize },
  // 只允许图片格式文件
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 jpg/png/gif/webp 格式图片'));
    }
  },
});

module.exports = upload;
