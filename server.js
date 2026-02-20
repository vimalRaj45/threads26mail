import Fastify from "fastify";
import nodemailer from "nodemailer";

const fastify = Fastify({ logger: true });

// ---------------- OTP STORE (memory) ----------------
const otpStore = new Map(); 
// email -> { otp, expiresAt }

// ---------------- OTP GENERATOR ----------------
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

// ---------------- MAIL TRANSPORTER ----------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "vimalraj5207@gmail.com",     // sender
    pass: "txcmjdwgbprjaxrg",            // 16-char app password (NO SPACES)
  },
});

// ---------------- SEND OTP API ----------------
fastify.post("/send-otp", async (req, reply) => {
  const { email } = req.body;
  if (!email) {
    return reply.code(400).send({ error: "Email required" });
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(email, { otp, expiresAt });

  await transporter.sendMail({
    from: `"VSGRPS OTP" <vimalraj5207@gmail.com>`,
    to: email,
    subject: "OTP Verification",
    html: `
      <h2>Your OTP: ${otp}</h2>
      <p>This OTP is valid for <b>5 minutes</b>.</p>
    `,
  });

  return { success: true, message: "OTP sent" };
});

// ---------------- VERIFY OTP API ----------------
fastify.post("/verify-otp", async (req, reply) => {
  const { email, otp } = req.body;

  const record = otpStore.get(email);
  if (!record) {
    return reply.code(400).send({ error: "OTP not found" });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return reply.code(400).send({ error: "OTP expired" });
  }

  if (record.otp !== Number(otp)) {
    return reply.code(400).send({ error: "Invalid OTP" });
  }

  otpStore.delete(email);
  return { success: true, message: "OTP verified successfully" };
});

// ---------------- HTML PAGE ----------------
fastify.get("/", async (req, reply) => {
  reply.type("text/html").send(`
<!DOCTYPE html>
<html>
<head>
  <title>OTP Verification</title>
  <style>
    body { font-family: Arial; max-width: 400px; margin: 50px auto; }
    input, button { width: 100%; padding: 10px; margin: 8px 0; }
    button { cursor: pointer; }
  </style>
</head>
<body>

  <h2>Send OTP</h2>
  <input id="email" placeholder="Enter email" />
  <button onclick="sendOTP()">Send OTP</button>

  <h2>Verify OTP</h2>
  <input id="otp" placeholder="Enter OTP" />
  <button onclick="verifyOTP()">Verify OTP</button>

  <p id="msg"></p>

<script>
async function sendOTP() {
  const email = document.getElementById("email").value;
  const res = await fetch("/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  document.getElementById("msg").innerText = await res.text();
}

async function verifyOTP() {
  const email = document.getElementById("email").value;
  const otp = document.getElementById("otp").value;
  const res = await fetch("/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp })
  });
  document.getElementById("msg").innerText = await res.text();
}
</script>

</body>
</html>
  `);
});


// ---------------- START SERVER (RENDER) ----------------
const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: "0.0.0.0" });
