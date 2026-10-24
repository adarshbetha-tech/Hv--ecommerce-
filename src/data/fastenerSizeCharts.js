/**
 * VERTEX Fastener & Screw Engineering Size Charts
 * 
 * Verified technical dimensional tables conforming to international standards
 * (DIN, ISO, IS, JIS). Provides mechanical engineers, product designers, and buyers
 * with accurate diameter, pitch, head geometry, tool recess, and hole sizing specifications.
 * 
 * NOTE: Strictly applicable to fasteners, screws, nuts, washers, and brass inserts.
 * Returns null for electronic products, batteries, and controllers.
 */

export const FASTENER_SIZE_CHARTS = {
  // 1. DIN 912 / ISO 4762 — Allen Socket Head Cap Screws
  din912: {
    id: "size-chart-din912",
    title: "DIN 912 / ISO 4762 — Hexagon Socket Head Cap Screw Size Chart",
    standard: "DIN 912 / ISO 4762",
    applicableType: "Allen Socket Head Cap Screw",
    unit: "Millimeters (mm)",
    threadStandard: "ISO Metric Coarse (60° Flank Angle, 6g Tolerance)",
    materialCompatibility: "SS304 (A2-70) / SS316 (A4-80) / Grade 12.9 Alloy Steel",
    columns: [
      { key: "size", label: "Nominal Size", symbol: "d", unit: "mm" },
      { key: "pitch", label: "Thread Pitch", symbol: "P", unit: "mm" },
      { key: "headDia", label: "Head Diameter", symbol: "d_k", unit: "mm" },
      { key: "headHeight", label: "Head Height", symbol: "k", unit: "mm" },
      { key: "hexKey", label: "Hex Key Size", symbol: "s", unit: "mm" },
      { key: "tapDrill", label: "Tap Drill Size", symbol: "Ø", unit: "mm" },
      { key: "standardLengths", label: "Standard Lengths (L)", symbol: "L", unit: "mm" },
    ],
    rows: [
      { size: "M2", pitch: "0.40", headDia: "3.80", headHeight: "2.00", hexKey: "1.5", tapDrill: "1.60", standardLengths: "4, 6, 8, 10, 12, 16, 20" },
      { size: "M2.5", pitch: "0.45", headDia: "4.50", headHeight: "2.50", hexKey: "2.0", tapDrill: "2.05", standardLengths: "5, 6, 8, 10, 12, 16, 20, 25" },
      { size: "M3", pitch: "0.50", headDia: "5.50", headHeight: "3.00", hexKey: "2.5", tapDrill: "2.50", standardLengths: "6, 8, 10, 12, 16, 20, 25, 30" },
      { size: "M4", pitch: "0.70", headDia: "7.00", headHeight: "4.00", hexKey: "3.0", tapDrill: "3.30", standardLengths: "8, 10, 12, 16, 20, 25, 30, 40" },
      { size: "M5", pitch: "0.80", headDia: "8.50", headHeight: "5.00", hexKey: "4.0", tapDrill: "4.20", standardLengths: "10, 12, 16, 20, 25, 30, 40, 50" },
      { size: "M6", pitch: "1.00", headDia: "10.00", headHeight: "6.00", hexKey: "5.0", tapDrill: "5.00", standardLengths: "12, 16, 20, 25, 30, 40, 50, 60" },
      { size: "M8", pitch: "1.25", headDia: "13.00", headHeight: "8.00", hexKey: "6.0", tapDrill: "6.80", standardLengths: "16, 20, 25, 30, 40, 50, 65, 80" },
      { size: "M10", pitch: "1.50", headDia: "16.00", headHeight: "10.00", hexKey: "8.0", tapDrill: "8.50", standardLengths: "20, 25, 30, 40, 50, 65, 80, 100" },
    ],
    notes: [
      "Head diameter (d_k) and height (k) manufactured to DIN 912 / ISO 4762 standard tolerance.",
      "Hex socket drive (s) accepts standard metric L-wrenches, ball-end hex keys, and torque bits.",
      "Metric coarse threads conform to ISO 261 / ISO 965 general engineering pitch standards.",
    ],
  },

  // 2. ISO 7380 — Button Head Socket Cap Screws
  iso7380: {
    id: "size-chart-iso7380",
    title: "ISO 7380 — Button Head Socket Cap Screw Size Chart",
    standard: "ISO 7380 / ASME B18.3.4M",
    applicableType: "Button Head Socket Cap Screw",
    unit: "Millimeters (mm)",
    threadStandard: "ISO Metric Coarse (6g Tolerance)",
    materialCompatibility: "SS304 (A2) / SS316 Marine Grade",
    columns: [
      { key: "size", label: "Nominal Size", symbol: "d", unit: "mm" },
      { key: "pitch", label: "Thread Pitch", symbol: "P", unit: "mm" },
      { key: "headDia", label: "Head Diameter", symbol: "d_k", unit: "mm" },
      { key: "headHeight", label: "Dome Height", symbol: "k", unit: "mm" },
      { key: "hexKey", label: "Hex Key Size", symbol: "s", unit: "mm" },
      { key: "standardLengths", label: "Available Lengths (L)", symbol: "L", unit: "mm" },
    ],
    rows: [
      { size: "M3", pitch: "0.50", headDia: "5.70", headHeight: "1.65", hexKey: "2.0", standardLengths: "6, 8, 10, 12, 16, 20, 25" },
      { size: "M4", pitch: "0.70", headDia: "7.60", headHeight: "2.20", hexKey: "2.5", standardLengths: "8, 10, 12, 16, 20, 25, 30" },
      { size: "M5", pitch: "0.80", headDia: "9.50", headHeight: "2.75", hexKey: "3.0", standardLengths: "10, 12, 16, 20, 25, 30, 35" },
      { size: "M6", pitch: "1.00", headDia: "10.50", headHeight: "3.30", hexKey: "4.0", standardLengths: "10, 12, 16, 20, 25, 30, 40" },
      { size: "M8", pitch: "1.25", headDia: "14.00", headHeight: "4.40", hexKey: "5.0", standardLengths: "12, 16, 20, 25, 30, 40, 50" },
    ],
    notes: [
      "Low-profile rounded dome distributes clamping load without sharp head edges.",
      "Engineered for robotics, consumer product shells, drone frames, and slim enclosures.",
    ],
  },

  // 3. DIN 7991 / ISO 10642 — Socket Countersunk CSK Screws
  din7991: {
    id: "size-chart-din7991",
    title: "DIN 7991 / ISO 10642 — Countersunk (CSK) Socket Screw Size Chart",
    standard: "DIN 7991 / ISO 10642",
    applicableType: "Socket Countersunk CSK Head Screw",
    unit: "Millimeters (mm)",
    threadStandard: "ISO Metric Coarse (6g)",
    materialCompatibility: "SS304 / SS316 Stainless Steel",
    columns: [
      { key: "size", label: "Nominal Size", symbol: "d", unit: "mm" },
      { key: "pitch", label: "Thread Pitch", symbol: "P", unit: "mm" },
      { key: "headDia", label: "Max Head Dia", symbol: "d_k", unit: "mm" },
      { key: "headHeight", label: "Countersunk Depth", symbol: "k", unit: "mm" },
      { key: "cskAngle", label: "CSK Angle", symbol: "α", unit: "deg" },
      { key: "hexKey", label: "Hex Key Size", symbol: "s", unit: "mm" },
      { key: "standardLengths", label: "Total Length (L)", symbol: "L", unit: "mm" },
    ],
    rows: [
      { size: "M3", pitch: "0.50", headDia: "6.00", headHeight: "1.70", cskAngle: "90°", hexKey: "2.0", standardLengths: "6, 8, 10, 12, 16, 20, 25" },
      { size: "M4", pitch: "0.70", headDia: "8.00", headHeight: "2.30", cskAngle: "90°", hexKey: "2.5", standardLengths: "8, 10, 12, 16, 20, 25, 30" },
      { size: "M5", pitch: "0.80", headDia: "10.00", headHeight: "2.80", cskAngle: "90°", hexKey: "3.0", standardLengths: "10, 12, 16, 20, 25, 30, 40" },
      { size: "M6", pitch: "1.00", headDia: "12.00", headHeight: "3.30", cskAngle: "90°", hexKey: "4.0", standardLengths: "12, 16, 20, 25, 30, 40, 50" },
      { size: "M8", pitch: "1.25", headDia: "16.00", headHeight: "4.40", cskAngle: "90°", hexKey: "5.0", standardLengths: "16, 20, 25, 30, 40, 50, 60" },
    ],
    notes: [
      "Total nominal length (L) is measured from the top surface of the head to the end of the tip.",
      "Standard 90° countersink recess enables 100% flush installation with panel surfaces.",
    ],
  },

  // 4. DIN 7985 / ISO 7045 — Cross (Phillips) Pan Head Screws
  din7985: {
    id: "size-chart-din7985",
    title: "DIN 7985 / ISO 7045 — Phillips Pan Head Machine Screw Size Chart",
    standard: "DIN 7985 / ISO 7045",
    applicableType: "Phillips Pan Head Screw",
    unit: "Millimeters (mm)",
    threadStandard: "Metric Machine Thread (6g Tolerance)",
    materialCompatibility: "SS304 Precision Steel / Zinc Plated Carbon Steel",
    columns: [
      { key: "size", label: "Nominal Size", symbol: "d", unit: "mm" },
      { key: "pitch", label: "Thread Pitch", symbol: "P", unit: "mm" },
      { key: "headDia", label: "Head Diameter", symbol: "d_k", unit: "mm" },
      { key: "headHeight", label: "Head Height", symbol: "k", unit: "mm" },
      { key: "driverBit", label: "Phillips Bit", symbol: "PH", unit: "#" },
      { key: "standardLengths", label: "Available Lengths (L)", symbol: "L", unit: "mm" },
    ],
    rows: [
      { size: "M2", pitch: "0.40", headDia: "4.00", headHeight: "1.60", driverBit: "PH1", standardLengths: "4, 6, 8, 10, 12, 16" },
      { size: "M2.5", pitch: "0.45", headDia: "5.00", headHeight: "2.00", driverBit: "PH1", standardLengths: "5, 6, 8, 10, 12, 16, 20" },
      { size: "M3", pitch: "0.50", headDia: "6.00", headHeight: "2.40", driverBit: "PH1", standardLengths: "6, 8, 10, 12, 16, 20, 25, 30" },
      { size: "M4", pitch: "0.70", headDia: "8.00", headHeight: "3.10", driverBit: "PH2", standardLengths: "8, 10, 12, 16, 20, 25, 30, 40" },
      { size: "M5", pitch: "0.80", headDia: "10.00", headHeight: "3.80", driverBit: "PH2", standardLengths: "10, 12, 16, 20, 25, 30, 40, 50" },
      { size: "M6", pitch: "1.00", headDia: "12.00", headHeight: "4.60", driverBit: "PH3", standardLengths: "12, 16, 20, 25, 30, 40, 50" },
    ],
    notes: [
      "Engineered cross recess provides secure engagement with standard manual and electric Phillips drivers.",
      "Pan profile provides ample bearing surface area preventing thin sheet deformation.",
    ],
  },

  // 5. DIN 965 / ISO 7046 — Phillips Countersunk (CSK) Screws
  din965: {
    id: "size-chart-din965",
    title: "DIN 965 / ISO 7046 — Phillips Countersunk (CSK) Machine Screw Size Chart",
    standard: "DIN 965 / ISO 7046",
    applicableType: "Phillips Countersunk (CSK) Screw",
    unit: "Millimeters (mm)",
    threadStandard: "Metric Machine Thread",
    materialCompatibility: "SS304 Austenitic Stainless Steel",
    columns: [
      { key: "size", label: "Nominal Size", symbol: "d", unit: "mm" },
      { key: "pitch", label: "Thread Pitch", symbol: "P", unit: "mm" },
      { key: "headDia", label: "Max Head Dia", symbol: "d_k", unit: "mm" },
      { key: "headHeight", label: "Head Height", symbol: "k", unit: "mm" },
      { key: "driverBit", label: "Phillips Bit", symbol: "PH", unit: "#" },
      { key: "standardLengths", label: "Total Length (L)", symbol: "L", unit: "mm" },
    ],
    rows: [
      { size: "M2", pitch: "0.40", headDia: "3.80", headHeight: "1.20", driverBit: "PH1", standardLengths: "4, 6, 8, 10, 12" },
      { size: "M2.5", pitch: "0.45", headDia: "4.70", headHeight: "1.50", driverBit: "PH1", standardLengths: "5, 6, 8, 10, 12, 16" },
      { size: "M3", pitch: "0.50", headDia: "5.60", headHeight: "1.65", driverBit: "PH1", standardLengths: "6, 8, 10, 12, 16, 20, 25" },
      { size: "M4", pitch: "0.70", headDia: "7.50", headHeight: "2.20", driverBit: "PH2", standardLengths: "8, 10, 12, 16, 20, 25, 30" },
      { size: "M5", pitch: "0.80", headDia: "9.20", headHeight: "2.50", driverBit: "PH2", standardLengths: "10, 12, 16, 20, 25, 30, 40" },
      { size: "M6", pitch: "1.00", headDia: "11.00", headHeight: "3.00", driverBit: "PH3", standardLengths: "12, 16, 20, 25, 30, 40, 50" },
    ],
    notes: [
      "90° countersunk cone angle for flush panel installation.",
      "Length is measured including the entire head.",
    ],
  },

  // 6. IS / ISO — Slotted Cheese Head (CHHD) Screws
  slottedChhd: {
    id: "size-chart-slotted-chhd",
    title: "IS / ISO — Slotted Cheese Head (CHHD) Machine Screw Size Chart",
    standard: "IS / ISO Metric Standard",
    applicableType: "Slotted CHHD Screw",
    unit: "Millimeters (mm)",
    threadStandard: "Metric ISO Pitch",
    materialCompatibility: "SS304 Precision Stainless Steel",
    columns: [
      { key: "size", label: "Nominal Size", symbol: "d", unit: "mm" },
      { key: "pitch", label: "Thread Pitch", symbol: "P", unit: "mm" },
      { key: "headDia", label: "Head Diameter", symbol: "d_k", unit: "mm" },
      { key: "headHeight", label: "Head Height", symbol: "k", unit: "mm" },
      { key: "slotWidth", label: "Slot Width", symbol: "n", unit: "mm" },
      { key: "standardLengths", label: "Available Lengths (L)", symbol: "L", unit: "mm" },
    ],
    rows: [
      { size: "M2", pitch: "0.40", headDia: "3.80", headHeight: "1.30", slotWidth: "0.50", standardLengths: "4, 6, 8, 10, 12" },
      { size: "M2.5", pitch: "0.45", headDia: "4.50", headHeight: "1.60", slotWidth: "0.60", standardLengths: "5, 6, 8, 10, 12, 16" },
      { size: "M3", pitch: "0.50", headDia: "5.50", headHeight: "2.00", slotWidth: "0.80", standardLengths: "6, 8, 10, 12, 16, 20, 25" },
      { size: "M4", pitch: "0.70", headDia: "7.00", headHeight: "2.60", slotWidth: "1.00", standardLengths: "8, 10, 12, 16, 20, 25, 30" },
      { size: "M5", pitch: "0.80", headDia: "8.50", headHeight: "3.30", slotWidth: "1.20", standardLengths: "10, 12, 16, 20, 25, 30, 40" },
    ],
    notes: [
      "Cheese Head (CHHD) provides high cylindrical side walls allowing recessed clamping in counterbored holes.",
      "Traditional slotted drive engineered for electrical panels, junction terminal blocks, and instrument enclosures.",
    ],
  },

  // 7. DIN 7981 / DIN 7982 — Self-Tapping Screws
  selfTapping: {
    id: "size-chart-self-tapping",
    title: "DIN 7981 / DIN 7982 — Self-Tapping Sheet Metal & Plastic Screw Size Chart",
    standard: "DIN 7981 (Pan) / DIN 7982 (CSK)",
    applicableType: "Self-Tapping Screws",
    unit: "Millimeters (mm) & Gauge #",
    threadStandard: "Type AB Self-Tapping Thread",
    materialCompatibility: "Zinc-Plated Case Hardened Carbon Steel / SS304",
    columns: [
      { key: "gauge", label: "Gauge / Metric Size", symbol: "d", unit: "mm" },
      { key: "coreDia", label: "Core Root Dia", symbol: "d_1", unit: "mm" },
      { key: "pilotHolePlastic", label: "Pilot Hole (Plastic)", symbol: "Ø", unit: "mm" },
      { key: "pilotHoleMetal", label: "Pilot Hole (Sheet Metal)", symbol: "Ø", unit: "mm" },
      { key: "headDia", label: "Pan Head Dia", symbol: "d_k", unit: "mm" },
      { key: "lengths", label: "Standard Lengths", symbol: "L", unit: "mm" },
    ],
    rows: [
      { gauge: "#2 (2.2mm)", coreDia: "1.60", pilotHolePlastic: "1.80", pilotHoleMetal: "1.90", headDia: "4.20", lengths: "6.5, 9.5, 13" },
      { gauge: "#4 (2.9mm)", coreDia: "2.10", pilotHolePlastic: "2.40", pilotHoleMetal: "2.50", headDia: "5.60", lengths: "9.5, 13, 16, 19" },
      { gauge: "#6 (3.5mm)", coreDia: "2.60", pilotHolePlastic: "2.80", pilotHoleMetal: "3.00", headDia: "6.90", lengths: "9.5, 13, 16, 19, 25" },
      { gauge: "#8 (4.2mm)", coreDia: "3.10", pilotHolePlastic: "3.40", pilotHoleMetal: "3.60", headDia: "8.20", lengths: "13, 16, 19, 25, 32" },
      { gauge: "#10 (4.8mm)", coreDia: "3.50", pilotHolePlastic: "3.90", pilotHoleMetal: "4.10", headDia: "9.50", lengths: "13, 16, 19, 25, 38, 50" },
    ],
    notes: [
      "Hardened gimlet point displaces mating material to form internal female threads without pre-tapping.",
      "Pilot hole recommendations depend on substrate hardness (ABS, Polycarbonate, Sheet Aluminum).",
    ],
  },

  // 8. DIN 934 / ISO 4032 — Metric Hex Nuts
  din934: {
    id: "size-chart-din934",
    title: "DIN 934 / ISO 4032 — Standard Metric Hexagon Full Nut Size Chart",
    standard: "DIN 934 / ISO 4032",
    applicableType: "Hex Nut",
    unit: "Millimeters (mm)",
    threadStandard: "Metric Coarse (6H Tolerance)",
    materialCompatibility: "SS304 Stainless Steel / Grade 8 Steel",
    columns: [
      { key: "size", label: "Nominal Thread", symbol: "d", unit: "mm" },
      { key: "pitch", label: "Thread Pitch", symbol: "P", unit: "mm" },
      { key: "wrenchSize", label: "Width Across Flats", symbol: "s", unit: "mm" },
      { key: "cornerDia", label: "Width Across Corners", symbol: "e", unit: "mm" },
      { key: "thickness", label: "Nut Thickness", symbol: "m", unit: "mm" },
      { key: "proofLoad", label: "Proof Load Rating", symbol: "kN", unit: "kN" },
    ],
    rows: [
      { size: "M2", pitch: "0.40", wrenchSize: "4.00", cornerDia: "4.32", thickness: "1.60", proofLoad: "1.4" },
      { size: "M2.5", pitch: "0.45", wrenchSize: "5.00", cornerDia: "5.45", thickness: "2.00", proofLoad: "2.3" },
      { size: "M3", pitch: "0.50", wrenchSize: "5.50", cornerDia: "6.01", thickness: "2.40", proofLoad: "3.5" },
      { size: "M4", pitch: "0.70", wrenchSize: "7.00", cornerDia: "7.66", thickness: "3.20", proofLoad: "6.1" },
      { size: "M5", pitch: "0.80", wrenchSize: "8.00", cornerDia: "8.79", thickness: "4.00", proofLoad: "9.9" },
      { size: "M6", pitch: "1.00", wrenchSize: "10.00", cornerDia: "11.05", thickness: "5.00", proofLoad: "14.1" },
      { size: "M8", pitch: "1.25", wrenchSize: "13.00", cornerDia: "14.38", thickness: "6.50", proofLoad: "25.6" },
      { size: "M10", pitch: "1.50", wrenchSize: "17.00", cornerDia: "18.90", thickness: "8.00", proofLoad: "40.6" },
    ],
    notes: [
      "Standard metric hexagon nut profile for general engineering, structural brackets, and machinery.",
      "Matches bolt pitch classes DIN 912, DIN 933, and DIN 7985.",
    ],
  },

  // 9. DIN 985 — Nyloc Prevailing Torque Lock Nuts
  din985: {
    id: "size-chart-din985",
    title: "DIN 985 — Nylon Insert Prevailing Torque Lock Nut Size Chart",
    standard: "DIN 985 / ISO 10511",
    applicableType: "Nyloc Nut",
    unit: "Millimeters (mm)",
    threadStandard: "Metric Coarse with Polymer Locking Collar",
    materialCompatibility: "SS304 Body + Polyamide PA6.6 Collar",
    columns: [
      { key: "size", label: "Nominal Thread", symbol: "d", unit: "mm" },
      { key: "pitch", label: "Thread Pitch", symbol: "P", unit: "mm" },
      { key: "wrenchSize", label: "Wrench Across Flats", symbol: "s", unit: "mm" },
      { key: "totalHeight", label: "Total Height", symbol: "h", unit: "mm" },
      { key: "metalHeight", label: "Wrenching Height", symbol: "m", unit: "mm" },
    ],
    rows: [
      { size: "M3", pitch: "0.50", wrenchSize: "5.50", totalHeight: "4.00", metalHeight: "2.40" },
      { size: "M4", pitch: "0.70", wrenchSize: "7.00", totalHeight: "5.00", metalHeight: "2.90" },
      { size: "M5", pitch: "0.80", wrenchSize: "8.00", totalHeight: "5.00", metalHeight: "3.20" },
      { size: "M6", pitch: "1.00", wrenchSize: "10.00", totalHeight: "6.00", metalHeight: "4.00" },
      { size: "M8", pitch: "1.25", wrenchSize: "13.00", totalHeight: "8.00", metalHeight: "5.50" },
      { size: "M10", pitch: "1.50", wrenchSize: "17.00", totalHeight: "10.00", metalHeight: "6.50" },
    ],
    notes: [
      "Elastic nylon ring friction-locks against bolt threads to withstand extreme vibration and thermal cycling.",
      "Eliminates the requirement for lock washers or chemical thread-locking compounds.",
    ],
  },

  // 10. DIN 315 — Wing Nuts
  din315: {
    id: "size-chart-din315",
    title: "DIN 315 — Butterfly Wing Nut Size Chart",
    standard: "DIN 315 (German Form)",
    applicableType: "Wing Nut",
    unit: "Millimeters (mm)",
    threadStandard: "Metric Coarse Thread",
    materialCompatibility: "Forged SS304 Stainless Steel",
    columns: [
      { key: "size", label: "Nominal Thread", symbol: "d", unit: "mm" },
      { key: "pitch", label: "Thread Pitch", symbol: "P", unit: "mm" },
      { key: "wingSpan", label: "Wing Span Width", symbol: "e", unit: "mm" },
      { key: "totalHeight", label: "Total Height", symbol: "h", unit: "mm" },
      { key: "baseDia", label: "Collar Base Dia", symbol: "d_2", unit: "mm" },
    ],
    rows: [
      { size: "M4", pitch: "0.70", wingSpan: "20.00", totalHeight: "10.50", baseDia: "8.00" },
      { size: "M5", pitch: "0.80", wingSpan: "26.00", totalHeight: "13.00", baseDia: "11.00" },
      { size: "M6", pitch: "1.00", wingSpan: "33.00", totalHeight: "17.00", baseDia: "13.00" },
      { size: "M8", pitch: "1.25", wingSpan: "39.00", totalHeight: "20.00", baseDia: "16.00" },
      { size: "M10", pitch: "1.50", wingSpan: "51.00", totalHeight: "25.00", baseDia: "20.00" },
    ],
    notes: [
      "Forged dual wings enable toolless manual assembly, rapid field adjustment, and frequent disassembly.",
    ],
  },

  // 11. DIN 125A — Plain Washers
  din125a: {
    id: "size-chart-din125a",
    title: "DIN 125A / ISO 7089 — Metric Plain Flat Washer Size Chart",
    standard: "DIN 125A / ISO 7089",
    applicableType: "Plain Washer",
    unit: "Millimeters (mm)",
    materialCompatibility: "SS304 Stainless Steel",
    columns: [
      { key: "boltSize", label: "For Bolt Size", symbol: "M", unit: "" },
      { key: "innerDia", label: "Inside Diameter", symbol: "d_1", unit: "mm" },
      { key: "outerDia", label: "Outside Diameter", symbol: "d_2", unit: "mm" },
      { key: "thickness", label: "Thickness", symbol: "s", unit: "mm" },
    ],
    rows: [
      { boltSize: "M2", innerDia: "2.20", outerDia: "5.00", thickness: "0.30" },
      { boltSize: "M2.5", innerDia: "2.70", outerDia: "6.00", thickness: "0.50" },
      { boltSize: "M3", innerDia: "3.20", outerDia: "7.00", thickness: "0.50" },
      { boltSize: "M4", innerDia: "4.30", outerDia: "9.00", thickness: "0.80" },
      { boltSize: "M5", innerDia: "5.30", outerDia: "10.00", thickness: "1.00" },
      { boltSize: "M6", innerDia: "6.40", outerDia: "12.00", thickness: "1.60" },
      { boltSize: "M8", innerDia: "8.40", outerDia: "16.00", thickness: "1.60" },
      { boltSize: "M10", innerDia: "10.50", outerDia: "20.00", thickness: "2.00" },
    ],
    notes: [
      "Distributes bolt clamping forces over a wider surface to prevent substrate indentation.",
    ],
  },

  // 12. DIN 127B — Spring Washers
  din127b: {
    id: "size-chart-din127b",
    title: "DIN 127B — Helical Split Spring Lock Washer Size Chart",
    standard: "DIN 127B",
    applicableType: "Spring Washer",
    unit: "Millimeters (mm)",
    materialCompatibility: "Spring-Tempered SS304 Stainless Steel",
    columns: [
      { key: "boltSize", label: "For Bolt Size", symbol: "M", unit: "" },
      { key: "innerDia", label: "Inside Diameter", symbol: "d_1", unit: "mm" },
      { key: "outerDia", label: "Outside Diameter", symbol: "d_2", unit: "mm" },
      { key: "thickness", label: "Thickness", symbol: "s", unit: "mm" },
    ],
    rows: [
      { boltSize: "M3", innerDia: "3.10", outerDia: "6.20", thickness: "0.80" },
      { boltSize: "M4", innerDia: "4.10", outerDia: "7.60", thickness: "0.90" },
      { boltSize: "M5", innerDia: "5.10", outerDia: "9.20", thickness: "1.20" },
      { boltSize: "M6", innerDia: "6.10", outerDia: "11.80", thickness: "1.60" },
      { boltSize: "M8", innerDia: "8.10", outerDia: "14.80", thickness: "2.00" },
      { boltSize: "M10", innerDia: "10.20", outerDia: "18.10", thickness: "2.20" },
    ],
    notes: [
      "Split helical spring profile exerts continuous axial tension resisting dynamic vibrational loosening.",
    ],
  },

  // 13. DIN 6798A — External Serrated Washers
  din6798a: {
    id: "size-chart-din6798a",
    title: "DIN 6798A — External Serrated Tooth Lock Washer Size Chart",
    standard: "DIN 6798A",
    applicableType: "External Serrated Washer",
    unit: "Millimeters (mm)",
    materialCompatibility: "High-Hardness Stainless Steel",
    columns: [
      { key: "boltSize", label: "For Bolt Size", symbol: "M", unit: "" },
      { key: "innerDia", label: "Inside Diameter", symbol: "d_1", unit: "mm" },
      { key: "outerDia", label: "Outside Diameter", symbol: "d_2", unit: "mm" },
      { key: "thickness", label: "Thickness", symbol: "s", unit: "mm" },
    ],
    rows: [
      { boltSize: "M3", innerDia: "3.20", outerDia: "6.00", thickness: "0.45" },
      { boltSize: "M4", innerDia: "4.30", outerDia: "8.00", thickness: "0.55" },
      { boltSize: "M5", innerDia: "5.30", outerDia: "10.00", thickness: "0.60" },
      { boltSize: "M6", innerDia: "6.40", outerDia: "11.00", thickness: "0.70" },
      { boltSize: "M8", innerDia: "8.40", outerDia: "15.00", thickness: "0.80" },
    ],
    notes: [
      "Serrated teeth bite into mating metal surfaces, establishing both anti-vibration lock and electrical earthing bonding.",
    ],
  },

  // 14. Brass Threaded Inserts for 3D Printing & Injection Molding
  brassInserts: {
    id: "size-chart-brass-inserts",
    title: "Heat-Set Brass Threaded Inserts for 3D Printing & Plastics Size Chart",
    standard: "ISO Metric Internal Threads / Dual Slant Knurl",
    applicableType: "Brass Threaded Inserts",
    unit: "Millimeters (mm)",
    materialCompatibility: "Machined C3604 High-Thermal-Conductivity Brass",
    columns: [
      { key: "threadSize", label: "Internal Thread", symbol: "M", unit: "mm" },
      { key: "outerDia", label: "Outer Diameter", symbol: "D", unit: "mm" },
      { key: "length", label: "Insert Length", symbol: "L", unit: "mm" },
      { key: "holeDiaPLA", label: "Rec. Hole (PLA/PETG)", symbol: "Ø", unit: "mm" },
      { key: "holeDiaABS", label: "Rec. Hole (ABS/Nylon)", symbol: "Ø", unit: "mm" },
    ],
    rows: [
      { threadSize: "M2", outerDia: "3.20", length: "3.00", holeDiaPLA: "3.00", holeDiaABS: "3.05" },
      { threadSize: "M2.5", outerDia: "3.60", length: "4.00", holeDiaPLA: "3.30", holeDiaABS: "3.35" },
      { threadSize: "M3 (Short)", outerDia: "4.20", length: "4.00", holeDiaPLA: "4.00", holeDiaABS: "4.00" },
      { threadSize: "M3 (Standard)", outerDia: "4.60", length: "5.00", holeDiaPLA: "4.20", holeDiaABS: "4.25" },
      { threadSize: "M4", outerDia: "6.00", length: "6.00", holeDiaPLA: "5.60", holeDiaABS: "5.65" },
      { threadSize: "M5", outerDia: "7.00", length: "8.00", holeDiaPLA: "6.50", holeDiaABS: "6.55" },
    ],
    notes: [
      "Opposed slant knurls provide high rotational torque retention and axial pull-out resistance.",
      "Install using soldering iron heated tip at 220°C–260°C depending on thermoplastic filament.",
    ],
  },
};

