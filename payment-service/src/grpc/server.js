const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const paymentService = require('../services/payment.service');
const logger = require('../../shared/utils/logger');

const PROTO_PATH = path.join(__dirname, '../../proto/payment.proto');

function startGrpcServer(port) {
    const pd = protoLoader.loadSync(PROTO_PATH, { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true });
    const proto = grpc.loadPackageDefinition(pd).payment;

    const server = new grpc.Server();

    server.addService(proto.PaymentService.service, {
        createPaymentIntent: async (call, callback) => {
            try {
                const { type, studentId, orderId, amount, currency, provider, idempotencyKey } = call.request;
                const intent = await paymentService.createPaymentIntent({
                    type, studentId, orderId, amount: Number(amount), currency, provider, idempotencyKey,
                });
                callback(null, {
                    paymentIntentId: intent.id,
                    status: intent.status,
                    providerIntentId: intent.providerIntentId || '',
                    checkoutUrl: intent.checkoutUrl || '',
                });
            } catch (err) {
                logger.error('gRPC createPaymentIntent error:', err.message);
                callback({ code: grpc.status.INTERNAL, message: err.message });
            }
        },
        getPaymentStatus: async (call, callback) => {
            try {
                const intent = await paymentService.getPaymentStatus(call.request.paymentIntentId);
                callback(null, {
                    paymentIntentId: intent.id,
                    status: intent.status,
                    amount: Number(intent.amount),
                    orderId: intent.orderId || '',
                });
            } catch (err) {
                logger.error('gRPC getPaymentStatus error:', err.message);
                callback({ code: grpc.status.NOT_FOUND, message: err.message });
            }
        },
    });

    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
        if (err) { logger.error('Payment gRPC server failed:', err.message); return; }
        logger.info(`Payment gRPC server running on port ${port}`);
    });
}

module.exports = { startGrpcServer };
