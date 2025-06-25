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

// === CREATE COURSE ORDER ===
export const createCourseOrder = async (req, res) => {
  const { amount } = req.body;

  console.log("📦 Creating course order for amount:", amount);

  try {
    const options = {
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `rcpt_course_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    console.log("✅ Razorpay order created:", order.id);
    res.status(200).json({ success: true, message: "Order created successfully", order });
  } catch (err) {
    console.error("❌ Failed to create Razorpay order:", err);
    res.status(500).json({
      success: false,
      message: "Unable to create payment order at the moment. Please try again.",
    });
  }
};

// === VERIFY PAYMENT & SEND CONFIRMATION EMAIL ===
export const verifyCoursePayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    course,
    userDetails,
  } = req.body;

  console.log("🔍 Verifying payment for order:", razorpay_order_id);

  try {
    // Step 1: Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      console.warn("⚠️ Payment signature mismatch. Possible tampering.");
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Please contact support.",
      });
    }

    console.log("✅ Payment verified successfully");

    // Step 2: Send email confirmation
    console.log("✉️ Preparing to send confirmation email");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const htmlContent = `
      <h2>🎓 Course Purchase Confirmation</h2>
      <p><strong>Name:</strong> ${userDetails.name}</p>
      <p><strong>Email:</strong> ${userDetails.email}</p>
      <p><strong>Phone:</strong> ${userDetails.countryCode} ${userDetails.phone}</p>
      <p><strong>Address:</strong> ${userDetails.address}</p>
      <hr />
      <p><strong>Course:</strong> ${course.title}</p>
      <p><strong>Amount Paid:</strong> ₹${course.price}</p>
      <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: `${userDetails.email}, ${process.env.SMTP_USER}`,
      subject: `✅ Course Booking Confirmation - ${course.title}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    console.log("📤 Email sent to:", userDetails.email, "and", process.env.SMTP_USER);

    return res.status(200).json({
      success: true,
      message: "Your payment has been successfully verified and confirmation email has been sent.",
    });
  } catch (err) {
    console.error("❌ Error during payment verification or email sending:", err);
    res.status(500).json({
      success: false,
      message:
        "Something went wrong while verifying your payment. If the amount was deducted, please contact support.",
    });
  }
};
