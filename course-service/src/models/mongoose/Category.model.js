const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
    categoryId: { type: String, default: () => uuidv4(), unique: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: '' },
    iconUrl: { type: String, default: '' },
    orderIndex: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
}, {
    timestamps: true,
    collection: 'categories',
});

categorySchema.pre('validate', function (next) {
    if (!this.slug && this.name) {
        this.slug = slugify(this.name, { lower: true, strict: true });
    }
    next();
});

categorySchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
