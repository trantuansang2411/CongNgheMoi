const mongoose = require('mongoose');

const instructorApplicationSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, //user gửi đơn, index: admin dashboard thường filter theo userId hoặc check user đã nộp đơn chưa (và có thể gửi nhiều đơn do bị từ chối và ko có unique nên được)
    data: { //dữ liệu nộp đơn
        fullName: { type: String, trim: true, required: true }, // họ tên đầy đủ
        birthDate: { type: Date, required: true }, // ngày sinh
        headline: { type: String, trim: true }, // tagline/giới thiệu ngắn
        experience: { type: String, trim: true, required: true }, // kinh nghiệm
        expertise: { type: String, trim: true, required: true }, // chuyên môn
        educationLevel: { type: String, trim: true, required: true }, // trình độ học vấn
        teachingTopics: { type: [String], default: [] }, // muốn dạy môn/chủ đề gì
        portfolioUrl: { type: String, trim: true, required: true }, // link portfolio/linkedin/github/website
        profileImageUrl: { type: String, default: null }, // ảnh profile/avatar của giảng viên khi apply
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'], //PENDING: chờ duyệt, APPROVED: đã duyệt, REJECTED: bị từ chối
        default: 'PENDING',
    },
    reviewerId: { type: String, default: null }, //id của admin đã duyệt
    reviewedAt: { type: Date, default: null }, //thời gian duyệt
}, {
    timestamps: true, //tự tạo createdAt, updatedAt.
    collection: 'instructor_applications', //tên bảng trong DB.
});

module.exports = mongoose.model('InstructorApplication', instructorApplicationSchema);
