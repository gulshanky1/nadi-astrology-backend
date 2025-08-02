import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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
    console.log("✅ Server is ready to send emails");
  }
});

export const createBookOrder = async (req, res) => {
  const { amount, currency, book } = req.body;

  if (!book) {
    return res.status(400).json({ error: "Book details are required" });
  }

  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: `book_receipt_${Date.now()}`,
      payment_capture: 1,
    });

    res.status(201).json({ orderId: order.id, book });
  } catch (err) {
    console.error("❌ Error creating book order:", err);
    res.status(500).json({ error: "Failed to create book order" });
  }
};

export const verifyBookPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userDetails,
    book,
  } = req.body;

  console.log(userDetails);

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment verification parameters" });
  }

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  // ✅ Payment is verified - now try to send emails
  try {
    const providerMail = {
      from: process.env.SMTP_USER,
      to: process.env.CONTACT_RECEIVER_EMAIL,
      subject: `New Book Order - ${userDetails.name}`,
      html: `
        <h2>📚 New Book Order Received</h2>
        <p><strong>Book:</strong> ${book.name}</p>
        <p><strong>Author:</strong> ${book.author}</p>
        <p><strong>Price:</strong> ₹${book.price}</p>
        <hr/>
        <h3>Customer Details:</h3>
        <p><strong>Name:</strong> ${userDetails.name}</p>
        <p><strong>Email:</strong> ${userDetails.email}</p>
        <p><strong>Phone:</strong> ${userDetails.phone}</p>
        <p><strong>Address:</strong><br/>${userDetails.address}</p>
        <br/>
        <p><strong>Razorpay Payment ID:</strong> ${razorpay_payment_id}</p>
      `,
    };

    const userMail = {
      from: process.env.SMTP_USER,
      to: userDetails.email,
      subject: "📚 Book Order Confirmed - Thank You!",
      html: `
        <h2>Thank you, ${userDetails.name}!</h2>
        <p>Your book order has been successfully placed and paid.</p>
        <p><strong>Book:</strong> ${book.name}</p>
        <p>We will ship your order soon. You'll receive updates shortly.</p>
        <br/>
        <p>Warm regards,<br/>Umang Taneja's Team</p>
      `,
    };

    await Promise.all([
      transporter.sendMail(providerMail),
      transporter.sendMail(userMail)
    ]);

    console.log("✅ Payment verified and emails sent successfully");
    return res.status(200).json({ 
      success: true,
      message: "Book payment verified and emails sent." 
    });

  } catch (err) {
    console.error("❌ Email sending failed:", err);
    
    // ✅ Still return success since payment is verified
    return res.status(200).json({ 
      success: true,
      message: "Payment verified successfully",
      emailStatus: "failed"
    });
  }
};

