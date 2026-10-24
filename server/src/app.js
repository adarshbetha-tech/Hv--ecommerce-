import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { checkDatabaseConnection } from "./config/db.js";

import { authRouter } from "./routes/auth.routes.js";
import { categoryRouter } from "./routes/category.routes.js";
import { productRouter } from "./routes/product.routes.js";
import { cartRouter } from "./routes/cart.routes.js";
import { addressRouter } from "./routes/address.routes.js";
import { orderRouter } from "./routes/order.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { quoteRouter } from "./routes/quote.routes.js";
import { newsletterRouter } from "./routes/newsletter.routes.js";
import { paymentRouter } from "./routes/payment.routes.js";
import { couponRouter } from "./routes/coupon.routes.js";

import { getTrustedOrigins, getCanonicalOrigin } from "./middleware/auth.middleware.js";

dotenv.config();

export const app = express();

// Trust proxy in production for accurate client IP identification in rate limits
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Security headers
app.use(helmet());

// CORS configuration - strict origin validation and credentials
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, or server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      const canonical = getCanonicalOrigin(origin);
      if (canonical && getTrustedOrigins().has(canonical)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

// Body parsing middleware (allows up to 15MB for specification attachments)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

// Health check endpoint
app.get("/api/health", async (req, res) => {
  const dbStatus = await checkDatabaseConnection();
  const statusCode = dbStatus.connected ? 200 : 503;

  res.status(statusCode).json({
    status: dbStatus.connected ? "UP" : "DEGRADED",
    service: "vertex-backend",
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.connected,
      type: "PostgreSQL",
    },
  });
});

// Catalog and category routes
app.use("/api/categories", categoryRouter);
app.use("/api/products", productRouter);

// Authentication routes
app.use("/api/auth", authRouter);

// Shopping cart routes
app.use("/api/cart", cartRouter);

// Customer addresses & checkout order routes
app.use("/api/addresses", addressRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payments", paymentRouter);

// Commercial quote requests (RFQ) and newsletter
app.use("/api/quotes", quoteRouter);
app.use("/api/newsletter", newsletterRouter);

// Coupons and educational promotions
app.use("/api/coupons", couponRouter);

// Administrative routes
app.use("/api/admin", adminRouter);

// 404 handler for undefined API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `The requested endpoint ${req.originalUrl} does not exist.`,
    },
  });
});

// Centralized error handler - avoids leaking stack traces in production
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === "production";

  if (status >= 500) {
    console.error("Server error:", err.message);
  }

  res.status(status).json({
    error: {
      code: err.code || (status >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST"),
      message: status >= 500 && isProduction ? "An unexpected server error occurred." : err.message,
    },
  });
});
