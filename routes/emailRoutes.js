import express from "express";
import { contactForm, bookAppointment } from "../controller/emailController.js";
const router = express.Router();

router.post("/contact", contactForm);
router.post("/book-appointment", bookAppointment);

export default router;