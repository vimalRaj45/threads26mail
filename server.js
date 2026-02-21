import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const fastify = Fastify({ logger: true });

/* -------------------- CORS -------------------- */
await fastify.register(cors, {
  origin: true
});

/* -------------------- OTP Generator -------------------- */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

/* -------------------- Send OTP Email -------------------- */
async function sendOTPEmail(toEmail, toName, otp) {
  const response = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        email: process.env.SENDER_EMAIL,
        name: process.env.SENDER_NAME
      },
      to: [{ email: toEmail, name: toName }],
      subject: 'Your OTP - Symposium Registration',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 500px;
          margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
          
          <h2 style="color:#4F46E5;text-align:center;">Email Verification</h2>
          
          <p>Hello <strong>${toName}</strong>,</p>
          <p>Your OTP for Symposium Registration is:</p>
          
          <div style="text-align:center;margin:30px 0;padding:20px;
            background:#f5f5f5;border-radius:8px;">
            <span style="font-size:40px;font-weight:bold;
              color:#4F46E5;letter-spacing:12px;">${otp}</span>
          </div>
          
          <p>⏰ Valid for <strong>5 minutes only.</strong></p>
          <p>If you didn't request this, ignore this email.</p>
        </div>
      `
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );

  return response.data;
}

/* -------------------- API ROUTE -------------------- */
fastify.post('/send-otp', async (request, reply) => {
  try {
    const { email, name } = request.body;

    if (!email || !name) {
      return reply.code(400).send({
        success: false,
        message: 'Email and Name are required'
      });
    }

    const otp = generateOTP();

    await sendOTPEmail(email, name, otp);

    return reply.send({
      success: true,
      message: 'OTP sent successfully',
      otp // ⚠️ remove in production
    });

  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

/* -------------------- SERVER START -------------------- */
const PORT = process.env.PORT || 3000;

fastify.listen({ port: PORT, host: '0.0.0.0' }, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
