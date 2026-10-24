import fs from "fs";
import path from "path";
import qrcode from "qrcode";
import { prisma } from "../config/db.js";

const PAYMENT_CONFIG_DIR = path.resolve(process.cwd(), "uploads", "payment-config");
const CONFIG_FILE = path.join(PAYMENT_CONFIG_DIR, "config.json");

const DEFAULT_CONFIG = {
  merchantUpiId: "billing.vertex@icici",
  merchantName: "VERTEX Industrial E-Commerce",
  upiEnabled: true,
  qrMode: "DYNAMIC", // "DYNAMIC" or "STATIC"
  instructions:
    "1. Scan the QR code using any UPI app (GPay, PhonePe, Paytm, BHIM).\n2. Verify the recipient name is VERTEX Industrial E-Commerce.\n3. Complete the transfer of the exact order amount.\n4. Enter the 12-digit UPI Reference / UTR Number from your bank receipt below.",
  hasStaticQr: false,
  staticQrFileName: null,
  staticQrFileType: null,
  staticQrFileSize: null,
  staticQrImageUrl: null,
  updatedAt: new Date().toISOString(),
  updatedBy: "system@vertex.local",
};

/**
 * Ensures directory exists.
 */
function ensureDirExists() {
  if (!fs.existsSync(PAYMENT_CONFIG_DIR)) {
    fs.mkdirSync(PAYMENT_CONFIG_DIR, { recursive: true });
  }
}

/**
 * Loads current payment config from local file, with AuditLog database fallback.
 */
async function loadConfig() {
  ensureDirExists();

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    } catch (err) {
      console.warn("Failed to read local payment config file; falling back to DB/defaults:", err);
    }
  }

  // Database fallback: check AuditLog for latest configuration
  try {
    const latestAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: "PaymentConfig",
        entityId: "upi",
      },
      orderBy: { createdAt: "desc" },
    });

    if (latestAudit && latestAudit.metadata) {
      const merged = { ...DEFAULT_CONFIG, ...latestAudit.metadata };
      // Save back to local cache
      try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
      } catch {}
      return merged;
    }
  } catch (dbErr) {
    console.warn("AuditLog query for PaymentConfig failed; using default config:", dbErr.message);
  }

  return { ...DEFAULT_CONFIG };
}

/**
 * Retrieves public payment config for checkout and customer display.
 * Never leaks administrative metadata or internal paths.
 */
export async function getPublicPaymentConfig() {
  const cfg = await loadConfig();

  const availableMethods = ["COD"];
  if (cfg.upiEnabled) {
    availableMethods.push("UPI");
  }

  return {
    merchantUpiId: cfg.merchantUpiId,
    merchantName: cfg.merchantName,
    upiEnabled: Boolean(cfg.upiEnabled),
    qrMode: cfg.qrMode || "DYNAMIC",
    instructions: cfg.instructions,
    hasStaticQr: Boolean(cfg.hasStaticQr),
    staticQrImageUrl: cfg.hasStaticQr ? "/api/payments/qr-image" : null,
    supportsDynamicQr: true,
    availableMethods,
  };
}

/**
 * Retrieves administrative payment configuration including file specs and audit details.
 */
export async function getAdminPaymentConfig() {
  const cfg = await loadConfig();

  // Fetch recent audit logs for payment config changes
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      entityType: "PaymentConfig",
      entityId: "upi",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      actor: { select: { email: true, fullName: true, role: true } },
    },
  }).catch(() => []);

  return {
    config: {
      merchantUpiId: cfg.merchantUpiId,
      merchantName: cfg.merchantName,
      upiEnabled: Boolean(cfg.upiEnabled),
      qrMode: cfg.qrMode || "DYNAMIC",
      instructions: cfg.instructions,
      hasStaticQr: Boolean(cfg.hasStaticQr),
      staticQrFileName: cfg.staticQrFileName,
      staticQrFileType: cfg.staticQrFileType,
      staticQrFileSize: cfg.staticQrFileSize,
      staticQrImageUrl: cfg.hasStaticQr ? "/api/payments/qr-image" : null,
      updatedAt: cfg.updatedAt,
      updatedBy: cfg.updatedBy,
    },
    auditHistory: auditLogs.map((l) => ({
      id: l.id,
      action: l.action,
      actor: l.actor ? l.actor.email : "Administrator",
      metadata: l.metadata,
      createdAt: l.createdAt,
    })),
  };
}

/**
 * Updates merchant UPI and payment configuration.
 * Persists to disk and records an immutable entry in the PostgreSQL AuditLog table.
 */
