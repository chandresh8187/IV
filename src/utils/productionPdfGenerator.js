import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Buffer } from 'buffer';

import { openPdfFile } from '../native/PdfOpener';

const PAGE = {
  width: 841.89,
  height: 595.28,
  margin: 24,
};

const A4_LANDSCAPE = [PAGE.width, PAGE.height];
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

/* -------------------------------------------------------------------------- */
/* PALETTE — matches certificatePdfGenerator.js: white letterhead, navy text,*/
/* light-gray table panels, amber accent line                                */
/* -------------------------------------------------------------------------- */
const COLORS = {
  navy: rgb(0.086, 0.114, 0.235),
  steel: rgb(0.204, 0.396, 0.612),
  amber: rgb(0.788, 0.6, 0.098),
  white: rgb(1, 1, 1),
  bgPanel: rgb(0.945, 0.95, 0.958),
  rowAlt: rgb(0.965, 0.968, 0.975),
  border: rgb(0.25, 0.27, 0.32),
  borderLight: rgb(0.65, 0.68, 0.73),
  text: rgb(0.1, 0.11, 0.15),
  textMuted: rgb(0.4, 0.43, 0.49),
  danger: rgb(0.72, 0.14, 0.14),
  success: rgb(0.11, 0.45, 0.28),
};

