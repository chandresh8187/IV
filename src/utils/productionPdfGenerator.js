import RNFS from 'react-native-fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Buffer } from 'buffer';

import { openPdfFile } from '../native/PdfOpener';

const PAGE = {
  width: 841.89,
  height: 595.28,
  margin: 24,
};

const A4_LANDSCAPE = [PAGE.width, PAGE.height];

/* -------------------------------------------------------------------------- */
/* PALETTE — corporate ERP look: deep navy / slate / steel-blue / amber accent */
/* -------------------------------------------------------------------------- */
const COLORS = {
  navy: rgb(0.086, 0.114, 0.235), // #16172F-ish deep header navy
  navyDark: rgb(0.055, 0.075, 0.165), // darker strip under header
  steel: rgb(0.204, 0.396, 0.612), // #34659C steel blue accent
  amber: rgb(0.788, 0.6, 0.098), // #C99919 gold accent (ERP highlight)
  white: rgb(1, 1, 1),
  bgPanel: rgb(0.964, 0.968, 0.976), // very light gray panel
  rowAlt: rgb(0.953, 0.958, 0.968), // zebra row
  border: rgb(0.78, 0.8, 0.85),
  borderStrong: rgb(0.55, 0.58, 0.65),
  text: rgb(0.12, 0.13, 0.18),
  textMuted: rgb(0.4, 0.43, 0.49),
  headerText: rgb(0.93, 0.94, 0.97),
  danger: rgb(0.72, 0.14, 0.14),
  success: rgb(0.11, 0.45, 0.28),
};

/* -------------------------------------------------------------------------- */
/* TEXT HELPERS                                                              */
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

const safeKg = value =>
  value !== null && value !== undefined && value !== ''
    ? `${Number(value).toLocaleString('en-IN')} KG`
    : '-';

const toNumber = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

const wrapText = (text, maxCharsPerLine = 22, maxLines = 3) => {
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

  return lines.slice(0, maxLines);
};

const drawWrappedText = (page, text, x, y, options = {}) => {
  const lines = wrapText(
    text,
    options.maxCharsPerLine || 22,
    options.maxLines || 3,
  );
  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * (options.lineHeight || 8),
      size: options.size || 6,
      font: options.font,
      color: options.color || COLORS.text,
    });
  });
  return lines.length;
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
/* HEADER                                                                    */
/* -------------------------------------------------------------------------- */
const drawHeader = ({ page, fonts, date, shiftName }) => {
  // Main navy header band
  page.drawRectangle({
    x: 0,
    y: PAGE.height - 60,
    width: PAGE.width,
    height: 60,
    color: COLORS.navy,
  });

  // Amber accent line separating header from body
  page.drawRectangle({
    x: 0,
    y: PAGE.height - 63,
    width: PAGE.width,
    height: 3,
    color: COLORS.amber,
  });

  // Logo placeholder block
  drawRoundedBox(page, PAGE.margin, PAGE.height - 50, 34, 34, {
    bg: COLORS.steel,
    borderColor: COLORS.amber,
    borderWidth: 1,
  });
  drawCenteredText(page, 'IV', PAGE.margin, PAGE.height - 50, 34, 34, {
    font: fonts.bold,
    size: 14,
    color: COLORS.white,
  });

  drawText(
    page,
    'IV SQUARE STRUCTURE INDIA PVT. LTD.',
    PAGE.margin + 46,
    PAGE.height - 24,
    {
      size: 14,
      font: fonts.bold,
      color: COLORS.white,
    },
  );

  drawText(
    page,
    `GALVANIZING PLANT  |  ${String(
      shiftName,
    ).toUpperCase()} SHIFT PRODUCTION REPORT`,
    PAGE.margin + 46,
    PAGE.height - 38,
    { size: 8, font: fonts.bold, color: COLORS.amber },
  );

  const reportNo = buildReportNo(date, shiftName);
  const rightLabelX = PAGE.width - PAGE.margin - 190;

  drawText(page, 'REPORT NO.', rightLabelX, PAGE.height - 20, {
    size: 6.5,
    font: fonts.bold,
    color: COLORS.headerText,
  });
  drawText(page, reportNo, rightLabelX, PAGE.height - 30, {
    size: 9,
    font: fonts.bold,
    color: COLORS.white,
  });

  drawText(page, 'REPORT DATE', rightLabelX + 100, PAGE.height - 20, {
    size: 6.5,
    font: fonts.bold,
    color: COLORS.headerText,
  });
  drawText(page, date, rightLabelX + 100, PAGE.height - 30, {
    size: 9,
    font: fonts.bold,
    color: COLORS.white,
  });

  drawText(
    page,
    `Generated: ${new Date().toLocaleString('en-IN')}`,
    rightLabelX,
    PAGE.height - 44,
    { size: 6.5, font: fonts.regular, color: COLORS.headerText },
  );
};

