const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    courseId: { type: String, required: true, index: true },
    code: { type: String, required: true },
    discountType: { type: String, enum: ['PERCENT', 'AMOUNT'], required: true },
    discountValue: { type: Number, required: true },
    startAt: { type: Date, default: Date.now },
    endAt: { type: Date, required: true },
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, {
    timestamps: true,
    collection: 'coupons',
});

couponSchema.index({ courseId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Coupon', couponSchema);
