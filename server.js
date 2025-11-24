const favicon = require('serve-favicon');
const path = require('path');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

const express = require("express");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve public folder (frontend)
app.use(express.static(path.join(__dirname, "public")));

// --------------------- ORDER MEMORY STORAGE ---------------------
let orders = [];

// --------------------- MASTER DOWNLOAD LINK ---------------------
const DOWNLOAD_LINK = "https://drive.google.com/drive/folders/1dBLXditm2_urd8lD-sHA1XRAlvcY_L5S?usp=sharing";

// --------------------- EMAIL TRANSPORTER ---------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// --------------------- FILE UPLOAD CONFIG ---------------------
const storage = multer.diskStorage({
  destination: "public/proofs",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// --------------------- API: CREATE ORDER ---------------------
app.post("/api/create-order", (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email) {
    return res.json({ success: false, message: "Name and Email required" });
  }

  const orderId = "ORD" + Math.floor(100000 + Math.random() * 900000);

  const newOrder = {
    id: orderId,
    name,
    email,
    phone,
    status: "pending",
    screenshot: null,
    createdAt: new Date()
  };

  orders.push(newOrder);

  console.log("🛒 NEW ORDER:", newOrder);
  res.json({ success: true, orderId });
});

// --------------------- API: UPLOAD PAYMENT SCREENSHOT ---------------------
app.post("/api/upload-proof", upload.single("screenshot"), (req, res) => {
  const { orderId } = req.body;
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return res.json({ success: false, message: "Order not found" });
  }

  order.screenshot = "/proofs/" + req.file.filename;
  order.status = "payment_review";

  console.log("📸 Screenshot received for:", orderId);

  return res.json({ success: true, autoApproved: false });
});

// --------------------- API: POLLING ORDER STATUS ---------------------
app.get("/api/order-status/:orderId", (req, res) => {
  const order = orders.find(o => o.id === req.params.orderId);

  if (!order) return res.json({ success: false, status: "not_found" });

  res.json({ success: true, status: order.status });
});

// --------------------- ADMIN ROUTES ---------------------

// Get all orders
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

// Approve order
app.post("/api/orders/:id/approve", async (req, res) => {
  const order = orders.find(o => o.id === req.params.id);

  if (!order) return res.json({ success: false, message: "Order not found" });

  order.status = "approved";

  await transporter.sendMail({
    from: `"Azure Digital Store" <${process.env.STORE_EMAIL}>`,
    to: order.email,
    subject: "🎉 Payment Verified — Download Ready",
    html: `
      <h2>Hello ${order.name},</h2>
      <p>Your payment has been approved.</p>
      <p><b>Order ID:</b> ${order.id}</p>
      <br>
      <a href="${DOWNLOAD_LINK}" style="background:#00ffc6;padding:12px 16px;color:#012620;border-radius:10px;text-decoration:none;font-weight:bold;">
      ⬇ Download Product</a>
      <br><br>
      <small>If you need help, reply to this message.</small>
    `
  });

  res.json({ success: true });
});

// Reject order
app.post("/api/orders/:id/reject", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.json({ success: false });

  order.status = "rejected";
  res.json({ success: true });
});

// --------------------- START SERVER ---------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Server running at http://localhost:${PORT}`));

