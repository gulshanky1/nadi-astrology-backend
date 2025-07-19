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

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    console.warn("⚠️ Missing required Razorpay parameters.");
    return res
      .status(400)
      .json({ error: "Missing payment verification parameters" });
  }

  if (!userDetails || !userDetails.email) {
    console.error("❌ Missing userDetails or email.");
    return res.status(400).json({ error: "Missing user details or email" });
  }

  // ✅ Signature verification
  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    console.warn("⚠️ Signature mismatch.");
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  console.log("✅ Payment signature verified. Preparing emails...");

  // === Email to Service Provider ===
  const providerMail = {
    from: process.env.SMTP_USER,
    to: process.env.CONTACT_RECEIVER_EMAIL,
    subject: `New Order Confirmed - ${userDetails.fullName}`,
    text: `
📌 New Order Received

Customer Details:
Name: ${userDetails.fullName}
Email: ${userDetails.email}
Mobile: ${userDetails.countryCode} ${userDetails.number}
Date of Birth: ${userDetails.dob}
Birth Time: ${userDetails.birthHour}:${userDetails.birthMinute}
Birth Place: ${userDetails.birthPlace}
Birth Country: ${userDetails.birthCountry}
Address: ${userDetails.address}, ${userDetails.city}, ${userDetails.postalCode}
Current Country: ${userDetails.currentCountry}
Any Questions: ${userDetails.questions || "N/A"}
Comments / Past Life Events: ${userDetails.comments || "N/A"}

🛒 Cart Items:
${cartItems
  .map(
    (item) =>
      `• ${item.name} x${item.quantity} = ₹${item.price * item.quantity}`
  )
  .join("\n")}

💰 Total Amount: ₹${totalAmount}
Razorpay Payment ID: ${razorpay_payment_id}
Razorpay Order ID: ${razorpay_order_id}
    `,
  };

  // === Email to User ===
  const userMail = {
    from: process.env.SMTP_USER,
    to: userDetails.email,
    subject: "Booking Confirmed - Thank You!",
    html: `
      <h2>Thank you, ${userDetails.fullName}!</h2>
      <p>Your booking has been successfully placed and payment received.</p>
      <p>Our astrologer will connect with you within <strong>72 hours</strong>.</p>
      <br/>
      <p>Warm regards,<br/>Umang Taneja's Team</p>
    `,
  };

  // ✅ Send Emails
  try {
    console.log("📤 Sending email to provider...");
    const providerResponse = await transporter.sendMail(providerMail);
    console.log("✅ Provider email sent:", providerResponse.response);

    console.log("📤 Sending email to user...");
    const userResponse = await transporter.sendMail(userMail);
    console.log("✅ User email sent:", userResponse.response);

    res.status(200).json({ message: "Payment verified and emails sent." });
  } catch (err) {
    console.error("❌ Email sending failed:", err.stack);
    res.status(500).json({ error: "Payment verified but email failed." });
  }
};
