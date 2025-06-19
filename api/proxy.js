// 이 코드는 Vercel 서버에서 실행됩니다.
// Opinet API 요청을 중계해주는 역할을 합니다.

export default async function handler(request, response) {
  // 1. Opinet API 키를 Vercel 환경변수에서 안전하게 가져옵니다.
  const apiKey = process.env.OPINET_API_KEY;

  // 2. 사용자가 요청한 날짜를 가져옵니다. (예: ?date=20250619)
  //    URLSearchParams를 사용하여 쿼리 파라미터를 안전하게 파싱합니다.
  const requestUrl = new URL(request.url, `https://${request.headers.host}`);
  const date = requestUrl.searchParams.get('date');

  if (!date) {
    return response.status(400).json({ error: '날짜(date) 파라미터가 필요합니다.' });
  }

  // 3. 실제 Opinet API URL을 만듭니다.
  const targetUrl = `https://www.opinet.co.kr/api/avgAllPrice.do?out=json&code=${apiKey}&date=${date}`;

  try {
    // 4. Vercel 서버가 Opinet 서버로 데이터를 요청합니다.
    const apiResponse = await fetch(targetUrl);

    if (!apiResponse.ok) {
      // Opinet API가 에러를 반환한 경우
      throw new Error(`Opinet API 에러: ${apiResponse.statusText}`);
    }

    // 5. Opinet으로부터 받은 데이터를 JSON 형태로 변환합니다.
    const data = await apiResponse.json();

    // 6. 성공적으로 받은 데이터를 사용자 브라우저에게 전달합니다.
    //    어떤 출처에서든 이 프록시를 사용할 수 있도록 CORS 헤더를 추가해줍니다.
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // 1시간 캐시
    return response.status(200).json(data);

  } catch (error) {
    // 7. 에러가 발생한 경우
    console.error("프록시 에러:", error);
    return response.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
}