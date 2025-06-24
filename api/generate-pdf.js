// api/generate-pdf.js (개선된 버전)
const chromium = require('chrome-aws-lambda');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'POST 메서드만 허용됩니다.' });
  }

  let browser = null;
  try {
    const { htmlContent } = request.body;
    if (!htmlContent) {
      return response.status(400).json({ error: 'HTML 내용이 없습니다.' });
    }

    browser = await chromium.puppeteer.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true, // 항상 headless 모드로 실행
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'attachment; filename="운행일지.pdf"');
    return response.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('PDF 생성 심각한 오류:', error);
    // 사용자에게 더 친절한 에러 메시지 반환
    return response.status(500).json({ 
      error: 'PDF 생성 중 서버에서 오류가 발생했습니다.', 
      details: error.message 
    });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}