/**
 * generateTransferPDF.ts
 * สร้างใบจ่ายซีลแบบกลุ่ม (สำหรับโอนให้ฝ่ายบัญชี) — แสดงผลรวมเป็นจำนวนและช่วงซีล
 */

interface TransferPDFOptions {
  sealNumbers: string[];
  receiverName: string;
  receiverAffiliation: string;
  issuer: {
    first_name?: string;
    last_name?: string;
    username: string;
    pea_code?: string;
  };
  peaName?: string;
  timestamp?: Date;
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

function groupSealNumbers(sealNumbers: string[]) {
    const parsed = sealNumbers.map(s => {
        const match = s.match(/^([a-zA-Z]+)(\d+)$/);
        if (match) {
            return { raw: s, prefix: match[1], num: parseInt(match[2], 10), numStr: match[2] };
        }
        return { raw: s, prefix: s, num: 0, numStr: '' };
    });
    
    parsed.sort((a, b) => {
        if (a.prefix !== b.prefix) return a.prefix.localeCompare(b.prefix);
        return a.num - b.num;
    });

    const groups: any[] = [];
    if (parsed.length === 0) return groups;

    let currentGroup = { ...parsed[0], startNum: parsed[0].num, endNum: parsed[0].num, startString: parsed[0].raw, endString: parsed[0].raw, count: 1 };

    for (let i = 1; i < parsed.length; i++) {
        const curr = parsed[i];
        if (curr.prefix === currentGroup.prefix && curr.num === currentGroup.endNum + 1 && curr.numStr.length === currentGroup.numStr.length) {
            currentGroup.endNum = curr.num;
            currentGroup.endString = curr.raw;
            currentGroup.count++;
        } else {
            groups.push(currentGroup);
            currentGroup = { ...curr, startNum: curr.num, endNum: curr.num, startString: curr.raw, endString: curr.raw, count: 1 };
        }
    }
    groups.push(currentGroup);

    return groups;
}

export function generateTransferPDF(options: TransferPDFOptions): void {
  const { sealNumbers, receiverName, receiverAffiliation, issuer, peaName, timestamp } = options;
  const now = timestamp || new Date();
  const thaiDate = toBuddhistDate(now);
  const thaiTime = toThaiTime(now);
  const thaiMonth = getThaiMonth(now);
  const buddhistYear = (now.getFullYear() + 543).toString();

  const issuerFullName = `${issuer.first_name || ''} ${issuer.last_name || ''}`.trim() || issuer.username;
  const issuerAffiliation = peaName || issuer.pea_code || '-';

  // เรียงซีลเพื่อหาซีลแรกและซีลสุดท้าย
  const sortedSeals = [...sealNumbers].sort((a, b) => {
    const ma = a.match(/^([a-zA-Z]+)(\d+)$/);
    const mb = b.match(/^([a-zA-Z]+)(\d+)$/);
    if (ma && mb) {
      if (ma[1] !== mb[1]) return ma[1].localeCompare(mb[1]);
      return parseInt(ma[2], 10) - parseInt(mb[2], 10);
    }
    return a.localeCompare(b);
  });

  const totalCount = sortedSeals.length;
  const firstSeal = sortedSeals[0] || '';
  const lastSeal = sortedSeals[sortedSeals.length - 1] || '';

  let dataRows = '';
  let rowCount = 0;

  if (totalCount === 1) {
    // ซีลเดียว — 1 แถว
    dataRows = `
      <tr>
        <td class="center">1</td>
        <td class="center bold">${firstSeal}</td>
        <td class="center">${thaiDate}</td>
        <td>${receiverName}<br/><span class="sub">${receiverAffiliation}</span></td>
        <td class="sign-cell"></td>
        <td>${issuerFullName}<br/><span class="sub">${issuerAffiliation}</span></td>
        <td class="sign-cell"></td>
      </tr>`;
    rowCount = 1;
  } else {
    // หลายซีล — แสดงเป็น 1 กลุ่ม (ซีลแรก/ซีลสุดท้าย + จำนวนรวม)
    dataRows = `
      <tr>
        <td class="center" rowspan="2">${totalCount}</td>
        <td class="center bold">${firstSeal}</td>
        <td class="center" rowspan="2">${thaiDate}</td>
        <td rowspan="2">${receiverName}<br/><span class="sub">${receiverAffiliation}</span></td>
        <td class="sign-cell" rowspan="2"></td>
        <td rowspan="2">${issuerFullName}<br/><span class="sub">${issuerAffiliation}</span></td>
        <td class="sign-cell" rowspan="2"></td>
      </tr>
      <tr>
        <td class="center bold">${lastSeal}</td>
      </tr>`;
    rowCount = 2;
  }


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
        <th rowspan="2">จำนวน</th>
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

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 2000);
    }, 600);
  };
}
