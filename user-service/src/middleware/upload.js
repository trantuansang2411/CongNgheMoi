const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Tạo thư mục nếu chưa có
['avatars/users', 'avatars/instructors', 'instructor-applications'].forEach((sub) => {
    const dir = path.join(UPLOAD_DIR, sub);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

function createUpload(subfolder) {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(UPLOAD_DIR, subfolder);
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname) || '.jpg';
            const name = `${req.user.id}_${randomUUID()}${ext}`;
            cb(null, name);
        },
    });

    return multer({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
        fileFilter: (req, file, cb) => {
            const allowed = /jpeg|jpg|png|gif|webp/;
            const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
            const mimeOk = allowed.test(file.mimetype);
            if (extOk && mimeOk) {
                cb(null, true);
            } else {
                cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp).'));
            }
        },
    });
}

const uploadUserAvatar = createUpload('avatars/users');
const uploadInstructorAvatar = createUpload('avatars/instructors');
const uploadInstructorApplicationPhoto = createUpload('instructor-applications');

module.exports = { uploadUserAvatar, uploadInstructorAvatar, uploadInstructorApplicationPhoto, UPLOAD_DIR };
