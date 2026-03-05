// app/api/newarrivals/route.js

// HTML 엔티티 변환 함수
const decodeEntities = (text) => {
  return text
    .replace(/&#40;/g, '(')
    .replace(/&#41;/g, ')')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

const fetchCoverFromKakao = async (title, author) => {
  const kakaoKey = process.env.KAKAO_CLIENT_ID;
  if (!kakaoKey) return '';

  try {
    // 검색 최적화: 부제목(: 뒤) 제거 및 특수문자 정제
    const searchTitle = title.split(':')[0].replace(/[\(\)\[\]]/g, ' ').trim();
    const query = encodeURIComponent(`${searchTitle} ${author.split(' ')[0]}`);
    
    const response = await fetch(`https://dapi.kakao.com/v3/search/book?target=title&query=${query}`, {
      headers: { Authorization: `KakaoAK ${kakaoKey}` }
    });
    
    const data = await response.json();
    return data.documents?.[0]?.thumbnail || '';
  } catch (error) {
    return '';
  }
};

const parseNewArrivals = (html) => {
  const books = [];
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) return books;

  const trMatches = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

  for (const tr of trMatches) {
    const trHtml = tr[1];
    if (trHtml.includes('<th')) continue;

    const tds = [...trHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      decodeEntities(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    );

    if (tds.length < 6) continue;
    if (!/^\d+$/.test(tds[0])) continue;

    const linkMatch = trHtml.match(/href="(\/search\/detail\/[^"]+)"/);
    books.push({
      TITLE: tds[1], // 이제 &#40; 등이 ( 로 변환됨
      AUTHOR: tds[2],
      PUBLER: tds[3],
      PUBYEAR: tds[4],
      ACQUIRED: tds[5].replace(/\D/g, '').replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3'),
      DETAIL_URL: linkMatch ? `https://lib.seoul.go.kr${linkMatch[1]}` : '',
      COVER: '' 
    });
  }
  return books;
};

export async function GET() {
  try {
    const res = await fetch('https://lib.seoul.go.kr/newarrival?category=all&newdays=30', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await res.text();
    const rawBooks = parseNewArrivals(html).slice(0, 12);

    // ✅ 카카오 API로 이미지 채우기
    const booksWithCovers = await Promise.all(
      rawBooks.map(async (book) => ({
        ...book,
        COVER: await fetchCoverFromKakao(book.TITLE, book.AUTHOR)
      }))
    );

    return Response.json({ books: booksWithCovers });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}