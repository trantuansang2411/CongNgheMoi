const nodemailer = require('nodemailer');
const logger = require('../../shared/utils/logger');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'trantuansang2411@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'zazj tfic vnpz guly';
const SMTP_FROM = process.env.SMTP_FROM || `"EduPlatform" <${SMTP_USER}>`;

let transporter = null;

function getTransporter() {
    if (!transporter) {
        if (!SMTP_USER || !SMTP_PASS) {
            logger.warn('SMTP credentials not configured. Emails will be logged to console only.');
            return null;
        }
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });
    }
    return transporter;
}

async function sendOtpEmail(toEmail, otpCode) {
    const subject = 'Xác thực tài khoản - Mã OTP';
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8f9fa; border-radius: 12px;">
            <h2 style="color: #1a1a2e; margin-bottom: 8px;">Xác thực tài khoản</h2>
            <p style="color: #555; font-size: 14px;">Mã OTP của bạn là:</p>
            <div style="background: #1a1a2e; color: #fff; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px 24px; border-radius: 8px; margin: 16px 0;">
                ${otpCode}
            </div>
            <p style="color: #888; font-size: 13px;">Mã OTP có hiệu lực trong <strong>${process.env.OTP_EXPIRES_MINUTES || 5} phút</strong>.</p>
            <p style="color: #888; font-size: 13px;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
            <p style="color: #aaa; font-size: 11px; text-align: center;">EduPlatform &copy; ${new Date().getFullYear()}</p>
        </div>
    `;

    const transport = getTransporter();

    if (!transport) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('SMTP_NOT_CONFIGURED');
        }

        // Fallback: log OTP to console in non-production mode
        logger.info(`[DEV] OTP for ${toEmail}: ${otpCode}`);
        return { accepted: [toEmail], messageId: 'dev-mode' };
    }

    try {
        const info = await transport.sendMail({
            from: SMTP_FROM,
            to: toEmail,
            subject,
            html,
        });
        logger.info(`OTP email sent to ${toEmail}, messageId: ${info.messageId}`);
        return info;
    } catch (err) {
        logger.error(`Failed to send OTP email to ${toEmail}: ${err.message}`);
        // Fallback: log OTP so dev can still test
        logger.info(`[FALLBACK] OTP for ${toEmail}: ${otpCode}`);
        throw err;
    }
}

module.exports = { sendOtpEmail };
