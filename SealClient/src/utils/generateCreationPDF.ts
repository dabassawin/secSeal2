/**
 * generateCreationPDF.ts
 * สร้างใบเบิกซีล สำหรับประวัติการสร้างซีล
 * แบ่งกล่องละไม่เกิน 1000 ดวง แสดงซีลหัว-ซีลท้ายแต่ละกล่อง
 */

interface CreationPDFOptions {
  startSeal: string;
  totalCount: number;
  peaName: string;
  peaCode: string;
  issuer: {
    first_name?: string;
    last_name?: string;
    username: string;
    pea_code?: string;
  };
  timestamp?: Date;
  maxPerBox?: number;
}

interface BoxEntry {
  boxNum: number;
  firstSeal: string;
  lastSeal: string;
  count: number;
}

function toBuddhistDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = (date.getFullYear() + 543).toString();
  return `${d}/${m}/${y}`;
}

function toThaiTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function getThaiMonth(date: Date): string {
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  return months[date.getMonth()];
}

function computeBoxes(startSeal: string, totalCount: number, maxPerBox: number): BoxEntry[] {
  const m = startSeal.match(/^([A-Za-z]*)(\d+)$/);
  if (!m) {
    return [{ boxNum: 1, firstSeal: startSeal, lastSeal: startSeal, count: totalCount }];
  }

  const prefix = m[1];
  const startNum = parseInt(m[2], 10);
  const numLen = m[2].length;

  const boxes: BoxEntry[] = [];
  let remaining = totalCount;
  let currentStart = startNum;
  let boxNum = 1;

  while (remaining > 0) {
    const boxCount = Math.min(remaining, maxPerBox);
    const firstSeal = `${prefix}${currentStart.toString().padStart(numLen, '0')}`;
    const lastSeal = `${prefix}${(currentStart + boxCount - 1).toString().padStart(numLen, '0')}`;
    boxes.push({ boxNum, firstSeal, lastSeal, count: boxCount });
    currentStart += boxCount;
    remaining -= boxCount;
    boxNum++;
  }

  return boxes;
}

export function generateCreationPDF(options: CreationPDFOptions): void {
  const { startSeal, totalCount, peaName, peaCode, issuer, timestamp } = options;
  const maxPerBox = options.maxPerBox ?? 1000;
  const now = timestamp ?? new Date();

  const thaiDate = toBuddhistDate(now);
  const thaiTime = toThaiTime(now);
  const thaiMonth = getThaiMonth(now);
  const buddhistYear = (now.getFullYear() + 543).toString();

  const issuerFullName = `${issuer.first_name ?? ''} ${issuer.last_name ?? ''}`.trim() || issuer.username;

  const boxes = computeBoxes(startSeal, totalCount, maxPerBox);
  const totalBoxes = boxes.length;

  // Build data rows — จำนวนรวม rowspan บรรทัดแรกคลุมทั้งหมด
  let dataRows = '';
  boxes.forEach((box, idx) => {
    if (idx === 0) {
      dataRows += `
        <tr>
          <td>${idx + 1}</td>
          <td>${box.boxNum}</td>
          <td class="bold">${box.firstSeal}</td>
          <td class="bold">${box.lastSeal}</td>
          <td>${box.count.toLocaleString()}</td>
          <td class="bold total-cell" rowspan="${totalBoxes}">${totalCount.toLocaleString()}</td>
        </tr>`;
    } else {
      dataRows += `
        <tr>
          <td>${idx + 1}</td>
          <td>${box.boxNum}</td>
          <td class="bold">${box.firstSeal}</td>
          <td class="bold">${box.lastSeal}</td>
          <td>${box.count.toLocaleString()}</td>
        </tr>`;
    }
  });

  // Footer row
  const footerRow = `
    <tr class="footer-row">
      <td colspan="2" class="center bold">จำนวนกล่องทั้งหมด</td>
      <td class="center bold">${totalBoxes}</td>
      <td class="center">รวมทั้งหมด</td>
      <td class="center bold">${totalCount.toLocaleString()}</td>
      <td class="center bold">${totalCount.toLocaleString()}</td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 landscape; margin: 0; }
    body {
      font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
      font-size: 12px; color: #000; background: #fff;
      padding: 10mm 14mm;
      position: relative;
    }
    .print-info {
      position: absolute; right: 14mm; top: 10mm;
      font-size: 11px; color: #555;
    }
    h2 { font-size: 18px; text-align: center; margin-bottom: 6px; }
    .sub-title { text-align: center; font-size: 13px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    col.c-no   { width: 6%; }
    col.c-box  { width: 8%; }
    col.c-s1   { width: 20%; }
    col.c-s2   { width: 20%; }
    col.c-cnt  { width: 9%; }
    col.c-tot  { width: 12%; }
    th, td {
      border: 1px solid #000; padding: 4px 6px;
      vertical-align: middle; font-size: 11.5px; text-align: center;
    }
    th { background: #fff; font-weight: 700; }
    .bold { font-weight: 700; }
    .total-cell { font-weight: 700; vertical-align: middle; }
    .footer-row td { font-weight: bold; background: #f5f5f5; }
    .issuer-line { margin-top: 16px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="print-info">พิมพ์เมื่อ: ${thaiDate} ${thaiTime} น.</div>
  <h2>ใบเบิกซีล</h2>
  <div class="sub-title">
    กฟภ. <u>${peaName}</u>
    &nbsp;&nbsp; เดือน <u>${thaiMonth}</u>
    &nbsp;&nbsp; พ.ศ. <u>${buddhistYear}</u>
  </div>
  <table>
    <colgroup>
      <col class="c-no"/><col class="c-box"/>
      <col class="c-s1"/><col class="c-s2"/>
      <col class="c-cnt"/><col class="c-tot"/>
    </colgroup>
    <thead>
      <tr>
        <th>ลำดับ</th>
        <th>กล่องที่</th>
        <th>Pea.Number(หัว)</th>
        <th>Pea.Number(ท้าย)</th>
        <th>จำนวน</th>
        <th>จำนวนรวม</th>
      </tr>
    </thead>
    <tbody>
      ${dataRows}
      ${footerRow}
    </tbody>
  </table>
  <div class="issuer-line">
    ผู้เบิก: ${issuerFullName}
    &nbsp;&nbsp;&nbsp; สังกัด: ${peaName} (${peaCode})
  </div>
</body>
</html>`;

  const existingFrame = document.getElementById('__seal_creation_print_frame__');
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = '__seal_creation_print_frame__';
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    alert('ไม่สามารถสร้าง iframe สำหรับพิมพ์ได้');
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 2000);
    }, 600);
  };
}
