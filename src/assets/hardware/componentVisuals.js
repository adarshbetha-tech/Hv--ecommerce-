/**
 * VERTEX Component Technical Illustrations & Visual Helpers
 * 
 * Provides genuine high-resolution industrial product photography
 * for precision fasteners, EV-grade lithium-ion cells, and embedded electronics.
 * Sourced from verified industrial suppliers and open hardware repositories.
 */

import arduinoImg from "./arduino.jpg";
import automationImg from "./automation.jpg";
import breadboardImg from "./breadboard.jpg";
import fastenersImg from "./fasteners.jpg";
import pcbImg from "./pcb.jpg";

// Screws (Verified Industrial Photography)
import slottedChhdImg from "./screws/slotted-chhd.jpg";
import panHeadImg from "./screws/pan-head.jpg";
import countersunkCskImg from "./screws/countersunk-csk.jpg";
import selfTappingPanImg from "./screws/self-tapping-pan.jpg";
import selfTappingCskImg from "./screws/self-tapping-csk.jpg";
import laptopMobileImg from "./screws/laptop-mobile-screws.jpg";
import drywallGypsumImg from "./screws/drywall-gypsum.png";
import selfDrillingPanImg from "./screws/self-drilling-pan.jpg";
import socketHeadImg from "./screws/socket-head.jpg";
import buttonHeadImg from "./screws/button-head.jpg";
import allenCountersunkCskImg from "./screws/allen-countersunk-csk.jpg";
import hexBoltImg from "./screws/hex-bolt.svg";

// Nuts, Washers & Brass Inserts (Verified Industrial Photography)
import hexNutImg from "./fasteners/hex-nut.jpg";
import nylocNutImg from "./fasteners/nyloc-nut.jpg";
import wingNutImg from "./fasteners/wing-nut.jpg";
import plainWasherImg from "./fasteners/plain-washer.jpg";
import springWasherImg from "./fasteners/spring-washer.jpg";
import externalSerratedWasherImg from "./fasteners/external-serrated-washer.jpg";
import brassSlantKnurledInsertImg from "./fasteners/brass-slant-knurled-insert.jpg";
import brassThreadedInsertImg from "./fasteners/brass-threaded-insert.jpg";

// Lithium-Ion Cells & Electronic Components (Manufacturer & Studio Photography)
import dmegc18650_2600CellImg from "./electronics/dmegc-18650-2600-cell.jpg";
import dmegc18650_2900CellImg from "./electronics/dmegc-18650-2900-cell.jpg";
import dmegc18650_3200CellImg from "./electronics/dmegc-18650-3200-cell.jpg";
import dmegc18650CellImg from "./electronics/dmegc-18650-cell.jpg";
import dmegc21700CellImg from "./electronics/dmegc-21700-cell.jpg";
import norda21700CellImg from "./electronics/norda-21700-cell.webp";
import norda18650CellImg from "./electronics/norda-18650-cell.webp";
import panasonic21700CellImg from "./electronics/panasonic-21700-cell.jpg";
import gl12BreadboardImg from "./electronics/gl12-breadboard.jpg";
import jumperCablesPhotoImg from "./electronics/jumper-cables.jpg";
import maleBergStripPhotoImg from "./electronics/male-berg-strip.jpg";
import femaleBergStripPhotoImg from "./electronics/female-berg-strip.jpg";
import bergStripHeadersImg from "./electronics/berg-strip-headers.jpg";

import dmegc18650_2600Img from "./electronics/dmegc-18650-2600.svg";
import dmegc18650_2900Img from "./electronics/dmegc-18650-2900.svg";
import dmegc18650_3200Img from "./electronics/dmegc-18650-3200.svg";
import dmegc21700_4500Img from "./electronics/dmegc-21700-4500.svg";
import norda21700_4500Img from "./electronics/norda-21700-4500.svg";
import panasonic21700_4500Img from "./electronics/panasonic-21700-4500.svg";
import norda18650_2600Img from "./electronics/norda-18650-2600.svg";

import breadboardGl12Img from "./electronics/breadboard-gl12.svg";
import jumperCablesImg from "./electronics/jumper-cables.svg";
import maleBergStripImg from "./electronics/male-berg-strip.svg";
import femaleBergStripImg from "./electronics/female-berg-strip.svg";

