const mongoose = require('mongoose');

const instructorProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true }, //// UUID from Auth hay còn gọi là khoá ngoại của bảng instructor_profiles, khoá chính là của bảng accounts trong auth-service (đảm bảo việc 1 tài khoản chỉ có 1 hồ sơ instructor)
    displayName: { type: String, required: true }, //tên hiển thị của giảng viên (có thể khác fullName).
    headline: { type: String, default: '' }, //tagline/giới thiệu ngắn
    payoutInfo: { //thông tin nhận tiền:
        bankName: String, //tên ngân hàng
        accountNumber: String, //số tài khoản
        accountHolder: String, //tên chủ tài khoản
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'BANNED'], //ACTIVE: được phép hoạt động giảng viên, BANNED: vẫn login bình thường (nếu Account.status ACTIVE) nhưng bị cấm dạy
        default: 'ACTIVE',
    },
}, {
    timestamps: true, //tự tạo createdAt, updatedAt.
    collection: 'instructor_profiles', //tên bảng trong DB.
});

module.exports = mongoose.model('InstructorProfile', instructorProfileSchema);
