import express from "express";
import { createOrder, verifyPayment } from "../controller/paymentController.js";
import { createCourseOrder, verifyCoursePayment } from "../controller/verifyCourseController.js";
import { verifyBookPayment ,createBookOrder} from "../controller/verifyBookPayment.js"; // ✅ import it
import { createAppointmentOrder, verifyAppointmentPayment } from "../controller/appointmentController.js";
import { createKundaliOrder, verifyKundaliPayment } from "../controller/kundaliController.js";
const router = express.Router();
// course
router.post("/course-order", createCourseOrder);
router.post("/verify-course", verifyCoursePayment);
// For general service booking
router.post("/payment-verify", verifyPayment);

// For book checkout confirmation
router.post("/payment/book-payment-verify", verifyBookPayment); // ✅ add this
router.post("/payment/create-book-order",createBookOrder);
// Order creation
router.post("/checkout-order", createOrder);
// Order creation for appointment
router.post("/appointment/create-appointment-order",createAppointmentOrder);
router.post("/appointment/verify-appointment-payment",verifyAppointmentPayment);
//kundali
router.post("/kundali/verify-kundali-payment",verifyKundaliPayment);
router.post("/kundali/create-kundali-order",createKundaliOrder);
export default router;
