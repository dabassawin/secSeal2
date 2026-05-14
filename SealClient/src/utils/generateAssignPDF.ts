/**
 * generateAssignPDF.ts
 * สร้างใบจ่ายซีล — ใช้ iframe ซ่อนเพื่อให้ print dialog ขึ้นทันที
 * โดยไม่ต้องเปิดหน้าต่างใหม่ให้ผู้ใช้เห็น HTML preview
 */

interface AssignPDFOptions {
  sealNumbers: string[];
  technician: {
    first_name: string;
    last_name?: string;
    technician_code: string;
    pea_code?: string;
    company_name?: string;
    is_center?: boolean;
  };
  issuer: {
    first_name?: string;
    last_name?: string;
    username: string;
    pea_code?: string;
  };
  peaName?: string;
  timestamp?: Date; // เพิ่ม timestamp ของเวลาจริงที่จ่ายซีล
  isToUser?: boolean; // ระบุว่าเป็นฝ่าย User หรือไม่
}

function toBuddhistDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = (date.getFullYear() + 543).toString();
  return `${day}/${month}/${year}`;
}

function toThaiTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getThaiMonth(date: Date): string {
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  return months[date.getMonth()];
}

export function generateAssignPDF(options: AssignPDFOptions): void {
  const { sealNumbers, technician, issuer, peaName, timestamp, isToUser } = options;
  const now = timestamp || new Date(); // ใช้ timestamp ที่ส่งมา ถ้ามี ไม่งั้นใช้เวลาปัจจุบัน
  const thaiDate = toBuddhistDate(now);
  const thaiTime = toThaiTime(now);
  const thaiMonth = getThaiMonth(now);
  const buddhistYear = (now.getFullYear() + 543).toString();

  const techFullName = technician.is_center
    ? technician.first_name
    : `${technician.first_name} ${technician.last_name || ''}`.trim();
  const techAffiliation = peaName || technician.pea_code || technician.company_name || '-';
  const issuerFullName = `${issuer.first_name || ''} ${issuer.last_name || ''}`.trim() || issuer.username;
  const issuerAffiliation = peaName || issuer.pea_code || '-';

  // สร้างแถวข้อมูล
  let dataRows = '';
  let rowCount = 0;

  if (isToUser && sealNumbers.length > 0) {
    // สำหรับ User Side แสดงเฉพาะตัวแรกและตัวสุดท้าย
    const firstSeal = sealNumbers[0];
    const lastSeal = sealNumbers.length > 1 ? sealNumbers[sealNumbers.length - 1] : null;

    dataRows += `
      <tr>
        <td class="center">${sealNumbers.length}</td>
        <td class="center bold">${firstSeal}</td>
        <td class="center">${thaiDate}</td>
        <td>${techFullName}<br/><span class="sub">${techAffiliation}</span></td>
        <td class="sign-cell"></td>
        <td>${issuerFullName}<br/><span class="sub">${issuerAffiliation}</span></td>
        <td class="sign-cell"></td>
      </tr>`;
    rowCount++;

    if (lastSeal) {
      dataRows += `
        <tr>
          <td class="center"></td>
          <td class="center bold">${lastSeal}</td>
          <td class="center">${thaiDate}</td>
          <td>${techFullName}<br/><span class="sub">${techAffiliation}</span></td>
          <td class="sign-cell"></td>
          <td>${issuerFullName}<br/><span class="sub">${issuerAffiliation}</span></td>
          <td class="sign-cell"></td>
        </tr>`;
      rowCount++;
    }
  } else {
    dataRows = sealNumbers.map((sealNum, idx) => `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center bold">${sealNum}</td>
        <td class="center">${thaiDate}</td>
        <td>${techFullName}<br/><span class="sub">${techAffiliation}</span></td>
        <td class="sign-cell"></td>
        <td>${issuerFullName}<br/><span class="sub">${issuerAffiliation}</span></td>
        <td class="sign-cell"></td>
      </tr>`).join('');
    rowCount = sealNumbers.length;
  }

  // แถวว่างให้ครบ 20 แถว
  const minRows = 20;
  const emptyCount = Math.max(0, minRows - rowCount);
  const emptyRows = Array(emptyCount).fill(`
    <tr>
      <td class="center">&nbsp;</td>
      <td></td><td></td><td></td>
      <td class="sign-cell"></td>
      <td></td>
      <td class="sign-cell"></td>
    </tr>`).join('');

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
      padding: 10mm 12mm;
    }
    .gff-line { font-size: 13px; margin-bottom: 6px; }
    .gff-line u { display: inline-block; min-width: 120px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td {
      border: 1px solid #000;
      padding: 3px 5px;
      vertical-align: middle;
      font-size: 11.5px;
      word-wrap: break-word;
    }
    th { text-align: center; font-weight: 700; background: #fff; }
    .sign-cell { min-height: 24px; height: 24px; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .sub { font-size: 10px; color: #444; }
    col.c-no   { width: 5%; }
    col.c-ser  { width: 16%; }
    col.c-date { width: 9%; }
    col.c-name { width: 18%; }
    col.c-sign { width: 10%; }
    col.c-name2{ width: 18%; }
    col.c-sign2{ width: 10%; }
  </style>
</head>
<body>
<div>
  <div style="text-align: center; margin-bottom: 15px; position: relative;">
    <h2 style="font-size: 18px; margin: 0;">ใบเบิกจ่ายซีล</h2>
    <div style="position: absolute; right: 0; bottom: 0; font-size: 12px; color: #333;">
      พิมพ์เมื่อ/เวลาที่ทำรายการ: ${thaiDate} ${thaiTime} น.
    </div>
  </div>
  <div class="gff-line">
    กฟภ. <u>${peaName || issuer.pea_code || ''}</u>
    &nbsp;&nbsp; เดือน <u>${thaiMonth}</u>
    &nbsp;&nbsp; พ.ศ. <u>${buddhistYear}</u>
  </div>
  <table>
    <colgroup>
      <col class="c-no"/><col class="c-ser"/><col class="c-date"/>
      <col class="c-name"/><col class="c-sign"/>
      <col class="c-name2"/><col class="c-sign2"/>
    </colgroup>
    <thead>
      <tr>
        <th rowspan="2">${isToUser ? 'จำนวน' : 'ลำดับที่'}</th>
        <th rowspan="2">หมายเลข Serial no.</th>
        <th rowspan="2">วัน/เดือน/ปี</th>
        <th colspan="2">ผู้รับ</th>
        <th colspan="2">ผู้จ่าย</th>
      </tr>
      <tr>
        <th>ชื่อ-สกุล สังกัด</th>
        <th>ลายเซ็น</th>
        <th>ชื่อ-สกุล สังกัด</th>
        <th>ลายเซ็น</th>
      </tr>
    </thead>
    <tbody>
      ${dataRows}
      ${emptyRows}
    </tbody>
  </table>
</div>
</body>
</html>`;

  // ใช้ iframe ซ่อน — print dialog ขึ้นโดยไม่ต้องเปิดหน้าต่างใหม่
  const existingFrame = document.getElementById('__seal_print_frame__');
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = '__seal_print_frame__';
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

  // รอให้ font โหลดก่อนแล้วค่อย print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // ลบ iframe หลัง print เสร็จ
      setTimeout(() => iframe.remove(), 2000);
    }, 600);
  };
}
