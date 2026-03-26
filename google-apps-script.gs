// ============================================================
// NINJA TRADING JOURNAL — Google Apps Script Backend v2.0
// รองรับหลายพอร์ต โดยแต่ละพอร์ตอยู่ใน Sheet แยกกัน
//
// วิธี Deploy:
//   1. เปิด Google Sheets → Extensions → Apps Script
//   2. วางโค้ดนี้ทั้งหมด → Save (Ctrl+S)
//   3. Deploy → New Deployment → Web App
//      Execute as: Me  |  Access: Anyone
//   4. Copy URL ไปวางใน Dashboard → Settings
// ============================================================

// ─── Column Headers ────────────────────────────────────────
const HEADERS = [
  'ID',           // A  1
  'Date',         // B  2
  'Day',          // C  3
  'Session',      // D  4
  'Time Slot',    // E  5
  'Duration(m)',  // F  6
  'Time Entry',   // G  7
  'Code',         // H  8
  'Class',        // I  9
  'Mode',         // J 10
  'Model',        // K 11
  'Zone',         // L 12
  'Entry',        // M 13
  'Target',       // N 14
  'Stop Loss',    // O 15
  'Result',       // P 16
  'Risk ($)',     // Q 17
  'Max RR',       // R 18
  'Position',     // S 19  ← Auto
  'Point',        // T 20  ← Auto (|Target-Entry|)
  'RR',           // U 21  ← Auto
  'PnL ($)',      // V 22  ← Auto
  'TP ($)',       // W 23  ← Auto
  'SL ($)',       // X 24  ← Auto
  'TP%',          // Y 25  ← Auto (PnL/Balance%)
  'DD Loss%',     // Z 26  ← Auto running DD
  'Con Loss',     // AA 27 ← Auto consecutive losses at this point
  'Sum Con Loss$',// AB 28 ← Auto sum of current losing streak $
  'Sum DD Loss$', // AC 29 ← Auto cumulative DD $
  'Balance',      // AD 30 ← Auto running balance
  'Picture URL',  // AE 31
  'Tip / Note',   // AF 32
  'Created At'    // AG 33
];

const TOTAL_COLS = HEADERS.length; // 33

// ─── GET ────────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action || '';
  const sheet  = e.parameter.sheet  || '';
  if (action === 'getTrades')  return handleGetTrades(sheet);
  if (action === 'listSheets') return handleListSheets();
  return respond({ success: false, error: 'Unknown action: ' + action });
}

// ─── POST ────────────────────────────────────────────────────
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action || '';
    if (action === 'addTrade')    return handleAddTrade(body.trade, body.sheet || '');
    if (action === 'renameSheet') return handleRenameSheet(body.oldName, body.newName);
    return respond({ success: false, error: 'Unknown action: ' + action });
  } catch(err) {
    return respond({ success: false, error: err.message });
  }
}

// ─── GET TRADES ─────────────────────────────────────────────
function handleGetTrades(sheetName) {
  const sheet = getOrCreateSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return respond({ success: true, trades: [] });

  const trades = data.slice(1).map(row => ({
    id          : row[0],
    date        : row[1]  ? formatDate(row[1])  : '',
    day         : row[2]  || '',
    session     : row[3]  || '',
    timeSlot    : row[4]  || '',
    duration    : +row[5] || 0,
    timeEntry   : row[6]  || '',
    code        : row[7]  || '',
    cls         : row[8]  || '',
    mode        : row[9]  || '',
    model       : row[10] || '',
    zone        : row[11] || '',
    priceEntry  : +row[12]|| 0,
    priceTarget : +row[13]|| 0,
    priceSL     : +row[14]|| 0,
    result      : row[15] || '',
    risk        : +row[16]|| 0,
    maxRR       : +row[17]|| 0,
    position    : row[18] || '',
    point       : +row[19]|| 0,
    rr          : +row[20]|| 0,
    pnl         : +row[21]|| 0,
    tp_dollar   : +row[22]|| 0,
    sl_dollar   : +row[23]|| 0,
    tpPct       : row[24] || '',
    ddPct       : row[25] || '',
    conLoss     : +row[26]|| 0,
    sumConLoss  : +row[27]|| 0,
    sumDDLoss   : +row[28]|| 0,
    balance     : +row[29]|| 0,
    pictureUrl  : row[30] || '',
    tip         : row[31] || '',
    createdAt   : row[32] || ''
  }));

  return respond({ success: true, trades });
}

// ─── LIST SHEETS ─────────────────────────────────────────────
function handleListSheets() {
  const sheets = SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .map(s => s.getName())
    .filter(n => n !== 'Summary' && n !== 'README');
  return respond({ success: true, sheets });
}

