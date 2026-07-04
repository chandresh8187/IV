import RNFS from 'react-native-fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Buffer } from 'buffer';

import { openPdfFile } from '../native/PdfOpener';

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 30,
};

const A4_PORTRAIT = [PAGE.width, PAGE.height];

// Zinc density (ISO 1461): a 1 micron layer over 1 m² weighs ~7.14 g.
const ZINC_DENSITY_G_PER_M2_PER_MICRON = 7.14;

const COLORS = {
  navy: rgb(0.086, 0.114, 0.235),
  amber: rgb(0.788, 0.6, 0.098),
  white: rgb(1, 1, 1),
  bgPanel: rgb(0.964, 0.968, 0.976),
  rowAlt: rgb(0.953, 0.958, 0.968),
  border: rgb(0.78, 0.8, 0.85),
  borderStrong: rgb(0.55, 0.58, 0.65),
  text: rgb(0.12, 0.13, 0.18),
  textMuted: rgb(0.4, 0.43, 0.49),
  headerText: rgb(0.93, 0.94, 0.97),
  success: rgb(0.11, 0.45, 0.28),
};

/* -------------------------------------------------------------------------- */
/* TEXT HELPERS (same conventions as productionPdfGenerator.js)              */
/* -------------------------------------------------------------------------- */
const cleanPdfText = value => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value)
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const safeValue = value =>
  value !== null && value !== undefined && value !== '' ? value : '-';

const toNumber = value => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const drawText = (page, text, x, y, options = {}) => {
  page.drawText(cleanPdfText(text), {
    x,
    y,
    size: options.size || 8,
    font: options.font,
    color: options.color || COLORS.text,
    maxWidth: options.maxWidth,
  });
};

const drawCenteredText = (page, text, x, y, width, height, options = {}) => {
  const value = cleanPdfText(text);
  const font = options.font;
  const size = options.size || 8;
  const textWidth = font.widthOfTextAtSize(value, size);

  page.drawText(value, {
    x: x + Math.max(2, (width - textWidth) / 2),
    y: y + (height - size) / 2 + 1,
    size,
    font,
    color: options.color || COLORS.text,
  });
};

const drawWrappedText = (page, text, x, y, options = {}) => {
  const maxCharsPerLine = options.maxCharsPerLine || 22;
  const maxLines = options.maxLines || 3;
  const words = cleanPdfText(text).split(' ');
  const lines = [];
  let line = '';

  words.forEach(word => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxCharsPerLine) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((textLine, index) => {
    page.drawText(textLine, {
      x,
      y: y - index * (options.lineHeight || 8),
      size: options.size || 6,
      font: options.font,
      color: options.color || COLORS.text,
    });
  });

  return Math.min(lines.length, maxLines);
};

const drawRect = (page, x, y, width, height, options = {}) => {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: options.bg || COLORS.white,
    borderColor: options.borderColor || COLORS.border,
    borderWidth: options.borderWidth ?? 0.6,
  });
};

/* -------------------------------------------------------------------------- */
/* HEADER                                                                    */
/* -------------------------------------------------------------------------- */
const drawHeader = (page, fonts) => {
  page.drawRectangle({
    x: 0,
    y: PAGE.height - 70,
    width: PAGE.width,
    height: 70,
    color: COLORS.navy,
  });

  page.drawRectangle({
    x: 0,
    y: PAGE.height - 73,
    width: PAGE.width,
    height: 3,
    color: COLORS.amber,
  });

  drawRect(page, PAGE.margin, PAGE.height - 58, 36, 36, {
    bg: rgb(0.204, 0.396, 0.612),
    borderColor: COLORS.amber,
    borderWidth: 1,
  });
  drawCenteredText(page, 'IV', PAGE.margin, PAGE.height - 58, 36, 36, {
    font: fonts.bold,
    size: 15,
    color: COLORS.white,
  });

  drawText(
    page,
    'IV SQUARE STRUCTURE INDIA PVT LTD',
    PAGE.margin + 46,
    PAGE.height - 28,
    { size: 13, font: fonts.bold, color: COLORS.white },
  );

  drawText(
    page,
    'Survey No. 171, Plot No 9, Veraval Rajkot, Rajkot, Gujarat, 360024',
    PAGE.margin + 46,
    PAGE.height - 41,
    { size: 7, font: fonts.regular, color: COLORS.headerText },
  );

  drawText(
    page,
    'GALVANIZING COATING TEST CERTIFICATE',
    PAGE.margin + 46,
    PAGE.height - 55,
    { size: 8, font: fonts.bold, color: COLORS.amber },
  );
};

