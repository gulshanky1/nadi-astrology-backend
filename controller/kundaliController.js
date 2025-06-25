import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
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

// === Create Kundali Matching Order ===
export const createKundaliOrder = async (req, res) => {
  try {
    const { amount, userDetails } = req.body;

    if (!amount || !userDetails) {
      return res.status(400).json({ error: "Amount and user details are required." });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `kundali_${Date.now()}`,
      payment_capture: 1,
    });

    console.log("🔮 Created Kundali Matching Order:", order);
    res.status(201).json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error("❌ Error creating Kundali order:", err);
    res.status(500).json({ error: "Failed to create Kundali order" });
  }
};

// === Verify Kundali Matching Payment & Send Emails ===
export const verifyKundaliPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userDetails } = req.body;

  console.log("🔮 Verifying Kundali Matching Payment...");
  console.log("Order ID:", razorpay_order_id);
  console.log("Payment ID:", razorpay_payment_id);
  console.log("Signature:", razorpay_signature);

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    console.warn("⚠️ Missing payment parameters.");
    return res.status(400).json({ error: "Missing payment verification parameters" });
  }

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    console.error("❌ Signature mismatch!");
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  console.log("✅ Kundali Matching Payment Verified.");

  try {
    // Email to provider with **full form details**
    const providerMail = {
      from: process.env.SMTP_USER,
      to: process.env.CONTACT_RECEIVER_EMAIL,
      subject: `🔮 Kundali Matching Payment Confirmed - ${userDetails.boyDetails.name} & ${userDetails.girlDetails.name}`,
      html: `
        <h2>🔮 Kundali Matching Request Submitted</h2>
        <h3>👦 Boy's Details:</h3>
        <p><strong>Name:</strong> ${userDetails.boyDetails.name}</p>
        <p><strong>Date of Birth:</strong> ${userDetails.boyDetails.dob}</p>
        <p><strong>Time of Birth:</strong> ${userDetails.boyDetails.tob}</p>
        <p><strong>Place of Birth:</strong> ${userDetails.boyDetails.place}</p>
        
        <h3>👧 Girl's Details:</h3>
        <p><strong>Name:</strong> ${userDetails.girlDetails.name}</p>
        <p><strong>Date of Birth:</strong> ${userDetails.girlDetails.dob}</p>
        <p><strong>Time of Birth:</strong> ${userDetails.girlDetails.tob}</p>
        <p><strong>Place of Birth:</strong> ${userDetails.girlDetails.place}</p>

        <h3>🔗 Additional Information:</h3>
        <p><strong>Relation Side:</strong> ${userDetails.relationSide}</p>
        <p><strong>Questions:</strong> ${userDetails.questions}</p>
        <p><strong>Comments:</strong> ${userDetails.comments}</p>
        <br/>
        <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
      `,
    };

    // Email to user confirming payment
    const userMail = {
      from: process.env.SMTP_USER,
      to: userDetails.email,
      subject: "🔮 Kundali Matching Payment Confirmation",
      html: `
        <h2>Thank you, ${userDetails.name}!</h2>
        <p>Your Kundali Matching payment has been successfully processed.</p>
        <br/>
        <p>We will get in touch with you soon regarding your consultation.</p>
        <br/>
        <p>Warm regards,<br/>Consultation Team</p>
      `,
    };

    console.log("📤 Sending provider email...");
    await transporter.sendMail(providerMail);
    console.log("✅ Provider email sent.");

    console.log("📤 Sending user confirmation email...");
    await transporter.sendMail(userMail);
    console.log("✅ User email sent.");

    return res.status(200).json({ message: "Kundali Matching payment verified and emails sent." });
  } catch (err) {
    console.error("❌ Email sending failed:", err);
    return res.status(500).json({ error: "Payment verified but email sending failed." });
  }
};