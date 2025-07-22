import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// ✅ Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Nodemailer transporter with debug enabled
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  logger: true,
  debug: true,
});

// === Order Creation Handler ===
export const createOrder = async (req, res) => {
  try {
    const { amount, ...formDetails } = req.body;

    console.log("🟡 New Pay Now request received:");
    console.log("Form Details:", formDetails);
    console.log("Amount:", amount);

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    console.log("✅ Razorpay Order created:", {
      id: order.id,
      amount: order.amount,
      status: order.status,
    });

    res.status(201).json({ order });
  } catch (err) {
    console.error("❌ Order creation failed:", err.stack);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
};

// === Payment Verification Handler ===


export const verifyPayment = async (req, res) => {
  console.log("🔍 Incoming payment verification payload:", req.body);

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userDetails,
    cartItems,
    totalAmount,
  } = req.body;

  // Basic validation
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    console.warn(
      "⚠️ Missing Razorpay params, skipping verification but continuing."
    );
    return res
      .status(200)
      .json({ message: "Skipped verification (test mode?)" });
  }

  if (!userDetails?.email) {
    console.error("❌ Missing user email.");
    return res.status(400).json({ error: "Missing user email" });
  }

  // ✅ Signature verification
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const isVerified = expectedSignature === razorpay_signature;

  if (!isVerified) {
    console.warn("⚠️ Signature mismatch — possible fraud.");
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  console.log("✅ Payment verified successfully. Preparing emails...");

  // === Email to Service Provider ===
  const providerMail = {
    from: process.env.SMTP_USER,
    to: process.env.CONTACT_RECEIVER_EMAIL,
    subject: `New Booking Confirmed - ${userDetails.fullName}`,
    text: `
📌 New Order Details:

👤 Customer:
Name: ${userDetails.fullName}
Email: ${userDetails.email}
Phone: ${userDetails.countryCode} ${userDetails.number}
DOB: ${userDetails.dob}
Time: ${userDetails.birthHour}:${userDetails.birthMinute}
Place: ${userDetails.birthPlace}, ${userDetails.birthCountry}
Current Country: ${userDetails.currentCountry}
Address: ${userDetails.address}, ${userDetails.city}, ${userDetails.postalCode}
Questions: ${userDetails.questions || "N/A"}
Comments: ${userDetails.comments || "N/A"}

🛍️ Cart Items:
${cartItems
  .map(
    (item) =>
      `• ${item.name} x${item.quantity} = ₹${item.price * item.quantity}`
  )
  .join("\n")}

💳 Total Paid: ₹${totalAmount}
Payment ID: ${razorpay_payment_id}
Order ID: ${razorpay_order_id}
    `,
  };

  // === Email to User ===
  const userMail = {
    from: process.env.SMTP_USER,
    to: userDetails.email,
    subject: "✅ Booking Confirmed - Thank You!",
    html: `
      <h2>Hi ${userDetails.fullName},</h2>
      <p>We’ve received your payment and confirmed your booking.</p>
      <p>Our astrologer will connect with you within <strong>72 hours</strong>.</p>
      <br/>
      <p>Warm regards,<br/>Umang Taneja’s Team</p>
    `,
  };

  try {
    // Send emails
    console.log("📤 Sending provider email...");
    const providerRes = await transporter.sendMail(providerMail);
    console.log("✅ Provider email sent:", providerRes.response);

    console.log("📤 Sending user email...");
    const userRes = await transporter.sendMail(userMail);
    console.log("✅ User email sent:", userRes.response);

    res.status(200).json({ message: "Payment verified and emails sent." });
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    res
      .status(500)
      .json({ error: "Payment verified, but failed to send email." });
  }
};