export const PRODUCT_PHOTOS = {
  // Legacy / Photography
  arduino: arduinoImg,
  automation: automationImg,
  breadboard: breadboardImg,
  fasteners: fastenersImg,
  pcb: pcbImg,

  // Screws (Verified Industrial Photography)
  slottedChhd: slottedChhdImg,
  panHead: panHeadImg,
  panHeadAngle: panHeadImg,
  countersunkCsk: countersunkCskImg,
  selfTappingPan: selfTappingPanImg,
  selfTappingCsk: selfTappingCskImg,
  laptopMobile: laptopMobileImg,
  laptopMobilePack: laptopMobileImg,
  drywallGypsum: drywallGypsumImg,
  drywallGypsumAngle: drywallGypsumImg,
  selfDrillingPan: selfDrillingPanImg,
  selfDrillingPanTip: selfDrillingPanImg,
  socketHead: socketHeadImg,
  buttonHead: buttonHeadImg,
  allenCountersunkCsk: allenCountersunkCskImg,
  allenCountersunkCskAngle: allenCountersunkCskImg,
  hexBolt: hexBoltImg,

  // Nuts, Washers, Inserts (Verified Industrial Photography)
  hexNut: hexNutImg,
  nylocNut: nylocNutImg,
  wingNut: wingNutImg,
  wingNutAngle: wingNutImg,
  plainWasher: plainWasherImg,
  springWasher: springWasherImg,
  externalSerratedWasher: externalSerratedWasherImg,
  externalSerratedWasherAngle: externalSerratedWasherImg,
  brassSlantKnurledInsert: brassSlantKnurledInsertImg,
  brassSlantKnurledInsertAngle: brassSlantKnurledInsertImg,
  brassThreadedInsert: brassThreadedInsertImg,
  brassThreadedInsertAngle: brassThreadedInsertImg,

  // Lithium Cells - Genuine Commercial Photography
  dmegc18650_2600Cell: dmegc18650_2600CellImg,
  dmegc18650_2900Cell: dmegc18650_2900CellImg,
  dmegc18650_3200Cell: dmegc18650_3200CellImg,
  dmegc18650Cell: dmegc18650CellImg,
  dmegc21700Cell: dmegc21700CellImg,
  norda21700Cell: norda21700CellImg,
  norda18650Cell: norda18650CellImg,
  panasonic21700Cell: panasonic21700CellImg,

  // Technical Vector Fallbacks
  dmegc18650_2600: dmegc18650_2600Img,
  dmegc18650_2900: dmegc18650_2900Img,
  dmegc18650_3200: dmegc18650_3200Img,
  dmegc21700_4500: dmegc21700_4500Img,
  norda21700_4500: norda21700_4500Img,
  panasonic21700_4500: panasonic21700_4500Img,
  norda18650_2600: norda18650_2600Img,

  // Electronic Components
  gl12Breadboard: gl12BreadboardImg,
  jumperCablesPhoto: jumperCablesPhotoImg,
  maleBergStripPhoto: maleBergStripPhotoImg,
  femaleBergStripPhoto: femaleBergStripPhotoImg,
  bergStripHeaders: bergStripHeadersImg,
  breadboardGl12: breadboardGl12Img,
  jumperCables: jumperCablesImg,
  maleBergStrip: maleBergStripImg,
  femaleBergStrip: femaleBergStripImg,
};

/**
 * Strict helper to identify text-only electronic products (Categories 3, 4, 5, 6).
 * No product photos, thumbnails, image placeholders, or empty image containers.
 */
export function isTextOnlyProduct(product) {
  if (!product) return false;
  if (product.isTextOnly === true || product.subcategory?.textOnly === true) return true;
  const sub = (product.subcategory?.slug || "").toLowerCase();
  const slug = (product.slug || "").toLowerCase();
  return (
    sub.startsWith("hvnex-") ||
    sub === "hvnex-microcontrollers" ||
    sub === "hvnex-motor-drivers" ||
    sub === "hvnex-plc-controllers" ||
    sub === "hvnex-buck-converters" ||
    slug.startsWith("hvnex-")
  );
}

/**
 * Returns an appropriate photo or visual for a given product.
 * Strictly adheres to rule: Electronic Categories 3, 4, 5, 6 return null (NO images).
 */
