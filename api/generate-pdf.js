// api/generate-pdf.js (개선된 버전)
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { nanumGothicBase64 } from "./_font.js"; // 폰트 데이터 분리

export default function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'POST 메서드만 허용됩니다.' });
  }

  try {
    const { logEntries, userInfo, summary } = request.body;
    if (!logEntries || !userInfo || !summary) {
      return response.status(400).json({ error: '필수 데이터가 누락되었습니다.' });
    }

    const doc = new jsPDF('p', 'mm', 'a4');

    // 1. 한글 폰트 추가
    doc.addFileToVFS('NanumGothic.ttf', nanumGothicBase64);
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
    doc.setFont('NanumGothic', 'normal');

    const pageMargin = 15;

    // 2. 제목
    doc.setFontSize(24);
    doc.text("차량 운행 일지", doc.internal.pageSize.getWidth() / 2, pageMargin + 5, { align: 'center' });

    // 3. 사용자 정보
    doc.setFontSize(11);
    doc.text(`성명: ${userInfo.name}`, pageMargin, pageMargin + 25);
    doc.text(`사번: ${userInfo.id}`, pageMargin + 70, pageMargin + 25);
    doc.text(`작성일자: ${userInfo.creationDate}`, pageMargin + 130, pageMargin + 25);

    // 4. 메인 테이블
    const mainTableHead = [['일자', '출발지', '도착지', '목적', '유종', '연비', '주행(km)', '유가', '통행료', '주차비', '기타', '합계', '비고']];
    const mainTableBody = logEntries.map(entry => [
        entry.date, entry.start, entry.end, entry.purpose,
        entry.fuelTypeName, entry.fuelEfficiency, entry.distance, entry.fuelPrice,
        entry.toll, entry.parking, entry.etc, entry.total, entry.remarks
    ].map(String)); // 모든 데이터를 문자열로 변환

    doc.autoTable({
        head: mainTableHead,
        body: mainTableBody,
        startY: pageMargin + 32,
        theme: 'grid',
        styles: { font: 'NanumGothic', fontSize: 6.5, cellPadding: 1.5, halign: 'center' },
        headStyles: { fillColor: [233, 236, 239], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'left' }, 12: { halign: 'left' } }
    });

    const lastTableY = doc.lastAutoTable.finalY;

    // 5. 정산 내역
    doc.setFontSize(11);
    doc.text("정산 내역", pageMargin, lastTableY + 10);

    const summaryBody = [
        ['총 주행거리 (km)', summary.totalDistance, '감가율', '1.2'],
        ['유류대 합계 (원)', summary.totalFuelCost, '총 경비 합계 (원)', summary.grandTotal]
    ];

    doc.autoTable({
        body: summaryBody,
        startY: lastTableY + 15,
        theme: 'grid',
        styles: { font: 'NanumGothic', fontSize: 9 },
        didParseCell: function (data) {
            if (data.column.index === 0 || data.column.index === 2) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [233, 236, 239];
            }
            if (data.row.index === 1 && data.column.index === 3) {
                 data.cell.styles.fontStyle = 'bold';
                 data.cell.styles.textColor = [225, 29, 72];
            }
        }
    });

    // 6. PDF 버퍼 생성 및 전송
    const pdfBuffer = doc.output('arraybuffer');
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="차량운행일지.pdf"`);
    return response.status(200).send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error("PDF 생성 오류:", error);
    return response.status(500).json({ error: 'PDF 생성 중 서버 오류 발생', details: error.message });
  }
}