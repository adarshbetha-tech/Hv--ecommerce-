/**
 * VERTEX Fasteners & Screw Category Hierarchy Data
 * 
 * Source of truth: Product_Categories_Fasteners_First_Electronics_Second.pdf
 * Maps approved Fasteners categories and screw head categories with authentic local SVG assets.
 */

import slottedChhdImg from "../assets/hardware/screws/slotted-chhd.svg";
import panHeadImg from "../assets/hardware/screws/pan-head.svg";
import countersunkCskImg from "../assets/hardware/screws/countersunk-csk.svg";
import selfTappingPanImg from "../assets/hardware/screws/self-tapping-pan.svg";
import selfTappingCskImg from "../assets/hardware/screws/self-tapping-csk.svg";
import laptopMobileImg from "../assets/hardware/screws/laptop-mobile-screws.svg";
import drywallGypsumImg from "../assets/hardware/screws/drywall-gypsum.svg";
import selfDrillingPanImg from "../assets/hardware/screws/self-drilling-pan.svg";
import socketHeadImg from "../assets/hardware/screws/socket-head.svg";
import buttonHeadImg from "../assets/hardware/screws/button-head.svg";
import allenCountersunkCskImg from "../assets/hardware/screws/allen-countersunk-csk.svg";

import hexNutImg from "../assets/hardware/fasteners/hex-nut.svg";
import nylocNutImg from "../assets/hardware/fasteners/nyloc-nut.svg";
import wingNutImg from "../assets/hardware/fasteners/wing-nut.svg";
import plainWasherImg from "../assets/hardware/fasteners/plain-washer.svg";
import springWasherImg from "../assets/hardware/fasteners/spring-washer.svg";
import externalSerratedWasherImg from "../assets/hardware/fasteners/external-serrated-washer.svg";
import brassSlantKnurledInsertImg from "../assets/hardware/fasteners/brass-slant-knurled-insert.svg";
import brassThreadedInsertImg from "../assets/hardware/fasteners/brass-threaded-insert.svg";

// Page 1 — Approved Fastener Categories from the Official Category Document
export const APPROVED_FASTENER_CATEGORIES = [
  {
    id: "sub-screws-flat",
    slug: "screws-flat-slotted",
    parentSlug: "fasteners",
    name: "Screws — Flat (Slotted)",
    shortName: "Flat (Slotted)",
    icon: "━",
    imageUrl: slottedChhdImg,
    subcategoriesCount: 1,
    description: "Slotted drive cheese head machine screws for mechanical assemblies and panel clamps.",
  },
  {
    id: "sub-screws-cross",
    slug: "screws-cross-phillips",
    parentSlug: "fasteners",
    name: "Screws — Cross (Phillips)",
    shortName: "Cross (Phillips)",
    icon: "✚",
    imageUrl: panHeadImg,
    subcategoriesCount: 7,
    description: "Pan head, countersunk, self-tapping, drywall, and micro electronics machine screws.",
  },
  {
    id: "sub-screws-hex",
    slug: "screws-hex-allen",
    parentSlug: "fasteners",
    name: "Screws — Hex (Allen)",
    shortName: "Hex (Allen)",
    icon: "⬡",
    imageUrl: socketHeadImg,
    subcategoriesCount: 3,
    description: "High-tensile socket head cap screws, button head, and countersunk Allen screws.",
  },
  {
    id: "sub-nuts",
    slug: "nuts",
    parentSlug: "fasteners",
    name: "Nuts",
    shortName: "Nuts",
    icon: "⬡",
    imageUrl: hexNutImg,
    subcategoriesCount: 3,
    description: "Metric standard hex nuts, vibration-resistant Nyloc nuts, and wing nuts.",
  },
  {
    id: "sub-washers",
    slug: "washers",
    parentSlug: "fasteners",
    name: "Washers",
    shortName: "Washers",
    icon: "◎",
    imageUrl: plainWasherImg,
    subcategoriesCount: 3,
    description: "Plain flat load-bearing washers, split spring lock washers, and serrated washers.",
  },
  {
    id: "sub-brass-inserts",
    slug: "brass-inserts",
    parentSlug: "fasteners",
    name: "Brass Inserts",
    shortName: "Brass Inserts",
    icon: "⚙️",
    imageUrl: brassSlantKnurledInsertImg,
    subcategoriesCount: 2,
    description: "3D printing threaded slant knurled inserts and brass ultrasonic embedment inserts.",
  },
];