/* -------------------------------------------------------------------------- */
/* CONTINUATION BANNER (subsequent pages)                                    */
/* -------------------------------------------------------------------------- */
const drawContinuationBar = ({ page, fonts, date, shiftName, pageNumber }) => {
  drawRoundedBox(
    page,
    PAGE.margin,
    PAGE.height - 90,
    PAGE.width - PAGE.margin * 2,
    20,
    {
      bg: COLORS.bgPanel,
      borderColor: COLORS.border,
    },
  );
  drawText(
    page,
    `Production Table (Continued) — ${String(
      shiftName,
    ).toUpperCase()} SHIFT — ${date}`,
    PAGE.margin + 8,
    PAGE.height - 84,
    { size: 8, font: fonts.bold, color: COLORS.navy },
  );
  drawText(
    page,
    `Page ${pageNumber}`,
    PAGE.width - PAGE.margin - 50,
    PAGE.height - 84,
    {
      size: 8,
      font: fonts.bold,
      color: COLORS.textMuted,
    },
  );
};

/* -------------------------------------------------------------------------- */
/* SUMMARY / KPI CARDS                                                       */
/* -------------------------------------------------------------------------- */
const drawSummaryCards = ({ page, fonts, summary, startY }) => {
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
  const cardW = (PAGE.width - PAGE.margin * 2 - gap * 3) / 4;
  const cardH = 52;

  // Section label above cards
  drawText(
    page,
    'SHIFT PERFORMANCE SUMMARY',
    PAGE.margin,
    startY + cardH + 10,
    {
      size: 8.5,
      font: fonts.bold,
      color: COLORS.navy,
    },
  );
  page.drawLine({
    start: { x: PAGE.margin, y: startY + cardH + 4 },
    end: { x: PAGE.width - PAGE.margin, y: startY + cardH + 4 },
    thickness: 0.8,
    color: COLORS.border,
  });

  cards.forEach((card, index) => {
    const x = PAGE.margin + index * (cardW + gap);

    drawRoundedBox(page, x, startY, cardW, cardH, {
      bg: COLORS.white,
      borderColor: COLORS.border,
      borderWidth: 0.7,
    });

    // Left accent bar (ERP-style KPI card)
    page.drawRectangle({
      x,
      y: startY,
      width: 4,
      height: cardH,
      color: card.accent,
    });

    drawText(page, card.label, x + 12, startY + cardH - 16, {
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
        y: startY + cardH - 18,
        width: flagWidth,
        height: 11,
        color: card.accent,
      });
      drawCenteredText(
        page,
        card.flag,
        x + cardW - flagWidth - 8,
        startY + cardH - 18,
        flagWidth,
        11,
        {
          font: fonts.bold,
          size: 5.8,
          color: COLORS.white,
        },
      );
    }
  });
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
};

/* -------------------------------------------------------------------------- */
/* TABLE                                                                     */
/* -------------------------------------------------------------------------- */
const columns = [
  { label: 'Sr', key: 'sr_no', width: 28, chars: 5, lines: 1 },
  { label: 'Time', key: 'production_time', width: 50, chars: 10, lines: 1 },
  { label: 'Challan No.', key: 'challan_no', width: 80, chars: 16, lines: 2 },
  { label: 'Party Name', key: 'party_name', width: 118, chars: 20, lines: 3 },
  {
    label: 'Material Description',
    key: 'material',
    width: 182,
    chars: 32,
    lines: 4,
  },
  {
    label: 'Kettle Temp',
    key: 'kettle_temperature',
    width: 44,
    chars: 6,
    lines: 1,
  },
  { label: 'Dipping Qty', key: 'dipping_qty', width: 42, chars: 6, lines: 1 },
  { label: 'MS Wt.', key: 'ms_weight', width: 44, chars: 7, lines: 1 },
  { label: 'GI Wt.', key: 'gi_weight', width: 44, chars: 7, lines: 1 },
  { label: 'Zn %', key: 'zinc_percentage', width: 42, chars: 7, lines: 1 },
  { label: 'Avg. Coating', key: 'avg_coating', width: 60, chars: 6, lines: 1 },
];