/* -------------------------------------------------------------------------- */
/* TEXT HELPERS                                                              */
/* -------------------------------------------------------------------------- */
const cleanPdfText = value => {
  if (value === null || value === undefined || value === '') return '-';
  return (
    String(value)
      .replace(/\u202f/g, ' ')
      .replace(/\u00a0/g, ' ')
      // Superscript-two (U+00B2) renders fine with the standard Helvetica
      // fonts (WinAnsi encoding) - kept explicitly rather than stripped.
      .replace(/[^\x20-\x7E\u00B2]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
};

const safeValue = value =>
  value !== null && value !== undefined && value !== '' ? value : '-';

const safeKg = value =>
  value !== null && value !== undefined && value !== ''
    ? `${Number(value).toLocaleString('en-IN')} KG`
    : '-';

const toNumber = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Wrap text into lines that actually fit a given pixel width, measured with
 * real font metrics (font.widthOfTextAtSize) instead of a character-count
 * guess - this is what lets long Party / Material values wrap correctly
 * instead of being cut off mid-word.
 */
const wrapTextToWidth = (font, text, size, maxWidth, maxLines = 3) => {
  const words = cleanPdfText(text).split(' ');
  const lines = [];
  let line = '';

  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);

  return lines.slice(0, maxLines);
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

const drawRoundedBox = (page, x, y, width, height, options = {}) => {
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
/* COMPANY LOGO - same lookup as certificatePdfGenerator.js:                 */
/*   Android -> android/app/src/main/assets/logo.png                         */
/*   iOS     -> logo.png added to the Xcode bundle resources                 */
/* Falls back to an "IV" monogram block if the file isn't found, so a        */
/* missing logo never breaks report generation.                             */
/* -------------------------------------------------------------------------- */
const loadLogoImage = async pdfDoc => {
  try {
    let base64 = null;

    if (Platform.OS === 'android') {
      base64 = await RNFS.readFileAssets('IV_logo.png', 'base64');
    } else {
      base64 = await RNFS.readFile(
        `${RNFS.MainBundlePath}/IV_logo.png`,
        'base64',
      );
    }

    if (!base64) return null;
    return await pdfDoc.embedPng(Buffer.from(base64, 'base64'));
  } catch (error) {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/* REPORT ID                                                                 */
/* -------------------------------------------------------------------------- */
const buildReportNo = (date, shiftName) => {
  const compactDate =
    String(date)
      .replace(/[^0-9]/g, '')
      .slice(0, 8) || '00000000';
  const shiftCode = String(shiftName || 'GEN')
    .slice(0, 1)
    .toUpperCase();
  return `PR-${compactDate}-${shiftCode}`;
};

/* -------------------------------------------------------------------------- */
/* HEADER - white letterhead, same visual language as the coating           */
/* certificate: company block + logo top, centered title + meta line below, */
/* amber accent line. Returns the y where the body content should start,    */
/* so everything below chains off this instead of hardcoded page positions. */
/* -------------------------------------------------------------------------- */
const COMPANY_ADDRESS_LINES = [
  'PLANT-4, PLOT NO. 2526, NEAR MASCUT POLYMER, NEAR RADHE FORGE,',
  'VERAVAL-SHAPAR RAJKOT - 360024 (Guj) INDIA.',
];

const drawHeader = ({ page, fonts, date, shiftName, logoImage }) => {
  const topY = PAGE.height - PAGE.margin;

  // Left: company name + address
  drawText(page, 'IV SQUARE STRUCTURE INDIA PVT LTD', PAGE.margin, topY - 14, {
    size: 15,
    font: fonts.bold,
    color: COLORS.navy,
  });
  COMPANY_ADDRESS_LINES.forEach((line, index) => {
    drawText(page, line, PAGE.margin, topY - 42 - index * 9, {
      size: 7,
      font: fonts.regular,
      color: COLORS.textMuted,
    });
  });

  // Right: logo image, or "IV" monogram fallback (same box size/behavior
  // as the certificate generator for a consistent brand look)
  const logoBoxW = 140;
  const logoBoxH = 60;
  const logoX = PAGE.width - PAGE.margin - logoBoxW;
  const logoY = topY - logoBoxH - 2;

  if (logoImage) {
    const scale = Math.min(
      logoBoxW / logoImage.width,
      logoBoxH / logoImage.height,
    );
    const w = logoImage.width * scale;
    const h = logoImage.height * scale;
    page.drawImage(logoImage, {
      x: logoX + (logoBoxW - w) / 2,
      y: logoY + (logoBoxH - h) / 2,
      width: w,
      height: h,
    });
  } else {
    drawRoundedBox(page, logoX + logoBoxW - 48, logoY + 12, 44, 44, {
      bg: COLORS.steel,
      borderColor: COLORS.amber,
      borderWidth: 1.2,
    });
    drawCenteredText(page, 'IV', logoX + logoBoxW - 48, logoY + 12, 44, 44, {
      font: fonts.bold,
      size: 20,
      color: COLORS.white,
    });
  }

  // Divider under the company/logo block
  const dividerY = topY - 76;
  page.drawLine({
    start: { x: PAGE.margin, y: dividerY },
    end: { x: PAGE.width - PAGE.margin, y: dividerY },
    thickness: 0.8,
    color: COLORS.borderLight,
  });

  // Centered report title
  const titleY = dividerY - 20;
  drawCenteredText(
    page,
    `${String(shiftName).toUpperCase()} SHIFT PRODUCTION REPORT`,
    PAGE.margin,
    titleY,
    CONTENT_WIDTH,
    14,
    { font: fonts.bold, size: 13, color: COLORS.text },
  );

  // Centered meta line: date, report no, generated timestamp
  const metaY = titleY - 15;
  const reportNo = buildReportNo(date, shiftName);
  const generatedAt = new Date().toLocaleString('en-IN');
  drawCenteredText(
    page,
    `Date: ${date}   •   Report No: ${reportNo}   •   Generated: ${generatedAt}`,
    PAGE.margin,
    metaY,
    CONTENT_WIDTH,
    11,
    { font: fonts.regular, size: 7.5, color: COLORS.textMuted },
  );

  // Amber accent line closing off the header
  const accentY = metaY - 8;
  page.drawRectangle({
    x: PAGE.margin,
    y: accentY,
    width: CONTENT_WIDTH,
    height: 1.6,
    color: COLORS.amber,
  });

  return accentY - 10;
};

/* -------------------------------------------------------------------------- */
/* CONTINUATION BANNER (subsequent pages)                                    */
/* -------------------------------------------------------------------------- */
const drawContinuationBar = ({ page, fonts, date, shiftName, pageNumber }) => {
  const topY = PAGE.height - PAGE.margin;

  drawRoundedBox(page, PAGE.margin, topY - 22, CONTENT_WIDTH, 22, {
    bg: COLORS.bgPanel,
    borderColor: COLORS.border,
  });
  drawText(
    page,
    `Production Table (Continued) — ${String(
      shiftName,
    ).toUpperCase()} SHIFT — ${date}`,
    PAGE.margin + 10,
    topY - 15,
    { size: 8.5, font: fonts.bold, color: COLORS.navy },
  );
  drawText(
    page,
    `Page ${pageNumber}`,
    PAGE.width - PAGE.margin - 55,
    topY - 15,
    { size: 8.5, font: fonts.bold, color: COLORS.textMuted },
  );

  return topY - 22 - 12;
};

/* -------------------------------------------------------------------------- */
/* SUMMARY / KPI CARDS                                                       */
/* -------------------------------------------------------------------------- */
const CARD_HEIGHT = 52;

const drawSummaryCards = ({ page, fonts, summary, topY }) => {
  const zincConsumption = Number(summary?.zinc_consumption || 0);

  const cards = [
    {
      label: 'TOTAL MS PRODUCTION',
      value: safeKg(summary?.total_ms_production_kg),
      accent: COLORS.steel,
    },
    {
      label: 'TOTAL GI PRODUCTION',
      value: safeKg(summary?.total_gi_production_kg),
      accent: COLORS.steel,
    },
    {
      label: 'TOTAL ZINC USED',
      value: safeKg(summary?.zink_used),
      accent: COLORS.steel,
    },
    {
      label: 'ZINC CONSUMPTION',
      value: `${zincConsumption}%`,
      accent: zincConsumption > 7.5 ? COLORS.danger : COLORS.success,
      flag: zincConsumption > 7.5 ? 'ABOVE TARGET' : 'WITHIN TARGET',
    },
  ];

  const gap = 10;
  const cardW = (CONTENT_WIDTH - gap * 3) / 4;

  drawText(page, 'SHIFT PERFORMANCE SUMMARY', PAGE.margin, topY, {
    size: 8.5,
    font: fonts.bold,
    color: COLORS.navy,
  });
  page.drawLine({
    start: { x: PAGE.margin, y: topY - 6 },
    end: { x: PAGE.width - PAGE.margin, y: topY - 6 },
    thickness: 0.8,
    color: COLORS.border,
  });

  const cardsTop = topY - 10;
  const startY = cardsTop - CARD_HEIGHT;

  cards.forEach((card, index) => {
    const x = PAGE.margin + index * (cardW + gap);

    drawRoundedBox(page, x, startY, cardW, CARD_HEIGHT, {
      bg: COLORS.white,
      borderColor: COLORS.border,
      borderWidth: 0.7,
    });

    page.drawRectangle({
      x,
      y: startY,
      width: 4,
      height: CARD_HEIGHT,
      color: card.accent,
    });

    drawText(page, card.label, x + 12, startY + CARD_HEIGHT - 16, {
      size: 6.6,
      font: fonts.bold,
      color: COLORS.textMuted,
    });

    drawText(page, card.value, x + 12, startY + 14, {
      size: 15,
      font: fonts.bold,
      color: COLORS.navy,
    });

    if (card.flag) {
      const flagWidth = fonts.bold.widthOfTextAtSize(card.flag, 5.8) + 10;
      page.drawRectangle({
        x: x + cardW - flagWidth - 8,
        y: startY + CARD_HEIGHT - 18,
        width: flagWidth,
        height: 11,
        color: card.accent,
      });
      drawCenteredText(
        page,
        card.flag,
        x + cardW - flagWidth - 8,
        startY + CARD_HEIGHT - 18,
        flagWidth,
        11,
        { font: fonts.bold, size: 5.8, color: COLORS.white },
      );
    }
  });

  return startY;
};

/* -------------------------------------------------------------------------- */
/* SECTION TITLE                                                             */
/* -------------------------------------------------------------------------- */
const drawSectionTitle = (page, fonts, title, y) => {
  page.drawRectangle({
    x: PAGE.margin,
    y: y - 3,
    width: 3,
    height: 11,
    color: COLORS.amber,
  });
  drawText(page, title, PAGE.margin + 8, y, {
    size: 10.5,
    font: fonts.bold,
    color: COLORS.navy,
  });
  page.drawLine({
    start: { x: PAGE.margin, y: y - 6 },
    end: { x: PAGE.width - PAGE.margin, y: y - 6 },
    thickness: 0.8,
    color: COLORS.border,
  });

  return y - 6;
};

/* -------------------------------------------------------------------------- */
/* TABLE                                                                     */
/* -------------------------------------------------------------------------- */
const columns = [
  { label: 'Sr', key: 'sr_no', width: 28, lines: 1 },
  { label: 'Time', key: 'production_time', width: 50, lines: 1 },
  { label: 'Challan No.', key: 'challan_no', width: 80, lines: 2 },
  { label: 'Party Name', key: 'party_name', width: 118, lines: 3 },
  { label: 'Material Description', key: 'material', width: 182, lines: 4 },
  { label: 'Kettle Temp', key: 'kettle_temperature', width: 44, lines: 1 },
  { label: 'Dipping Qty', key: 'dipping_qty', width: 42, lines: 1 },
  { label: 'MS Wt.', key: 'ms_weight', width: 44, lines: 1 },
  { label: 'GI Wt.', key: 'gi_weight', width: 44, lines: 1 },
  { label: 'Zn %', key: 'zinc_percentage', width: 42, lines: 1 },
  { label: 'Avg. Coating', key: 'avg_coating', width: 60, lines: 1 },
];

const TABLE_WIDTH = columns.reduce((sum, col) => sum + col.width, 0);

const CELL_FONT_SIZE = 5.9;
const CELL_LINE_HEIGHT = 7;
const MIN_ROW_HEIGHT = 23;
const TABLE_HEADER_HEIGHT = 24;

// Light-panel table header - matches the certificate's checklist/readings
// tables (bordered, bgPanel fill, navy bold text) instead of a solid navy
// band, so both documents read as the same product.
const drawTableHeader = (page, fonts, y) => {
  let x = PAGE.margin;

  columns.forEach(col => {
    page.drawRectangle({
      x,
      y,
      width: col.width,
      height: TABLE_HEADER_HEIGHT,
      color: COLORS.bgPanel,
      borderColor: COLORS.border,
      borderWidth: 0.6,
    });

    drawCenteredText(page, col.label, x, y, col.width, TABLE_HEADER_HEIGHT, {
      font: fonts.bold,
      size: 6.4,
      color: COLORS.navy,
    });

    x += col.width;
  });

  page.drawRectangle({
    x: PAGE.margin,
    y: y - 1.5,
    width: TABLE_WIDTH,
    height: 1.5,
    color: COLORS.amber,
  });
};

const getCellValue = (row, key) => {
  const value = row?.[key];
  if (key === 'ms_weight' || key === 'gi_weight') return safeValue(value);
  if (key === 'zinc_percentage') {
    return value !== null && value !== undefined && value !== ''
      ? `${value}%`
      : '-';
  }
  return safeValue(value);
};

/**
 * Wrap every cell of a row against its column's real width, and work out
 * how tall the row needs to be to show the tallest cell in full - this is
 * what lets long Material Description values display completely instead
 * of being cut off with "...".
 */
const measureRow = (fonts, row) => {
  const cellLines = columns.map(col =>
    wrapTextToWidth(
      fonts.regular,
      getCellValue(row, col.key),
      CELL_FONT_SIZE,
      col.width - 8,
      col.lines || 3,
    ),
  );

  const maxLinesUsed = Math.max(1, ...cellLines.map(l => l.length));
  const rowHeight = Math.max(
    MIN_ROW_HEIGHT,
    12 + maxLinesUsed * CELL_LINE_HEIGHT,
  );

  return { cellLines, rowHeight };
};

const drawCell = (page, lines, x, y, width, height, options = {}) => {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: options.bg || COLORS.white,
    borderColor: options.borderColor || COLORS.borderLight,
    borderWidth: 0.45,
  });

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: x + 4,
      y: y + height - 9 - index * CELL_LINE_HEIGHT,
      size: options.size || CELL_FONT_SIZE,
      font: options.font,
      color: options.color || COLORS.text,
    });
  });
};