/**
 * Returns the matching authentic size chart for a given product object.
 * Strictly returns null for electronic items, batteries, tools, or products where
 * a screw/fastener size chart is irrelevant.
 */
export function getSizeChartForProduct(product) {
  if (!product) return null;

  const slug = (product.slug || "").toLowerCase();
  const subcat = (product.subcategory?.slug || "").toLowerCase();
  const cat = (product.category?.slug || product.categoryId || "").toLowerCase();

  // Guard: Absolutely NO size chart for electronic products, batteries, or tools
  if (
    cat.includes("elect") ||
    cat.includes("tool") ||
    cat.includes("auto") ||
    subcat.includes("elect") ||
    subcat.includes("lithium") ||
    subcat.includes("hvnex")
  ) {
    return null;
  }

  // 1. Allen Socket Cap Screws
  if (slug.includes("socket-head") || slug.includes("socket-cap") || slug.includes("hex-allen")) {
    return FASTENER_SIZE_CHARTS.din912;
  }
  // 2. Button Head Socket Screws
  if (slug.includes("button-head")) {
    return FASTENER_SIZE_CHARTS.iso7380;
  }
  // 3. Socket Countersunk Screws
  if (slug.includes("socket-countersunk") || slug.includes("allen-countersunk")) {
    return FASTENER_SIZE_CHARTS.din7991;
  }
  // 4. Phillips Pan Head Screws
  if (slug.includes("pan-head") && !slug.includes("tapping")) {
    return FASTENER_SIZE_CHARTS.din7985;
  }
  // 5. Phillips Countersunk Screws
  if (slug.includes("countersunk") && !slug.includes("tapping") && !slug.includes("socket")) {
    return FASTENER_SIZE_CHARTS.din965;
  }
  // 6. Slotted Cheese Head Screws
  if (slug.includes("slotted") || slug.includes("chhd")) {
    return FASTENER_SIZE_CHARTS.slottedChhd;
  }
  // 7. Self-Tapping Screws
  if (slug.includes("self-tapping") || slug.includes("self-drilling")) {
    return FASTENER_SIZE_CHARTS.selfTapping;
  }
  // 8. Other Cross screws (Truss, Raised Cheese, Collar)
  if (slug.includes("truss") || slug.includes("raised-cheese") || slug.includes("collar")) {
    return FASTENER_SIZE_CHARTS.din7985;
  }
  // 9. Hex Nuts
  if (slug.includes("hex-nut") || slug.includes("flanged-hex-nut")) {
    return FASTENER_SIZE_CHARTS.din934;
  }
  // 10. Nyloc Nuts
  if (slug.includes("nyloc")) {
    return FASTENER_SIZE_CHARTS.din985;
  }
  // 11. Wing Nuts
  if (slug.includes("wing-nut")) {
    return FASTENER_SIZE_CHARTS.din315;
  }
  // 12. Plain Washers
  if (slug.includes("plain-washer")) {
    return FASTENER_SIZE_CHARTS.din125a;
  }
  // 13. Spring Washers
  if (slug.includes("spring-washer")) {
    return FASTENER_SIZE_CHARTS.din127b;
  }
  // 14. Serrated Washers
  if (slug.includes("serrated-washer")) {
    return FASTENER_SIZE_CHARTS.din6798a;
  }
  // 15. Brass Inserts
  if (slug.includes("brass") || slug.includes("insert") || slug.includes("knurled")) {
    return FASTENER_SIZE_CHARTS.brassInserts;
  }

  // Fallback for generic screw subcategories
  if (subcat === "screws-hex-allen") return FASTENER_SIZE_CHARTS.din912;
  if (subcat === "screws-cross-phillips") return FASTENER_SIZE_CHARTS.din7985;
  if (subcat === "screws-flat-slotted") return FASTENER_SIZE_CHARTS.slottedChhd;
  if (subcat === "nuts") return FASTENER_SIZE_CHARTS.din934;
  if (subcat === "washers") return FASTENER_SIZE_CHARTS.din125a;
  if (subcat === "brass-inserts") return FASTENER_SIZE_CHARTS.brassInserts;

  return null;
}