/* -------------------------------------------------------------------------- */
/* CERTIFICATE INFO BLOCK (TC No / Client / Invoice / Reference Standard...) */
/* -------------------------------------------------------------------------- */
const drawInfoBlock = (page, fonts, certificate, startY) => {
  const rowHeight = 16;
  const labelWidth = 140;
  const width = PAGE.width - PAGE.margin * 2;
  let y = startY;

  const rows = [
    ['TC No.', certificate.tc_no],
    ['Date of Inspection', certificate.inspection_date],
    ['Supplier', 'IV SQUARE STRUCTURE INDIA PVT LTD'],
    ['Client Name', certificate.party_name],
    ['Address', certificate.client_address || '-'],
    ['Third Party Name', certificate.third_party_name || '-'],
    ['Structure', certificate.structure],
    ['Invoice No.', certificate.challan_no],
    ['Quantity', certificate.quantity],
    ['Reference Standard', certificate.reference_standard],
  ];

  rows.forEach(([label, value], index) => {
    const bg = index % 2 === 0 ? COLORS.white : COLORS.rowAlt;

    drawRect(page, PAGE.margin, y, labelWidth, rowHeight, { bg });
    drawRect(page, PAGE.margin + labelWidth, y, width - labelWidth, rowHeight, {
      bg,
    });

    drawText(page, label, PAGE.margin + 6, y + 5, {
      size: 7.2,
      font: fonts.bold,
      color: COLORS.navy,
    });
    drawText(page, safeValue(value), PAGE.margin + labelWidth + 6, y + 5, {
      size: 7.2,
      font: fonts.regular,
    });

    y -= rowHeight;
  });

  return y;
};

/* -------------------------------------------------------------------------- */
/* QC CHECKLIST TABLE                                                        */
/* -------------------------------------------------------------------------- */
const CHECKLIST_TESTS = [
  {
    key: 'visual_check',
    spec: 'IS 2629',
    test: 'Visual Check',
  },
  {
    key: 'adhesion_test',
    spec: 'IS 2629',
    test: 'Adhesion Test (wt. of Hammer 210 gms)',
  },
  {
    key: 'knife_test',
    spec: 'IS 2629',
    test: 'Knife Test (Sharp edge)',
  },
  {
    key: 'mass_test',
    spec: 'IS 4759 / IS 6745',
    test: 'Mass of Zinc Coating Test',
  },
  {
    key: 'preece_test',
    spec: 'IS 2633',
    test: 'Preece Test (Copper Sulphate) for Coating Uniformity',
  },
];

const CHECKLIST_COLS = [
  { key: 'sr', label: 'Sr', width: 24 },
  { key: 'spec', label: 'Specification', width: 70 },
  { key: 'test', label: 'Test', width: 175 },
  { key: 'result', label: 'Test Result', width: 130 },
  { key: 'observation', label: 'Observation', width: 136 },
];

const drawChecklistTable = (page, fonts, certificate, startY) => {
  let y = startY;
  const headerHeight = 18;
  let x = PAGE.margin;

  CHECKLIST_COLS.forEach(col => {
    drawRect(page, x, y, col.width, headerHeight, { bg: COLORS.navy });
    drawCenteredText(page, col.label, x, y, col.width, headerHeight, {
      font: fonts.bold,
      size: 7,
      color: COLORS.headerText,
    });
    x += col.width;
  });

  y -= headerHeight;

  CHECKLIST_TESTS.forEach((row, index) => {
    const rowHeight = 26;
    const bg = index % 2 === 0 ? COLORS.white : COLORS.rowAlt;
    x = PAGE.margin;

    const values = [
      String(index + 1),
      row.spec,
      row.test,
      certificate[`${row.key}_result`],
      certificate[`${row.key}_observation`],
    ];

    CHECKLIST_COLS.forEach((col, colIndex) => {
      drawRect(page, x, y, col.width, rowHeight, { bg });
      drawWrappedText(page, values[colIndex], x + 4, y + rowHeight - 9, {
        size: 6.5,
        font: fonts.regular,
        maxCharsPerLine: colIndex === 2 ? 34 : 22,
        maxLines: 3,
        lineHeight: 7.5,
      });
      x += col.width;
    });

    y -= rowHeight;
  });

  return y;
};