const drawTotalsRow = (page, fonts, y, totals, rowHeight) => {
  let x = PAGE.margin;

  columns.forEach(col => {
    let display = '';
    if (col.key === 'party_name') display = 'TOTAL';
    if (col.key === 'ms_weight')
      display = `${totals.ms.toLocaleString('en-IN')}`;
    if (col.key === 'gi_weight')
      display = `${totals.gi.toLocaleString('en-IN')}`;

    page.drawRectangle({
      x,
      y,
      width: col.width,
      height: rowHeight,
      color: COLORS.bgPanel,
      borderColor: COLORS.border,
      borderWidth: 0.7,
    });

    if (display) {
      drawCenteredText(page, display, x, y, col.width, rowHeight, {
        font: fonts.bold,
        size: 7,
        color: COLORS.navy,
      });
    }

    x += col.width;
  });
};

/* -------------------------------------------------------------------------- */
/* FOOTER + SIGNATURE STRIP                                                  */
/* -------------------------------------------------------------------------- */
const drawFooter = (page, fonts, pageNumber, isLastPage) => {
  if (isLastPage) {
    const signY = 46;
    const signW = (CONTENT_WIDTH - 20) / 3;
    const labels = [
      'Prepared By',
      'Checked By (Shift Supervisor)',
      'Approved By (Plant Manager)',
    ];

    labels.forEach((label, index) => {
      const x = PAGE.margin + index * (signW + 10);
      page.drawLine({
        start: { x, y: signY },
        end: { x: x + signW, y: signY },
        thickness: 0.7,
        color: COLORS.borderLight,
      });
      drawText(page, label, x, signY - 9, {
        size: 6.8,
        font: fonts.bold,
        color: COLORS.textMuted,
      });
    });
  }

  page.drawLine({
    start: { x: PAGE.margin, y: 24 },
    end: { x: PAGE.width - PAGE.margin, y: 24 },
    thickness: 0.6,
    color: COLORS.borderLight,
  });

  drawText(
    page,
    'Generated by IV Production App  •  System-generated document',
    PAGE.margin,
    12,
    { size: 6.5, font: fonts.regular, color: COLORS.textMuted },
  );

  drawText(page, `Page ${pageNumber}`, PAGE.width - PAGE.margin - 46, 12, {
    size: 6.5,
    font: fonts.bold,
    color: COLORS.textMuted,
  });
};