export async function updatePaymentConfig(updateData, actorUser) {
  ensureDirExists();
  const current = await loadConfig();

  const {
    merchantUpiId,
    merchantName,
    upiEnabled = true,
    qrMode = "DYNAMIC",
    instructions,
    staticQrImage,
  } = updateData;

  const actorEmail = actorUser?.email || "admin@vertex.local";
  const actorId = actorUser?.id || null;

  let hasStaticQr = current.hasStaticQr;
  let staticQrFileName = current.staticQrFileName;
  let staticQrFileType = current.staticQrFileType;
  let staticQrFileSize = current.staticQrFileSize;

  // Handle uploaded static QR image if supplied
  if (staticQrImage && staticQrImage.fileData) {
    const ext = staticQrImage.fileType === "image/png"
      ? ".png"
      : staticQrImage.fileType === "image/webp"
      ? ".webp"
      : ".jpg";

    const base64Clean = staticQrImage.fileData.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
    const buffer = Buffer.from(base64Clean, "base64");

    const targetFileName = `merchant-qr${ext}`;
    const targetPath = path.join(PAYMENT_CONFIG_DIR, targetFileName);

    fs.writeFileSync(targetPath, buffer);

    hasStaticQr = true;
    staticQrFileName = staticQrImage.fileName || targetFileName;
    staticQrFileType = staticQrImage.fileType;
    staticQrFileSize = buffer.length;
  }

  const updatedConfig = {
    merchantUpiId: merchantUpiId.trim(),
    merchantName: merchantName.trim(),
    upiEnabled: Boolean(upiEnabled),
    qrMode: qrMode === "STATIC" && hasStaticQr ? "STATIC" : "DYNAMIC",
    instructions: instructions ? instructions.trim() : current.instructions,
    hasStaticQr,
    staticQrFileName,
    staticQrFileType,
    staticQrFileSize,
    staticQrImageUrl: hasStaticQr ? "/api/payments/qr-image" : null,
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
  };

  // 1. Save to JSON disk cache
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), "utf-8");

  // 2. Write AuditLog database record
  const auditRecord = await prisma.auditLog.create({
    data: {
      actorId,
      action: "PAYMENT_CONFIG_UPDATED",
      entityType: "PaymentConfig",
      entityId: "upi",
      metadata: {
        merchantUpiId: updatedConfig.merchantUpiId,
        merchantName: updatedConfig.merchantName,
        upiEnabled: updatedConfig.upiEnabled,
        qrMode: updatedConfig.qrMode,
        hasStaticQr: updatedConfig.hasStaticQr,
        actorEmail,
      },
    },
  });

  return {
    success: true,
    message: "UPI and payment configuration saved successfully.",
    config: updatedConfig,
    auditLog: {
      id: auditRecord.id,
      action: auditRecord.action,
      createdAt: auditRecord.createdAt,
    },
  };
}

/**
 * Removes the uploaded static QR code image and reverts to Dynamic QR generation.
 */
export async function removeStaticQr(actorUser) {
  ensureDirExists();
  const current = await loadConfig();

  // Remove potential static files
  const possibleFiles = ["merchant-qr.png", "merchant-qr.jpg", "merchant-qr.webp"];
  for (const f of possibleFiles) {
    const fp = path.join(PAYMENT_CONFIG_DIR, f);
    if (fs.existsSync(fp)) {
      try {
        fs.unlinkSync(fp);
      } catch {}
    }
  }

  const actorEmail = actorUser?.email || "admin@vertex.local";
  const actorId = actorUser?.id || null;

  const updatedConfig = {
    ...current,
    hasStaticQr: false,
    staticQrFileName: null,
    staticQrFileType: null,
    staticQrFileSize: null,
    staticQrImageUrl: null,
    qrMode: "DYNAMIC",
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), "utf-8");

  await prisma.auditLog.create({
    data: {
      actorId,
      action: "PAYMENT_QR_REMOVED",
      entityType: "PaymentConfig",
      entityId: "upi",
      metadata: {
        actorEmail,
        revertedTo: "DYNAMIC",
      },
    },
  });

  return {
    success: true,
    message: "Static QR code image removed. Checkout will use dynamic UPI QR generation.",
    config: updatedConfig,
  };
}

/**
 * Generates a dynamic transaction-specific UPI payment QR code as a PNG data URL.
 * Standard UPI URI specification:
 * upi://pay?pa={upiId}&pn={merchantName}&am={amount}&cu=INR&tn={orderNumber}
 */
export async function generateDynamicUpiQr({ amount, orderNumber, notes }) {
  const cfg = await loadConfig();

  const upiId = cfg.merchantUpiId;
  const merchantName = cfg.merchantName;

  const params = new URLSearchParams();
  params.set("pa", upiId);
  params.set("pn", merchantName);
  if (amount !== undefined && amount !== null) {
    params.set("am", Number(amount).toFixed(2));
  }
  params.set("cu", "INR");
  const noteText = orderNumber ? `Order ${orderNumber}` : (notes || "VERTEX E-Commerce");
  params.set("tn", noteText);

  const upiUri = `upi://pay?${params.toString()}`;

  const qrDataUrl = await qrcode.toDataURL(upiUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 260,
    color: {
      dark: "#0b1f3a", // Industrial Navy for high readability
      light: "#ffffff",
    },
  });

  return {
    success: true,
    qrDataUrl,
    upiUri,
    merchantUpiId: upiId,
    merchantName,
    amount: Number(amount),
    orderNumber: orderNumber || null,
    mode: "DYNAMIC",
    isDynamic: true,
  };
}

/**
 * Retrieves the absolute path to the stored static QR code image if it exists.
 */
export async function getStaticQrImagePath() {
  ensureDirExists();
  const possibleFiles = ["merchant-qr.png", "merchant-qr.jpg", "merchant-qr.webp"];
  for (const f of possibleFiles) {
    const fp = path.join(PAYMENT_CONFIG_DIR, f);
    if (fs.existsSync(fp)) {
      return fp;
    }
  }
  return null;
}
