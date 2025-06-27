import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER, // ✅ Ensure environment variable is set
    pass: process.env.SMTP_PASS,
  },
});
transporter.verify((error) => {
  if (error) {
    console.log("❌ SMTP Transport Error:", error);
  } else {
    console.log("✅ Server is ready to send emails.");
  }
});

// === Create Appointment Order ===
export const createAppointmentOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `appointment_${Date.now()}`,
      payment_capture: 1,
    });

    console.log("📅 Created Appointment Order:", order);
    res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error("❌ Error creating appointment order:", err);
    res.status(500).json({ error: "Failed to create appointment order" });
  }
};

// === Verify Appointment Payment & Send Emails ===

export const verifyAppointmentPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    appointmentData,
  } = req.body;

  console.log("📅 Verifying Appointment Payment...");
  console.log("Order ID:", razorpay_order_id);
  console.log("Payment ID:", razorpay_payment_id);
  console.log("Signature:", razorpay_signature);

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    console.warn("⚠️ Missing payment parameters.");
    return res
      .status(400)
      .json({ error: "Missing payment verification parameters" });
  }

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    console.error("❌ Signature mismatch!");
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  console.log("✅ Appointment Payment Verified.");

  try {
    // ✅ Send Email to Provider
    const providerMail = {
      from: process.env.SMTP_USER,
      to: process.env.CONTACT_RECEIVER_EMAIL,
      subject: `New Appointment - ${appointmentData.name}`,
      html: `
        <h2>📅 New Appointment Booked (within 2 days other than Saturday Sunday)</h2>
        <p><strong>Name:</strong> ${appointmentData.name}</p>
        <p><strong>Email:</strong> ${appointmentData.email}</p>
        <p><strong>DOB:</strong> ${appointmentData.dob}</p>
        <p><strong>Birth Place:</strong> ${appointmentData.birthPlace}</p>
        <p><strong>Mobile:</strong> ${appointmentData.mobile}</p>
        <p><strong>Birth Time:</strong> ${appointmentData.birthTime}</p>
        <p><strong>Country:</strong> ${appointmentData.country}</p>
        <p><strong>Questions:</strong> ${appointmentData.questions}</p>
        <p><strong>Comments:</strong> ${appointmentData.comments}</p>
        <br/>
        <p><strong>Razorpay Payment ID:</strong> ${razorpay_payment_id}</p>
      `,
    };

    // ✅ Send Email to User
    const userMail = {
      from: process.env.SMTP_USER,
      to: appointmentData.email,
      subject: "📅 Appointment Confirmation - Thank You!",
      html: `
    <h2>Thank you, ${appointmentData.name}!</h2>
    <p>Your appointment has been successfully booked and paid.</p>
    <p>We will contact you ${
      appointmentData.consultationType === "urgent"
        ? "within 2 to 4 hours as this was an urgent booking."
        : "within 2 days (excluding Saturday and Sunday)."
    }</p>
    <br/>
    <p>Warm regards,<br/>Your Consultation Team</p>`,
    };

    console.log("📤 Sending provider email...");
    await transporter.sendMail(providerMail);
    console.log("✅ Provider email sent.");

    console.log("📤 Sending user confirmation email...");
    await transporter.sendMail(userMail);
    console.log("✅ User email sent.");

    return res
      .status(200)
      .json({ message: "Appointment payment verified and emails sent." });
  } catch (err) {
    console.error("❌ Email sending failed:", err);
    return res
      .status(500)
      .json({ error: "Payment verified but email sending failed." });
  }
};
