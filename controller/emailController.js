import transporter from "../config/nodemailer.js";

export const contactForm = async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.CONTACT_RECEIVER_EMAIL,
      subject: `Contact Form Submission: ${subject}`,
      text: `
Name: ${name}
Email: ${email}
Subject: ${subject}
Message: ${message}
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Contact form email sent:", info.response);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Contact email error:", error);
    res.status(500).json({ message: "Failed to send contact email" });
  }
};

export const bookAppointment = async (req, res) => {
  const { category, name, email, mobile, gender, timeOfDay, address, reason } = req.body;
  if (!category || !name || !email || !mobile || !gender || !timeOfDay || !address || !reason)
    return res.status(400).json({ error: "All appointment fields are required" });

  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.CONTACT_RECEIVER_EMAIL,
      subject: `New Appointment Booking: ${category}`,
      text: `
New Appointment Details:

Category: ${category}
Name: ${name}
Email: ${email}
Mobile: ${mobile}
Gender: ${gender}
Preferred Time: ${timeOfDay}
Address: ${address}

Reason for Appointment:
${reason}
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Appointment booking email sent:", info.response);
    res.status(200).json({ message: "Appointment request sent successfully." });
  } catch (error) {
    console.error("Appointment email error:", error);
    res.status(500).json({ message: "Failed to send appointment email" });
  }
};