// ─── ADD TRADE ───────────────────────────────────────────────
function handleAddTrade(trade, sheetName) {
  const sheet = getOrCreateSheet(sheetName);
  const id    = Utilities.getUuid();
  const now   = new Date();

  // ── สร้างข้อมูล row ──
  const entry  = parseFloat(trade.priceEntry)  || 0;
  const target = parseFloat(trade.priceTarget) || 0;
  const sl     = parseFloat(trade.priceSL)     || 0;
  const risk   = parseFloat(trade.risk)        || 0;
  const result = trade.result || '';

  // Auto calculations
  const position = entry > 0 && sl > 0 ? (entry > sl ? 'Buy' : 'Sell') : (trade.position || '');
  const point    = entry > 0 && target > 0 ? Math.abs(target - entry) : 0;
  const riskPts  = entry > 0 && sl > 0     ? Math.abs(entry - sl) : 0;
  const rr       = riskPts > 0 ? point / riskPts : (parseFloat(trade.rr) || 0);
  const pnl      = result === 'TP'   ? risk * rr
                 : result === 'Loss' ? -risk
                 : 0;
  const tp_dollar = result === 'TP'   ? pnl : 0;
  const sl_dollar = result === 'Loss' ? pnl : 0;

  // Running stats (scan existing rows to compute balance, DD, con loss)
  const allRows = sheet.getDataRange().getValues();
  const dataRows = allRows.slice(1); // skip header

  // Find initial balance from portfolio (stored in a named range or first cell note)
  // We read it from cell A1 note if set; otherwise default 10000
  let initBalance = 10000;
  try {
    const note = sheet.getRange('A1').getNote();
    if (note && !isNaN(parseFloat(note))) initBalance = parseFloat(note);
  } catch(e) {}

  // Compute running balance from existing rows
  let runBal = initBalance;
  dataRows.forEach(r => { runBal += parseFloat(r[21]) || 0; }); // col V = PnL
  const newBalance = runBal + pnl;

  // TP% = pnl / initBalance * 100
  const tpPct = initBalance > 0 && pnl !== 0 ? (pnl / initBalance * 100).toFixed(2) + '%' : '—';

  // Peak & DD (running from beginning)
  let peak2 = initBalance, runBal2 = initBalance;
  dataRows.forEach(r => {
    runBal2 += parseFloat(r[21]) || 0;
    if (runBal2 > peak2) peak2 = runBal2;
  });
  runBal2 += pnl;
  if (runBal2 > peak2) peak2 = runBal2;
  const ddPct = peak2 > 0 ? ((peak2 - runBal2) / peak2 * 100).toFixed(2) + '%' : '0%';

  // Consecutive Loss
  let conLossStreak = 0, sumConLoss = 0;
  for (let i = dataRows.length - 1; i >= 0; i--) {
    if (dataRows[i][15] === 'Loss') {
      conLossStreak++;
      sumConLoss += Math.abs(parseFloat(dataRows[i][21]) || 0);
    } else break;
  }
  if (result === 'Loss') {
    conLossStreak++;
    sumConLoss += Math.abs(pnl);
  } else {
    conLossStreak = 0;
    sumConLoss = 0;
  }

  // Sum DD Loss (cumulative absolute losses)
  let sumDDLoss = 0;
  dataRows.forEach(r => { if (parseFloat(r[21]) < 0) sumDDLoss += Math.abs(parseFloat(r[21]) || 0); });
  if (pnl < 0) sumDDLoss += Math.abs(pnl);

  // ── Append row ──
  const tradeDate = trade.date ? new Date(trade.date + 'T00:00:00') : now;
  sheet.appendRow([
    id,                    // A: ID
    tradeDate,             // B: Date
    trade.day        || '',// C: Day
    trade.session    || '',// D: Session
    trade.timeSlot   || '',// E: Time Slot
    trade.duration   || 0, // F: Duration
    trade.timeEntry  || '',// G: Time Entry
    trade.code       || '',// H: Code
    trade.cls        || '',// I: Class
    trade.mode       || '',// J: Mode
    trade.model      || '',// K: Model
    trade.zone       || '',// L: Zone
    entry,                 // M: Entry
    target,                // N: Target
    sl,                    // O: Stop Loss
    result,                // P: Result
    risk,                  // Q: Risk ($)
    trade.maxRR      || 0, // R: Max RR
    position,              // S: Position ← Auto
    parseFloat(point.toFixed(4)), // T: Point ← Auto
    parseFloat(rr.toFixed(4)),    // U: RR ← Auto
    parseFloat(pnl.toFixed(2)),   // V: PnL ($) ← Auto
    parseFloat(tp_dollar.toFixed(2)), // W: TP ($) ← Auto
    parseFloat(sl_dollar.toFixed(2)), // X: SL ($) ← Auto
    tpPct,                 // Y: TP% ← Auto
    ddPct,                 // Z: DD Loss% ← Auto
    conLossStreak,         // AA: Con Loss ← Auto
    parseFloat(sumConLoss.toFixed(2)),  // AB: Sum Con Loss$ ← Auto
    parseFloat(sumDDLoss.toFixed(2)),   // AC: Sum DD Loss$ ← Auto
    parseFloat(newBalance.toFixed(2)),  // AD: Balance ← Auto
    trade.pictureUrl || '',// AE: Picture URL
    trade.tip        || '',// AF: Tip / Note
    now                    // AG: Created At
  ]);

  // ── Formatting ──
  const lr = sheet.getLastRow();
  // Date column
  sheet.getRange(lr, 2).setNumberFormat('dd/mm/yyyy');
  // Number columns: Entry/Target/SL/Risk/Point/RR/PnL/TP$/SL$/Balance
  [13,14,15,17,18,20,21,22,23,24,30].forEach(col => {
    sheet.getRange(lr, col).setNumberFormat('#,##0.00');
  });

  // Result color
  const resultCell = sheet.getRange(lr, 16);
  const colMap = {
    'TP'  : ['#0d4f1e', '#3fb950'],
    'Loss': ['#4f0d0d', '#f85149'],
    'Miss': ['#3a3a0d', '#ffd166']
  };
  if (colMap[result]) resultCell.setBackground(colMap[result][0]).setFontColor(colMap[result][1]);

  // PnL color
  const pnlCell = sheet.getRange(lr, 22);
  if (pnl > 0) pnlCell.setFontColor('#3fb950');
  else if (pnl < 0) pnlCell.setFontColor('#f85149');

  // Position color
  const posCell = sheet.getRange(lr, 19);
  if (position === 'Buy')  posCell.setFontColor('#3fb950');
  if (position === 'Sell') posCell.setFontColor('#f85149');

  // Auto columns background (light tint)
  sheet.getRange(lr, 19, 1, 12).setBackground('#0d1a1a'); // S..AD

  return respond({ success: true, id });
}