// Page 2 — Screw Head Categories Grouped by Family
export const SCREW_HEAD_GROUPS = {
  "screws-cross-phillips": {
    familyTitle: "Cross (Phillips)",
    familySubtitle: "Choose by Head category",
    breadcrumbLabel: "Cross (Phillips)",
    parentSlug: "fasteners",
    parentName: "Fasteners",
    headCategories: [
      {
        id: "head-pan-head",
        name: "Pan Head Screw",
        slug: "pan-head-screw",
        imageUrl: panHeadImg,
        headType: "Pan Head",
        driveType: "Cross (Phillips)",
        description: "Flat bearing surface for even load distribution on sheet metal & electronics.",
      },
      {
        id: "head-csk",
        name: "Countersunk (CSK) Screw",
        slug: "countersunk-csk-screw",
        imageUrl: countersunkCskImg,
        headType: "Countersunk (CSK)",
        driveType: "Cross (Phillips)",
        description: "90° bevel flat head that seats perfectly flush with workpiece surfaces.",
      },
      {
        id: "head-self-tapping-pan",
        name: "Self-Tapping Pan Head Screw",
        slug: "self-tapping-pan-head-screw",
        imageUrl: selfTappingPanImg,
        headType: "Pan Head",
        driveType: "Cross (Phillips)",
        description: "Direct thread forming into plastics, aluminium sheet, and enclosures.",
      },
      {
        id: "head-self-tapping-csk",
        name: "Self-Tapping Countersunk (CSK) Screw",
        slug: "self-tapping-countersunk-csk-screw",
        imageUrl: selfTappingCskImg,
        headType: "Countersunk (CSK)",
        driveType: "Cross (Phillips)",
        description: "Flush mounting tapping retention into pre-drilled brackets and panels.",
      },
      {
        id: "head-laptop-mobile",
        name: "Laptop and Mobile Screws",
        slug: "laptop-and-mobile-screws",
        imageUrl: laptopMobileImg,
        headType: "Wafer Thin Flat Head",
        driveType: "Cross (Phillips Precision)",
        description: "Ultra-fine precision micro screws for mobile internals, laptops, and PCB mounts.",
      },
      {
        id: "head-drywall-gypsum",
        name: "Drywall/Gypsum Screws",
        slug: "drywall-gypsum-screws",
        imageUrl: drywallGypsumImg,
        headType: "Bugle Head",
        driveType: "Cross (Phillips)",
        description: "Coarse thread bugle head screws with sharp piercing points for rapid driving.",
      },
      {
        id: "head-self-drilling-pan",
        name: "Pan Phillips Self-Drilling Screw",
        slug: "pan-phillips-self-drilling-screw",
        imageUrl: selfDrillingPanImg,
        headType: "Pan Head",
        driveType: "Cross (Phillips)",
        description: "Integrated TEK drill point eliminates drilling and tapping in metal sheets.",
      },
    ],
  },
  "screws-hex-allen": {
    familyTitle: "Hex (Allen)",
    familySubtitle: "Choose by Head category",
    breadcrumbLabel: "Hex (Allen)",
    parentSlug: "fasteners",
    parentName: "Fasteners",
    headCategories: [
      {
        id: "head-socket",
        name: "Socket Head Screw",
        slug: "socket-head-screw",
        imageUrl: socketHeadImg,
        headType: "Socket Head",
        driveType: "Hex (Allen)",
        description: "High-tensile cylindrical socket head cap screw for CNC and robotics.",
      },
      {
        id: "head-button",
        name: "Button Head Screw",
        slug: "button-head-screw",
        imageUrl: buttonHeadImg,
        headType: "Button Head",
        driveType: "Hex (Allen)",
        description: "Low-profile dome button head for clean aesthetic robotic assemblies.",
      },
      {
        id: "head-allen-csk",
        name: "Allen Countersunk (CSK) Screw",
        slug: "allen-countersunk-csk-screw",
        imageUrl: allenCountersunkCskImg,
        headType: "Countersunk (CSK)",
        driveType: "Hex (Allen)",
        description: "High-torque flush-fitting countersunk hex socket screws.",
      },
    ],
  },
  "screws-flat-slotted": {
    familyTitle: "Flat (Slotted)",
    familySubtitle: "Choose by Head category",
    breadcrumbLabel: "Flat (Slotted)",
    parentSlug: "fasteners",
    parentName: "Fasteners",
    headCategories: [
      {
        id: "head-slotted-chhd",
        name: "Slotted CHHD",
        slug: "slotted-chhd",
        imageUrl: slottedChhdImg,
        headType: "CHHD (Cheese Head)",
        driveType: "Flat (Slotted)",
        description: "Cheese head machine screw with precision slotted drive for panels and clamps.",
      },
    ],
  },
  "nuts": {
    familyTitle: "Nuts",
    familySubtitle: "Choose by Nut category",
    breadcrumbLabel: "Nuts",
    parentSlug: "fasteners",
    parentName: "Fasteners",
    headCategories: [
      {
        id: "head-hex-nut",
        name: "Hex Nut",
        slug: "hex-nut",
        imageUrl: hexNutImg,
        headType: "Standard Hex",
        description: "Precision metric internal thread hex nuts for standard structural joints.",
      },
      {
        id: "head-nyloc-nut",
        name: "Nyloc Nut",
        slug: "nyloc-nut",
        imageUrl: nylocNutImg,
        headType: "Nylon Insert Lock",
        description: "Nylon insert lock nut designed to prevent loosening under heavy vibration.",
      },
      {
        id: "head-wing-nut",
        name: "Wing Nut",
        slug: "wing-nut",
        imageUrl: wingNutImg,
        headType: "Wing Head",
        description: "Ergonomic wing projections for rapid manual tightening without tools.",
      },
    ],
  },
  "washers": {
    familyTitle: "Washers",
    familySubtitle: "Choose by Washer category",
    breadcrumbLabel: "Washers",
    parentSlug: "fasteners",
    parentName: "Fasteners",
    headCategories: [
      {
        id: "head-plain-washer",
        name: "Plain Washer",
        slug: "plain-washer",
        imageUrl: plainWasherImg,
        headType: "Flat Disc",
        description: "Smooth flat washer distributes clamping force and protects surfaces.",
      },
      {
        id: "head-spring-washer",
        name: "Spring Washer",
        slug: "spring-washer",
        imageUrl: springWasherImg,
        headType: "Split Ring",
        description: "Helical split ring spring washer maintains preload against thermal cycles.",
      },
      {
        id: "head-external-serrated",
        name: "External Serrated Washer",
        slug: "external-serrated-washer",
        imageUrl: externalSerratedWasherImg,
        headType: "Serrated Star",
        description: "External radial teeth bite into joint surfaces for positive electrical ground.",
      },
    ],
  },
  "brass-inserts": {
    familyTitle: "Brass Inserts",
    familySubtitle: "Choose by Insert category",
    breadcrumbLabel: "Brass Inserts",
    parentSlug: "fasteners",
    parentName: "Fasteners",
    headCategories: [
      {
        id: "head-brass-slant",
        name: "3D Printing Brass Threaded Slant Knurled Inserts",
        slug: "3d-printing-brass-threaded-slant-knurled-inserts",
        imageUrl: brassSlantKnurledInsertImg,
        headType: "Slant Knurled",
        description: "Diagonal knurl pattern resists torque and pull-out in 3D printed thermoplastic parts.",
      },
      {
        id: "head-brass-straight",
        name: "Brass Threaded Inserts",
        slug: "brass-threaded-inserts",
        imageUrl: brassThreadedInsertImg,
        headType: "Straight / Diamond Knurled",
        description: "Precision CNC turned brass inserts for ultrasonic or heat staking.",
      },
    ],
  },
};