const TABLE_WIDTH = columns.reduce((sum, col) => sum + col.width, 0);

const drawTableHeader = (page, fonts, y) => {
  let x = PAGE.margin;
  const headerHeight = 26;

  columns.forEach(col => {
    page.drawRectangle({
      x,
      y,
      width: col.width,
      height: headerHeight,
      color: COLORS.navy,
      borderColor: COLORS.navyDark,
      borderWidth: 0.6,
    });

    drawCenteredText(page, col.label, x, y, col.width, headerHeight, {
      font: fonts.bold,
      size: 6.4,
      color: COLORS.headerText,
    });

    x += col.width;
  });

  // amber underline under table header
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

const drawCell = (page, text, x, y, width, height, options = {}) => {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: options.bg || COLORS.white,
    borderColor: options.borderColor || COLORS.border,
    borderWidth: 0.45,
  });

  drawWrappedText(page, text, x + 4, y + height - 9, {
    size: options.size || 5.9,
    font: options.font,
    color: options.color || COLORS.text,
    maxCharsPerLine: options.maxCharsPerLine || 20,
    maxLines: options.maxLines || 3,
    lineHeight: options.lineHeight || 7,
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
      borderColor: COLORS.borderStrong,
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
    const signW = (PAGE.width - PAGE.margin * 2 - 20) / 3;
    const labels = [
      'Prepared By',
      'Checked By (Shift Supervisor)',
      'Approved By (Plant Manager)',
    ];

    labels.forEach((label, index) => {
      const x = PAGE.margin + index * (signW + 10);
      page.drawLine({
        start: { x: x, y: signY },
        end: { x: x + signW, y: signY },
        thickness: 0.7,
        color: COLORS.borderStrong,
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
    color: COLORS.border,
  });

  drawText(
    page,
    'Generated by IV Production App  •  System-generated document',
    PAGE.margin,
    12,
    {
      size: 6.5,
      font: fonts.regular,
      color: COLORS.textMuted,
    },
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

  let pageNumber = 1;
  let page = pdfDoc.addPage(A4_LANDSCAPE);
  const allPages = [page];

  drawHeader({ page, fonts, date, shiftName });
  drawSummaryCards({ page, fonts, summary, startY: 465 });
  drawSectionTitle(page, fonts, 'Production Table', 438);

  let y = 400;
  drawTableHeader(page, fonts, y);
  y -= 26;

  const rowHeight = 23;
  const totals = { ms: 0, gi: 0 };

  if (!tableData.length) {
    drawRoundedBox(
      page,
      PAGE.margin,
      y - 40,
      PAGE.width - PAGE.margin * 2,
      40,
      {
        bg: COLORS.white,
      },
    );
    drawText(
      page,
      'No production entries found for this shift.',
      PAGE.margin + 10,
      y - 18,
      {
        size: 9,
        font: fonts.bold,
        color: COLORS.textMuted,
      },
    );
  }

  tableData.forEach((row, rowIndex) => {
    totals.ms += toNumber(row?.ms_weight);
    totals.gi += toNumber(row?.gi_weight);

    if (y < 70) {
      drawFooter(page, fonts, pageNumber, false);

      pageNumber += 1;
      page = pdfDoc.addPage(A4_LANDSCAPE);
      allPages.push(page);

      drawContinuationBar({ page, fonts, date, shiftName, pageNumber });

      y = PAGE.height - 110;
      drawTableHeader(page, fonts, y);
      y -= 26;
    }

    let x = PAGE.margin;
    const rowBg = rowIndex % 2 === 0 ? COLORS.white : COLORS.rowAlt;

    columns.forEach(col => {
      drawCell(page, getCellValue(row, col.key), x, y, col.width, rowHeight, {
        bg: rowBg,
        font: fonts.regular,
        size: 5.9,
      });
      x += col.width;
    });

    y -= rowHeight;
  });

  if (tableData.length) {
    if (y < 70) {
      drawFooter(page, fonts, pageNumber, false);
      pageNumber += 1;
      page = pdfDoc.addPage(A4_LANDSCAPE);
      allPages.push(page);
      drawContinuationBar({ page, fonts, date, shiftName, pageNumber });
      y = PAGE.height - 110;
      drawTableHeader(page, fonts, y);
      y -= 26;
    }
    drawTotalsRow(page, fonts, y, totals, rowHeight);
    y -= rowHeight;
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