// ─── RENAME SHEET ────────────────────────────────────────────
function handleRenameSheet(oldName, newName) {
  if (!oldName || !newName) return respond({ success: false, error: 'ต้องระบุ oldName และ newName' });
  oldName = oldName.trim(); newName = newName.trim();
  if (oldName === newName) return respond({ success: true });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(newName)) return respond({ success: false, error: 'ชื่อ "' + newName + '" มีอยู่แล้ว' });
  const sheet = ss.getSheetByName(oldName);
  if (!sheet) return respond({ success: true, note: 'Sheet "' + oldName + '" ไม่พบ' });
  sheet.setName(newName);
  return respond({ success: true });
}

// ─── GET / CREATE SHEET ──────────────────────────────────────
function getOrCreateSheet(name) {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = (name && name.trim()) ? name.trim() : 'Trades';
  let sheet       = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);

    // ── Header row ──
    const hdr = sheet.getRange(1, 1, 1, TOTAL_COLS);
    hdr.setValues([HEADERS]);
    hdr.setFontWeight('bold')
       .setBackground('#0d1219')
       .setFontColor('#dce8f5')
       .setFontSize(11)
       .setHorizontalAlignment('center');

    // ── Header color groups ──
    // Input columns (A–R): blue-grey
    sheet.getRange(1, 1, 1, 18).setBackground('#141e2e').setFontColor('#7ab0e0');
    // Auto-calculated (S–AD): green-grey
    sheet.getRange(1, 19, 1, 12).setBackground('#0d2010').setFontColor('#5fd97e');
    // Other (AE–AG)
    sheet.getRange(1, 31, 1, 3).setBackground('#1e1e14').setFontColor('#d4c060');

    // ── Column widths ──
    const widths = [
      220, // A: ID
      100, // B: Date
      60,  // C: Day
      70,  // D: Session
      110, // E: Time Slot
      80,  // F: Duration
      80,  // G: Time Entry
      70,  // H: Code
      60,  // I: Class
      220, // J: Mode
      70,  // K: Model
      100, // L: Zone
      90,  // M: Entry
      90,  // N: Target
      90,  // O: Stop Loss
      70,  // P: Result
      80,  // Q: Risk
      70,  // R: Max RR
      80,  // S: Position [Auto]
      80,  // T: Point [Auto]
      70,  // U: RR [Auto]
      90,  // V: PnL [Auto]
      90,  // W: TP$ [Auto]
      90,  // X: SL$ [Auto]
      80,  // Y: TP% [Auto]
      80,  // Z: DD% [Auto]
      80,  // AA: ConLoss [Auto]
      110, // AB: SumConLoss$ [Auto]
      110, // AC: SumDDLoss$ [Auto]
      110, // AD: Balance [Auto]
      200, // AE: Picture URL
      260, // AF: Tip / Note
      140  // AG: Created At
    ];
    widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

    // Freeze header
    sheet.setFrozenRows(1);

    // Tab color
    const colors = ['#1f6feb','#3fb950','#f85149','#ffa657','#bc8cff','#39d0d8'];
    const idx = ss.getSheets().length % colors.length;
    sheet.setTabColor(colors[idx]);

    // Store initial balance in A1 note (default 10000; user can change)
    sheet.getRange('A1').setNote('10000');
  }

  return sheet;
}

// ─── Helpers ─────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt) ? String(d) : dt.toISOString().split('T')[0];
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Utility: Set Initial Balance for a sheet ─────────────────
// Run this manually from Apps Script editor if you need to update
// the initial balance stored in A1 note
function setInitialBalance(sheetName, balance) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (sheet) sheet.getRange('A1').setNote(String(balance));
}
