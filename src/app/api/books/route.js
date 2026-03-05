const decodeEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&#40;/g, '(').replace(/&#41;/g, ')')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#183;/g, '·').replace(/&middot;/g, '·');
};

const sanitizeQuery = (query) => {
  return query
    .replace(/[:\.\[\]()'"""''·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseXmlBooks = (xmlText) => {
  const totalMatch = xmlText.match(/<list_total_count>(\d+)<\/list_total_count>/);
  const totalCount = totalMatch ? parseInt(totalMatch[1]) : 0;

  const codeMatch = xmlText.match(/<CODE>(.*?)<\/CODE>/);
  const code = codeMatch ? codeMatch[1] : '';

  const rows = [];
  const rowMatches = xmlText.matchAll(/<row>([\s\S]*?)<\/row>/g);

  for (const rowMatch of rowMatches) {
    const rowXml = rowMatch[1];
    const getVal = (tag) => {
      const m = rowXml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 's'));
      if (!m) return '';
      const rawValue = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
      return decodeEntities(rawValue);
    };
    rows.push({
      TITLE:    getVal('TITLE'),
      AUTHOR:   getVal('AUTHOR'),
      PUBLER:   getVal('PUBLER'),
      PUBYEAR:  getVal('PUBYEAR'),
      ISBN:     getVal('ISBN'),
      CATEGORY: getVal('CATEGORY'),
      VOL:      getVal('VOL'),
    });
  }
  return { totalCount, code, rows };
};

const sortByRelevance = (rows, originalQuery) => {
  const terms = sanitizeQuery(originalQuery)
    .split(' ').filter(Boolean).map((t) => t.toLowerCase());

  return rows
    .map((book) => {
      const title  = (book.TITLE  || '').toLowerCase();
      const author = (book.AUTHOR || '').toLowerCase();
      const matchCount      = terms.filter((t) => title.includes(t)).length;
      const allMatched      = matchCount === terms.length;
      const startsWithQuery = title.startsWith(terms[0]);
      const authorMatch     = terms.some((t) => author.includes(t)) ? 1 : 0;
      return { ...book, _score: { allMatched, matchCount, startsWithQuery, authorMatch } };
    })
    .sort((a, b) => {
      const sa = a._score, sb = b._score;
      if (sb.allMatched      !== sa.allMatched)      return Number(sb.allMatched)      - Number(sa.allMatched);
      if (sb.matchCount      !== sa.matchCount)      return sb.matchCount      - sa.matchCount;
      if (sb.startsWithQuery !== sa.startsWithQuery) return Number(sb.startsWithQuery) - Number(sa.startsWithQuery);
      return sb.authorMatch - sa.authorMatch;
    })
    .map(({ _score, ...book }) => book);
};

const fetchWithFallback = async (query, start, end, apiKey) => {
  const terms = sanitizeQuery(query).split(' ').filter(Boolean);

  for (let i = terms.length; i >= 1; i--) {
    const shortQuery = terms.slice(0, i).join(' ');
    const url = `http://openapi.seoul.go.kr:8088/${apiKey}/xml/SeoulLibraryBookSearchInfo/${start}/${end}/${encodeURIComponent(shortQuery)}`;

    console.log(`🔍 검색 시도 (${i}단어): "${shortQuery}"`);

    const res = await fetch(url);
    if (!res.ok) continue;

    const xmlText = await res.text();
    const { totalCount, code, rows } = parseXmlBooks(xmlText);

    if (code !== 'INFO-200' && rows.length > 0) {
      console.log(`✅ 성공: "${shortQuery}" → ${rows.length}건`);
      return { totalCount, rows };
    }
  }

  return { totalCount: 0, rows: [] };
};

// 썸네일 URL 크기 업스케일
// ✅ 변경 — fname 파라미터에서 원본 이미지 URL 직접 추출
const upscaleThumbnail = (url) => {
  if (!url) return '';
  try {
    const fnameMatch = url.match(/[?&]fname=([^&]+)/);
    if (fnameMatch) {
      // 원본 URL 디코딩해서 반환
      return decodeURIComponent(fnameMatch[1]);
    }
    return url;
  } catch {
    return url;
  }
};

// 카카오 API로 ISBN → 표지 이미지 조회
const fetchCoverFromKakao = async (isbn) => {
  if (!isbn || !process.env.KAKAO_API_KEY) return '';
  try {
    const cleanIsbn = isbn.split(' ')[0].replace(/-/g, '');
    const res = await fetch(
      `https://dapi.kakao.com/v3/search/book?target=isbn&query=${cleanIsbn}`,
      {
        headers: { Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}` },
        next: { revalidate: 86400 },
      }
    );
    if (!res.ok) return '';
    const data = await res.json();
    const thumbnail = data?.documents?.[0]?.thumbnail || '';

    console.log('📸 썸네일 URL:', thumbnail);

    // 크기 업스케일 적용
    return upscaleThumbnail(thumbnail);
  } catch {
    return '';
  }
};

// 5개씩 병렬 배치 처리
const fetchCoversInBatches = async (books, batchSize = 5) => {
  const results = [];
  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    const covers = await Promise.all(batch.map((b) => fetchCoverFromKakao(b.ISBN)));
    results.push(...covers);
  }
  return results;
};

const PAGE_SIZE = 20;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const page  = parseInt(searchParams.get('page') || '1', 10);

  if (!query) return Response.json({ error: '검색어가 없습니다.' }, { status: 400 });
  if (!process.env.SEOUL_LIBRARY_API_KEY) return Response.json({ error: '서울도서관 API 키 없음' }, { status: 500 });

  try {
    const start    = page === 1 ? 1   : (page - 1) * PAGE_SIZE + 1;
    const end      = page === 1 ? 100 : page * PAGE_SIZE;
    const needSort = page === 1;

    const { totalCount, rows } = await fetchWithFallback(
      query, start, end, process.env.SEOUL_LIBRARY_API_KEY
    );

    if (rows.length === 0) return Response.json({ totalCount: 0, books: [] });

    const sortedRows = needSort
      ? sortByRelevance(rows, query).slice(0, PAGE_SIZE)
      : rows;

    const covers = await fetchCoversInBatches(sortedRows);
    const booksWithCovers = sortedRows.map((book, i) => ({
      ...book,
      COVER: covers[i] || '',
    }));

    return Response.json({ totalCount, books: booksWithCovers });

  } catch (err) {
    console.error('❌ 에러:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}