// api/generate-pdf.js
const chromium = require('chrome-aws-lambda');

export default async function handler(request, response) {
  // 1. POST 요청이 아니거나, body가 없으면 에러 처리
  if (request.method !== 'POST' || !request.body) {
    return response.status(400).json({ error: '잘못된 요청입니다.' });
  }

  let browser = null;

  try {
    // 2. 브라우저에서 보낸 운행일지 HTML 내용을 추출
    const { htmlContent } = JSON.parse(request.body);

    // 3. Vercel 서버 환경에서 가상 브라우저(Puppeteer) 실행
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // 4. 받은 HTML 내용을 가상 브라우저의 페이지에 설정
    //    waitUntil: 'networkidle0'는 페이지의 모든 네트워크 활동이 끝날 때까지 기다리는 옵션
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // 5. 페이지를 PDF로 변환
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // 배경 그래픽 인쇄
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    });

    // 6. 생성된 PDF를 사용자에게 전송
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'attachment; filename="운행일지.pdf"');
    return response.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('PDF 생성 오류:', error);
    return response.status(500).json({ error: 'PDF 생성 중 서버에서 오류가 발생했습니다.' });
  } finally {
    // 7. 브라우저가 열려 있으면 반드시 종료
    if (browser !== null) {
      await browser.close();
    }
  }
}
