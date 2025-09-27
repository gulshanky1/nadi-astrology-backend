// config/nodemailer.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // use 465 for secure connection, 587 for STARTTLS
  secure: true, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // your Gmail address
    pass: process.env.SMTP_PASS, // your App Password (not your normal Gmail password)
  },
  tls: {
    rejectUnauthorized: false, // allow self-signed certificates (helps on Render)
  },
});

export default transporter;
