const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

// ========== CART ==========
async function getCart(studentId) {
    let cart = await prisma.cart.findUnique({ where: { studentId }, include: { items: true } });
    if (!cart) cart = await prisma.cart.create({ data: { id: uuidv4(), studentId }, include: { items: true } });
    return cart;
}

async function addToCart(studentId, item) {
    const cart = await getCart(studentId);
    return prisma.cartItem.upsert({
        where: { cartId_courseId: { cartId: cart.id, courseId: item.courseId } },
        create: { id: uuidv4(),
            cart: { connect: { id: cart.id } },
            courseId: item.courseId,
            titleSnapshot: item.titleSnapshot,
            priceSnapshot: item.priceSnapshot,
            instructorId: item.instructorId
        },
        update: { priceSnapshot: item.priceSnapshot, titleSnapshot: item.titleSnapshot },
    });
}

async function removeFromCart(studentId, courseId) {
    const cart = await getCart(studentId);
    return prisma.cartItem.deleteMany({ where: { cartId: cart.id, courseId } });
}

async function clearCart(studentId) {
    const cart = await prisma.cart.findUnique({ where: { studentId } });
    if (!cart) return;
    return prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

// ========== ORDER ==========
async function createOrder(data) {
    return prisma.order.create({ data: { id: uuidv4(), ...data, items: { create: data.items.map(i => ({ id: uuidv4(), ...i })) } }, include: { items: true } });
}

async function findOrderById(id) {
    return prisma.order.findUnique({ where: { id }, include: { items: true } });
}

async function findOrdersByStudent(studentId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
        prisma.order.findMany({ where: { studentId }, include: { items: true }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.order.count({ where: { studentId } }),
    ]);
    return { items, total, page, limit };
}

async function updateOrderStatus(id, status, extra = {}) {
    return prisma.order.update({ where: { id }, data: { status, ...extra }, include: { items: true } });
}

module.exports = {
    prisma, getCart, addToCart, removeFromCart, clearCart,
    createOrder, findOrderById, findOrdersByStudent, updateOrderStatus,
};