export function getProductVisual(product) {
  if (!product) return null;

  const slug = (product.slug || "").toLowerCase();
  const subcat = (product.subcategory?.slug || "").toLowerCase();

  // Strict Rule: Categories 3, 4, 5, 6 must have NO images
  if (
    subcat.includes("hvnex") ||
    slug.startsWith("hvnex-") ||
    slug.includes("microcontroller") ||
    slug.includes("motor-driver") ||
    slug.includes("plc") ||
    slug.includes("buck-converter")
  ) {
    return null;
  }

  if (product.imageUrl) return product.imageUrl;

  // Screws catalog matching (Verified Industrial Photography)
  if (slug.includes("slotted-chhd")) return slottedChhdImg;
  if (slug.includes("pan-head")) return panHeadImg;
  if (slug.includes("countersunk-csk") && !slug.includes("allen")) return countersunkCskImg;
  if (slug.includes("self-tapping-pan")) return selfTappingPanImg;
  if (slug.includes("self-tapping-countersunk") || slug.includes("self-tapping-csk")) return selfTappingCskImg;
  if (slug.includes("laptop") || slug.includes("mobile")) return laptopMobileImg;
  if (slug.includes("drywall") || slug.includes("gypsum")) return drywallGypsumImg;
  if (slug.includes("self-drilling") || slug.includes("tek")) return selfDrillingPanImg;
  if (slug.includes("socket-head")) return socketHeadImg;
  if (slug.includes("button-head")) return buttonHeadImg;
  if (slug.includes("allen-countersunk")) return allenCountersunkCskImg;
  if (slug.includes("hex-bolt")) return hexBoltImg;

  // Nuts
  if (slug.includes("nyloc")) return nylocNutImg;
  if (slug.includes("wing-nut")) return wingNutImg;
  if (slug.includes("hex-nut") || slug === "nuts") return hexNutImg;

  // Washers
  if (slug.includes("spring-washer")) return springWasherImg;
  if (slug.includes("serrated-washer")) return externalSerratedWasherImg;
  if (slug.includes("plain-washer") || slug.includes("washer")) return plainWasherImg;

  // Inserts
  if (slug.includes("slant-knurled")) return brassSlantKnurledInsertImg;
  if (slug.includes("brass") || slug.includes("insert")) return brassThreadedInsertImg;

  // Batteries - Authentic Manufacturer Photography
  if (slug.includes("dmegc") && slug.includes("18650")) {
    if (slug.includes("2600")) return dmegc18650_2600CellImg;
    if (slug.includes("2900")) return dmegc18650_2900CellImg;
    if (slug.includes("3200")) return dmegc18650_3200CellImg;
    return dmegc18650CellImg;
  }
  if (slug.includes("dmegc") && slug.includes("21700")) return dmegc21700CellImg;
  if (slug.includes("panasonic") && slug.includes("21700")) return panasonic21700CellImg;
  if (slug.includes("norda") && slug.includes("21700")) return norda21700CellImg;
  if (slug.includes("norda") && slug.includes("18650")) return norda18650CellImg;

  // Components - Studio Photography
  if (slug.includes("breadboard")) return gl12BreadboardImg;
  if (slug.includes("jumper")) return jumperCablesPhotoImg;
  if (slug.includes("male-berg")) return maleBergStripPhotoImg;
  if (slug.includes("female-berg")) return femaleBergStripPhotoImg;
  if (slug.includes("berg")) return maleBergStripPhotoImg || bergStripHeadersImg;

  // Existing photographed items (legacy)
  if (slug.includes("arduino-uno")) return arduinoImg;
  if (slug.includes("raspberry-pi")) return arduinoImg;
  if (slug.includes("l298n")) return automationImg;
  if (slug.includes("plc-delta")) return pcbImg;

  return null;
}

/**
 * Fallback Component Technical Illustration component
 * Strictly returns null for electronic categories 3, 4, 5, 6 (no images / no placeholders).
 */
export function ComponentIllustration({ type, brand = "VERTEX", specs = {}, className = "" }) {
  if (type === "text-only" || type === "hvnex" || brand === "HVNEX") {
    return null;
  }

  if (type === "battery") {
    return (
      <svg
        viewBox="0 0 240 180"
        className={`component-svg vtx-battery-svg ${className}`}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cellBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="terminalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>
        <rect width="240" height="180" fill="#09182d" rx="8" />
        <rect x="50" y="35" width="140" height="110" rx="16" fill="url(#cellBodyGrad)" stroke="#38bdf8" strokeWidth="2" />
        <rect x="190" y="70" width="14" height="40" rx="3" fill="url(#terminalGrad)" stroke="#475569" strokeWidth="1" />
        <circle cx="65" cy="55" r="4" fill="#38bdf8" />
        <text x="120" y="80" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="bold" letterSpacing="1">
          {brand.toUpperCase()}
        </text>
        <text x="120" y="100" textAnchor="middle" fill="#38bdf8" fontSize="11" fontFamily="monospace">
          {specs["Cell Format"] || "LITHIUM-ION"} • {specs["Nominal Capacity"] || specs["Capacity"] || "EV GRADE"}
        </text>
        <text x="120" y="120" textAnchor="middle" fill="#94a3b8" fontSize="10">
          {specs["Nominal Voltage"] || "3.65V"} HIGH DRAIN
        </text>
      </svg>
    );
  }

  if (type === "fastener") {
    return (
      <svg
        viewBox="0 0 240 180"
        className={`component-svg vtx-fastener-svg ${className}`}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fastenerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>
        <rect width="240" height="180" fill="#09182d" rx="8" />
        <circle cx="120" cy="90" r="50" fill="url(#fastenerGrad)" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="120" cy="90" r="28" fill="#09182d" stroke="#64748b" strokeWidth="1.5" />
        <text x="120" y="160" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">
          SS304 / ISO
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 240 180"
      className={`component-svg vtx-generic-svg ${className}`}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="240" height="180" fill="#09182d" rx="8" />
      <rect x="40" y="30" width="160" height="120" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
      <text x="120" y="95" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">
        {brand || "HV VERTEX"}
      </text>
    </svg>
  );
}
