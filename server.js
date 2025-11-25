/* ============================================================
   IMPORTS
============================================================ */
const express = require("express");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const favicon = require("serve-favicon");
require("dotenv").config();

// node-fetch import in CommonJS
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

/* ============================================================
   SOCKET.IO (REAL-TIME)
============================================================ */
const app = express();
const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", socket => {
  console.log("🔌 Admin connected:", socket.id);
  socket.on("disconnect", () =>
    console.log("❌ Admin disconnected:", socket.id)
  );
});

/* ============================================================
   MIDDLEWARES
============================================================ */
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* ============================================================
   TEMP ORDER STORAGE
============================================================ */
let orders = [];

/* ============================================================
   DOWNLOAD LINK
============================================================ */
const DOWNLOAD_LINK =
  "https://drive.google.com/drive/folders/1dBLXditm2_urd8lD-sHA1XRAlvcY_L5S?usp=sharing";

/* ============================================================
   EMAIL TRANSPORTER
============================================================ */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/* ============================================================
   SEND WHATSAPP ALERT (FONNTE)
============================================================ */
async function sendWhatsApp(message) {
  try {
    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: process.env.WHATSAPP_TOKEN
      },
      body: new URLSearchParams({
        target: process.env.ADMIN_WHATSAPP,
        message: message
      })
    });

    console.log("📲 WhatsApp sent");
  } catch (err) {
    console.log("❌ WhatsApp error:", err);
  }
}

/* ============================================================
   SEND EMAIL ALERT TO ADMIN
============================================================ */
function sendAdminNotification(subject, message) {
  transporter.sendMail(
    {
      from: `"Azure Digital Store" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject,
      html: message
    },
    err => {
      if (err) console.log("Admin email error:", err);
      else console.log("📩 Admin email sent");
    }
  );
}

/* ============================================================
   FILE UPLOAD (SCREENSHOTS)
============================================================ */
const storage = multer.diskStorage({
  destination: "public/proofs",
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

/* ============================================================
   CREATE ORDER
============================================================ */
app.post("/api/create-order", (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email) {
    return res.json({
      success: false,
      message: "Name and Email required"
    });
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

  // REAL-TIME
  io.emit("order:created", newOrder);

  // EMAIL to Admin
  sendAdminNotification(
    "🆕 New Order Received",
    `
      <h2>New Order Alert</h2>
      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Phone:</b> ${phone || "N/A"}</p>
      <p><b>Order ID:</b> ${orderId}</p>
    `
  );

  // WHATSAPP to Admin
  sendWhatsApp(
    `🆕 *New Order Received*\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nOrder ID: ${orderId}`
  );

  res.json({ success: true, orderId });
});

/* ============================================================
   UPLOAD PAYMENT PROOF
============================================================ */
app.post("/api/upload-proof", upload.single("screenshot"), (req, res) => {
  const { orderId } = req.body;
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return res.json({ success: false, message: "Order not found" });
  }

  order.screenshot = "/proofs/" + req.file.filename;
  order.status = "payment_review";

  console.log("📸 Screenshot uploaded:", orderId);

  // REAL-TIME
  io.emit("order:updated", {
    id: orderId,
    status: "payment_review"
  });

  // EMAIL
  sendAdminNotification(
    "📸 Payment Screenshot Uploaded",
    `
      <h3>Payment Proof Uploaded</h3>
      <p><b>Order ID:</b> ${orderId}</p>
      <p><b>Name:</b> ${order.name}</p>
      <a href="https://yourdomain.com${order.screenshot}" target="_blank">View Screenshot</a>
    `
  );

  // WHATSAPP
  sendWhatsApp(
    `📸 *Payment Screenshot Uploaded*\nOrder ID: ${orderId}\nName: ${order.name}\nEmail: ${order.email}`
  );

  res.json({ success: true });
});

/* ============================================================
   ORDER STATUS FOR CUSTOMER
============================================================ */
app.get("/api/order-status/:orderId", (req, res) => {
  const order = orders.find(o => o.id === req.params.orderId);
  if (!order) return res.json({ success: false, status: "not_found" });

  res.json({ success: true, status: order.status });
});

/* ============================================================
   GET ALL ORDERS (ADMIN)
============================================================ */
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

/* ============================================================
   APPROVE ORDER
============================================================ */
app.post("/api/orders/:id/approve", async (req, res) => {
  const order = orders.find(o => o.id === req.params.id);

  if (!order)
    return res.json({ success: false, message: "Order not found" });

  order.status = "approved";

  // CUSTOMER EMAIL
  await transporter.sendMail({
    from: `"Azure Digital Store" <${process.env.STORE_EMAIL}>`,
    to: order.email,
    subject: "🎉 Payment Verified — Download Ready",
    html: `
      <h2>Hello ${order.name},</h2>
      <p>Your payment has been approved.</p>
      <p><b>Order ID:</b> ${order.id}</p>
      <a href="${DOWNLOAD_LINK}"
         style="padding:12px 16px;background:#00ffc6;color:#012;font-weight:bold;border-radius:8px;text-decoration:none;">
        ⬇ Download Product
      </a>
    `
  });

  // ADMIN EMAIL
  sendAdminNotification(
    "✔ Order Approved",
    `<p>Order <b>${order.id}</b> has been approved.</p>`
  );

  // WHATSAPP
  sendWhatsApp(
    `✔ *Order Approved*\nOrder ID: ${order.id}\nCustomer: ${order.name}`
  );

  // REAL-TIME
  io.emit("order:updated", {
    id: order.id,
    status: "approved"
  });

  res.json({ success: true });
});

/* ============================================================
   REJECT ORDER
============================================================ */
app.post("/api/orders/:id/reject", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);

  if (!order) return res.json({ success: false });

  order.status = "rejected";

  // ADMIN EMAIL
  sendAdminNotification(
    "❌ Order Rejected",
    `<p>Order <b>${order.id}</b> was rejected.</p>`
  );

  // WHATSAPP
  sendWhatsApp(
    `❌ *Order Rejected*\nOrder ID: ${order.id}\nCustomer: ${order.name}`
  );

  // REAL-TIME UPDATE
  io.emit("order:updated", {
    id: order.id,
    status: "rejected"
  });

  res.json({ success: true });
});

/* ============================================================
   START SERVER
============================================================ */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🔥 Real-time server running at http://localhost:${PORT}`)
);
