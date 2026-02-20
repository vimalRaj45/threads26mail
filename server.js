import Fastify from "fastify";
import nodemailer from "nodemailer";

const fastify = Fastify({ logger: true });

const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

fastify.post("/send-otp", async (req, reply) => {
  const { email } = req.body;

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(email, { otp, expiresAt });

  await transporter.sendMail({
    from: `"VSGRPS OTP" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "OTP Verification",
    html: `<h2>Your OTP: ${otp}</h2>`,
  });

  return { success: true };
});

fastify.post("/verify-otp", async (req, reply) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record) return reply.code(400).send({ error: "OTP not found" });
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return reply.code(400).send({ error: "OTP expired" });
  }
  if (record.otp !== Number(otp)) {
    return reply.code(400).send({ error: "Invalid OTP" });
  }

  otpStore.delete(email);
  return { success: true };
});

fastify.get("/", async (_, reply) => {
  reply.type("text/html").send("<h2>OTP Service Running</h2>");
});

// 🔴 IMPORTANT FOR RENDER
const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: "0.0.0.0" });