/* -------------------------------------------------------------------------- */
/* MAIN GENERATOR                                                            */
/* -------------------------------------------------------------------------- */
export const generateProductionPdf = async ({
  date,
  shiftName,
  summary,
  tableData = [],
}) => {
  const pdfDoc = await PDFDocument.create();

  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };

  const logoImage = await loadLogoImage(pdfDoc);

  let pageNumber = 1;
  let page = pdfDoc.addPage(A4_LANDSCAPE);

  // Everything below chains off drawHeader's returned y instead of magic
  // numbers, so the header can grow/shrink without desyncing the rest of
  // the page.
  let y = drawHeader({ page, fonts, date, shiftName, logoImage });
  y = drawSummaryCards({ page, fonts, summary, topY: y });

  y -= 27;
  y = drawSectionTitle(page, fonts, 'Production Table', y);

  y -= 32;
  drawTableHeader(page, fonts, y);
  y -= TABLE_HEADER_HEIGHT;

  const totals = { ms: 0, gi: 0 };

  if (!tableData.length) {
    drawRoundedBox(page, PAGE.margin, y - 40, CONTENT_WIDTH, 40, {
      bg: COLORS.white,
    });
    drawText(
      page,
      'No production entries found for this shift.',
      PAGE.margin + 10,
      y - 18,
      { size: 9, font: fonts.bold, color: COLORS.textMuted },
    );
  }

  tableData.forEach((row, rowIndex) => {
    totals.ms += toNumber(row?.ms_weight);
    totals.gi += toNumber(row?.gi_weight);

    // Measure the row's real height (wrapped Party / Material text can
    // need extra lines) BEFORE the page-break check, so a tall row never
    // spills into the footer area.
    const { cellLines, rowHeight } = measureRow(fonts, row);

    if (y - rowHeight < 47) {
      drawFooter(page, fonts, pageNumber, false);

      pageNumber += 1;
      page = pdfDoc.addPage(A4_LANDSCAPE);

      y = drawContinuationBar({ page, fonts, date, shiftName, pageNumber });
      drawTableHeader(page, fonts, y);
      y -= TABLE_HEADER_HEIGHT;
    }

    // pdf-lib rectangles are anchored at their BOTTOM-left corner, so a
    // taller-than-minimum row must have its origin shifted further down
    // for its top edge to stay flush with the previous row's bottom edge.
    y -= rowHeight - MIN_ROW_HEIGHT;

    let x = PAGE.margin;
    const rowBg = rowIndex % 2 === 0 ? COLORS.white : COLORS.rowAlt;

    columns.forEach((col, colIndex) => {
      drawCell(page, cellLines[colIndex], x, y, col.width, rowHeight, {
        bg: rowBg,
        font: fonts.regular,
        size: CELL_FONT_SIZE,
      });
      x += col.width;
    });

    y -= MIN_ROW_HEIGHT;
  });

  if (tableData.length) {
    if (y < 70) {
      drawFooter(page, fonts, pageNumber, false);
      pageNumber += 1;
      page = pdfDoc.addPage(A4_LANDSCAPE);
      y = drawContinuationBar({ page, fonts, date, shiftName, pageNumber });
      drawTableHeader(page, fonts, y);
      y -= TABLE_HEADER_HEIGHT;
    }
    drawTotalsRow(page, fonts, y, totals, MIN_ROW_HEIGHT);
    y -= MIN_ROW_HEIGHT;
  }

  drawFooter(page, fonts, pageNumber, true);

  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString('base64');

  const fileName = `production-${date}-${shiftName}.pdf`;
  const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  await RNFS.writeFile(path, base64, 'base64');

  const exists = await RNFS.exists(path);
  if (!exists) {
    throw new Error('PDF file was not created');
  }

  await openPdfFile(path);

  return path;
};