/* -------------------------------------------------------------------------- */
/* READINGS TABLE                                                            */
/* -------------------------------------------------------------------------- */
const READING_COLS = [
  { key: 'sr', label: 'Sr', width: 22 },
  { key: 'kem', label: 'Name of Kem', width: 90 },
  { key: 'section', label: 'Section as per BOM', width: 100 },
  { key: 'r1', label: '1', width: 26 },
  { key: 'r2', label: '2', width: 26 },
  { key: 'r3', label: '3', width: 26 },
  { key: 'r4', label: '4', width: 26 },
  { key: 'r5', label: '5', width: 26 },
  { key: 'avgMicron', label: 'Avg (Micron)', width: 65 },
  { key: 'avgGm', label: 'Avg (gm/m²)', width: 62 },
];

const drawReadingsTableHeader = (page, fonts, y) => {
  let x = PAGE.margin;
  const headerHeight = 24;

  drawRect(page, PAGE.margin, y, PAGE.width - PAGE.margin * 2, headerHeight, {
    bg: COLORS.navy,
    borderColor: COLORS.navy,
  });

  // sub-header label spanning the 5 reading columns
  READING_COLS.forEach(col => {
    drawRect(page, x, y, col.width, headerHeight, {
      bg: COLORS.navy,
      borderColor: rgb(0.2, 0.23, 0.35),
    });
    drawCenteredText(page, col.label, x, y, col.width, headerHeight, {
      font: fonts.bold,
      size: 6.5,
      color: COLORS.headerText,
    });
    x += col.width;
  });

  page.drawRectangle({
    x: PAGE.margin,
    y: y - 1.5,
    width: PAGE.width - PAGE.margin * 2,
    height: 1.5,
    color: COLORS.amber,
  });
};

const drawReadingsRow = (page, fonts, row, rowIndex, y, rowHeight) => {
  let x = PAGE.margin;
  const bg = rowIndex % 2 === 0 ? COLORS.white : COLORS.rowAlt;

  const avgMicron = toNumber(row.avg_coating);
  const avgGm =
    avgMicron !== null
      ? Math.round(avgMicron * ZINC_DENSITY_G_PER_M2_PER_MICRON)
      : null;

  const values = {
    sr: String(rowIndex + 1),
    kem: row.material,
    section: row.section || 'As per challan',
    r1: row.c1,
    r2: row.c2,
    r3: row.c3,
    r4: row.c4,
    r5: row.c5,
    avgMicron: avgMicron !== null ? String(avgMicron) : '-',
    avgGm: avgGm !== null ? String(avgGm) : '-',
  };

  READING_COLS.forEach(col => {
    drawRect(page, x, y, col.width, rowHeight, { bg });
    drawCenteredText(
      page,
      safeValue(values[col.key]),
      x,
      y,
      col.width,
      rowHeight,
      {
        font:
          col.key === 'avgMicron' || col.key === 'avgGm'
            ? fonts.bold
            : fonts.regular,
        size: 6.8,
        color: col.key === 'avgGm' ? COLORS.navy : COLORS.text,
      },
    );
    x += col.width;
  });
};

/* -------------------------------------------------------------------------- */
/* COATING REQUIREMENT REFERENCE + REMARKS                                  */
/* -------------------------------------------------------------------------- */
const drawRequirementNote = (page, fonts, startY) => {
  const width = PAGE.width - PAGE.margin * 2;
  let y = startY;

  drawRect(page, PAGE.margin, y, width, 16, { bg: COLORS.bgPanel });
  drawText(
    page,
    'Coating Requirement (IS 4759 / IS 6745)',
    PAGE.margin + 6,
    y + 5,
    {
      size: 7.2,
      font: fonts.bold,
      color: COLORS.navy,
    },
  );
  y -= 16;

  const requirementRows = [
    ['Section thickness 5 mm & above', 'Min. Average 86 micron or 610 gm/m²'],
    [
      'Section thickness 2 mm to below 5 mm',
      'Min. Average 65 micron or 460 gm/m²',
    ],
    [
      'Section thickness 2 mm but not less than 1.2 mm',
      'Min. Average 48 micron or 340 gm/m²',
    ],
  ];

  requirementRows.forEach((cols, index) => {
    const bg = index % 2 === 0 ? COLORS.white : COLORS.rowAlt;
    const colWidth = width * 0.62;

    drawRect(page, PAGE.margin, y, colWidth, 14, { bg });
    drawRect(page, PAGE.margin + colWidth, y, width - colWidth, 14, { bg });

    drawText(page, cols[0], PAGE.margin + 5, y + 4, {
      size: 6.6,
      font: fonts.regular,
    });
    drawText(page, cols[1], PAGE.margin + colWidth + 5, y + 4, {
      size: 6.6,
      font: fonts.bold,
      color: COLORS.navy,
    });

    y -= 14;
  });

  return y;
};

