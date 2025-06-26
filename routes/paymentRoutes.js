import express from "express";
import { createOrder, verifyPayment } from "../controller/paymentController.js";
import { createCourseOrder, verifyCoursePayment } from "../controller/verifyCourseController.js";
import { verifyBookPayment ,createBookOrder } from "../controller/verifyBookPayment.js";
import { createAppointmentOrder, verifyAppointmentPayment } from "../controller/appointmentController.js";
import { createKundaliOrder, verifyKundaliPayment } from "../controller/kundaliController.js";

const router = express.Router();

// course
router.post("/course-order", createCourseOrder);
router.post("/verify-course", verifyCoursePayment);

// general service booking
router.post("/payment-verify", verifyPayment);

// ✅ FIXED book routes
router.post("/create-book-order", createBookOrder);
router.post("/book-payment-verify", verifyBookPayment);

// general checkout
router.post("/checkout-order", createOrder);

// appointment
router.post("/appointment/create-appointment-order", createAppointmentOrder);
router.post("/appointment/verify-appointment-payment", verifyAppointmentPayment);

// kundali
router.post("/kundali/verify-kundali-payment", verifyKundaliPayment);
router.post("/kundali/create-kundali-order", createKundaliOrder);

export default router;
