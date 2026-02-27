const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true }, // UUID from Auth hay còn gọi là khoá ngoại của bảng user, khoá chính là của bảng accounts trong auth-service (đảm bảo việc 1 tài khoản chỉ có 1 hồ sơ user)
    fullName: { type: String, default: '' }, // tên hiển thị chung.
    avatarUrl: { type: String, default: '' }, // URL ảnh đại diện.
    phone: { type: String, default: '' }, // số điện thoại.
    bio: { type: String, default: '' }, // giới thiệu bản thân.
}, {
    timestamps: true, //tự tạo createdAt, updatedAt.
    collection: 'user_profiles', //tên bảng trong DB.
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
