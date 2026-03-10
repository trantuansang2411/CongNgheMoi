const mongoose = require('mongoose');

const instructorApplicationSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, //user gửi đơn, index: admin dashboard thường filter theo userId hoặc check user đã nộp đơn chưa (và có thể gửi nhiều đơn do bị từ chối và ko có unique nên được)
    data: { //dữ liệu nộp đơn
        fullName: String, // tên khai trong đơn (có thể khác profile hiện tại) 
        headline: String, // tagline/giới thiệu ngắn
        experience: String, // kinh nghiệm
        expertise: [String], // danh sách chuyên môn
        idCardUrl: String, // ảnh thẻ CCCD/CMND
        cvUrl: String, // cv
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
