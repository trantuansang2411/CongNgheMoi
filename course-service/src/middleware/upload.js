const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Tạo thư mục nếu chưa có
['videos', 'resources', 'thumbnails'].forEach((sub) => {
    const dir = path.join(UPLOAD_DIR, sub);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

function createUpload(subfolder, allowedRegex, maxSize) {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path.join(UPLOAD_DIR, subfolder));
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase() || '';
            const userId = req.user?.id || 'unknown';
            const name = `${userId}_${randomUUID()}${ext}`;
            cb(null, name);
        },
    });

    return multer({
        storage,
        limits: { fileSize: maxSize },
        fileFilter: (req, file, cb) => {
            const extOk = allowedRegex.test(path.extname(file.originalname).toLowerCase().replace('.', ''));
            const mimeOk = allowedRegex.test(file.mimetype.split('/')[1] || '');
            if (extOk || mimeOk) {
                cb(null, true);
            } else {
                cb(new Error(`Định dạng file không được hỗ trợ.`));
            }
        },
    });
}

const uploadVideo = createUpload('videos', /mp4|webm|mov|avi|mkv/, 500 * 1024 * 1024);
const uploadResource = createUpload('resources', /pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|png|jpg|jpeg|gif/, 50 * 1024 * 1024);
const uploadThumbnail = createUpload('thumbnails', /jpg|jpeg|png|webp/, 10 * 1024 * 1024);

module.exports = { uploadVideo, uploadResource, uploadThumbnail, UPLOAD_DIR };