const drawRemarks = (page, fonts, remarks, startY) => {
  const width = PAGE.width - PAGE.margin * 2;
  let y = startY - 8;

  drawText(page, 'Remarks:', PAGE.margin, y, {
    size: 7.5,
    font: fonts.bold,
    color: COLORS.navy,
  });
  drawText(
    page,
    remarks || 'The average coating found within limit, so found satisfactory.',
    PAGE.margin + 48,
    y,
    {
      size: 7.2,
      font: fonts.regular,
      color: COLORS.success,
      maxWidth: width - 48,
    },
  );

  return y - 14;
};

/* -------------------------------------------------------------------------- */
/* FOOTER / SIGNATURE                                                        */
/* -------------------------------------------------------------------------- */
const drawFooter = (page, fonts, pageNumber) => {
  const signY = 60;
  const signW = 150;

  page.drawLine({
    start: { x: PAGE.width - PAGE.margin - signW, y: signY },
    end: { x: PAGE.width - PAGE.margin, y: signY },
    thickness: 0.7,
    color: COLORS.borderStrong,
  });
  drawText(
    page,
    'Authorized Signatory (Quality)',
    PAGE.width - PAGE.margin - signW,
    signY - 10,
    { size: 6.8, font: fonts.bold, color: COLORS.textMuted },
  );

  page.drawLine({
    start: { x: PAGE.margin, y: 24 },
    end: { x: PAGE.width - PAGE.margin, y: 24 },
    thickness: 0.6,
    color: COLORS.border,
  });

  drawText(
    page,
    'Generated by IV Production App  •  System-generated certificate',
    PAGE.margin,
    12,
    { size: 6.2, font: fonts.regular, color: COLORS.textMuted },
  );

  drawText(page, `Page ${pageNumber}`, PAGE.width - PAGE.margin - 46, 12, {
    size: 6.2,
    font: fonts.bold,
    color: COLORS.textMuted,
  });
};

/* -------------------------------------------------------------------------- */
/* MAIN GENERATOR                                                           */
/* -------------------------------------------------------------------------- */
export const generateCoatingCertificatePdf = async ({
  certificate,
  readings = [],
}) => {
  const pdfDoc = await PDFDocument.create();

  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  let pageNumber = 1;
  let page = pdfDoc.addPage(A4_PORTRAIT);

  drawHeader(page, fonts);

  let y = PAGE.height - 90;
  y = drawInfoBlock(page, fonts, certificate, y);

  y -= 10;
  y = drawChecklistTable(page, fonts, certificate, y);

  y -= 14;
  drawReadingsTableHeader(page, fonts, y);
  y -= 24;

  const rowHeight = 20;

  readings.forEach((row, index) => {
    if (y < 140) {
      drawFooter(page, fonts, pageNumber);
      pageNumber += 1;
      page = pdfDoc.addPage(A4_PORTRAIT);
      y = PAGE.height - 60;
      drawReadingsTableHeader(page, fonts, y);
      y -= 24;
    }

    drawReadingsRow(page, fonts, row, index, y, rowHeight);
    y -= rowHeight;
  });

  if (readings.length === 0) {
    drawRect(page, PAGE.margin, y - 24, PAGE.width - PAGE.margin * 2, 24, {
      bg: COLORS.white,
    });
    drawText(
      page,
      'No production entries found for this challan.',
      PAGE.margin + 8,
      y - 15,
      {
        size: 8,
        font: fonts.bold,
        color: COLORS.textMuted,
      },
    );
    y -= 24;
  }

  y -= 10;
  if (y < 140) {
    drawFooter(page, fonts, pageNumber);
    pageNumber += 1;
    page = pdfDoc.addPage(A4_PORTRAIT);
    y = PAGE.height - 60;
  }

  y = drawRequirementNote(page, fonts, y);
  y = drawRemarks(page, fonts, certificate.remarks, y);

  drawFooter(page, fonts, pageNumber);

  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString('base64');

  const fileName = `certificate-${certificate.tc_no.replace(
    /[^A-Za-z0-9-]/g,
    '_',
  )}.pdf`;
  const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  await RNFS.writeFile(path, base64, 'base64');

  const exists = await RNFS.exists(path);
  if (!exists) {
    throw new Error('Certificate PDF was not created');
  }

  await openPdfFile(path);

  return path;
};