/**
 * Extracts available faceted filter values (diameters, lengths, materials)
 * dynamically from a list of products.
 */
export function extractScrewFilterOptions(products = []) {
  const diameters = new Set();
  const lengths = new Set();
  const materials = new Set();

  products.forEach((p) => {
    // 1. Material
    const mat = p.specs?.["Material Grade"] || p.specs?.["Material"];
    if (mat) materials.add(mat);

    // 2. Scan dimensions from variants or specs
    const dimStrings = [];
    if (p.specs?.["Dimensions"]) dimStrings.push(p.specs["Dimensions"]);
    if (p.specs?.["Thread Size"]) dimStrings.push(p.specs["Thread Size"]);
    if (p.variants && Array.isArray(p.variants)) {
      p.variants.forEach((v) => {
        if (v.dimensions) dimStrings.push(v.dimensions);
        if (v.name) dimStrings.push(v.name);
      });
    }

    dimStrings.forEach((str) => {
      // Matches M3, M4, M5, M8 or 3.5, 4.2
      const diaMatch = str.match(/\b(M\d+(?:\.\d+)?|\d+(?:\.\d+)?)\b/i);
      if (diaMatch) {
        const d = diaMatch[1].toUpperCase();
        if (d.startsWith("M") || parseFloat(d) <= 20) {
          diameters.add(d.startsWith("M") ? d : `M${d}`);
        }
      }
      // Matches length: x 10mm, x 12mm, 35x25mm, etc.
      const lenMatch = str.match(/[xX×]\s*(\d+(?:\.\d+)?)\s*(?:mm)?/i);
      if (lenMatch) {
        lengths.add(`${lenMatch[1]}mm`);
      }
    });
  });

  return {
    diameters: Array.from(diameters).sort((a, b) => {
      const numA = parseFloat(a.replace(/[^0-9.]/g, "")) || 0;
      const numB = parseFloat(b.replace(/[^0-9.]/g, "")) || 0;
      return numA - numB;
    }),
    lengths: Array.from(lengths).sort((a, b) => {
      const numA = parseFloat(a.replace(/[^0-9.]/g, "")) || 0;
      const numB = parseFloat(b.replace(/[^0-9.]/g, "")) || 0;
      return numA - numB;
    }),
    materials: Array.from(materials).sort(),
  };
}
