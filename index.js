// index.js or server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import paymentRoutes from "./routes/paymentRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";

dotenv.config();

const app = express();


const allowedOrigins = ["https://nadi-astrology.com","https://www.nadi-astrology.com"];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin like Postman or curl
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    exposedHeaders: ["x-rtb-fingerprint-id"],
  })
);

// Handle preflight OPTIONS requests
// app.options("*", cors());

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.set("trust proxy", 1);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// ✅ Routes
app.use("/api/payment", paymentRoutes);
app.use("/api/email", emailRoutes);

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
