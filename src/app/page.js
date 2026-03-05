'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import BookCard from './components/BookCard/BookCard';
import BookmarkModal from './components/BookModal/BookmarkModal';

const PAGE_SIZE = 20;

export default function Home() {
	const [query, setQuery] = useState('');
	const [books, setBooks] = useState([]); 
	const [page, setPage] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [hasSearched, setHasSearched] = useState(false);
	const [newBooks, setNewBooks] = useState([]);
	const [newLoading, setNewLoading] = useState(true);
	const [bookmarks, setBookmarks] = useState({});
	const [modalBook, setModalBook] = useState(null);
	const inputRef = useRef(null);

	const totalPages = Math.ceil(totalCount / PAGE_SIZE);
	const bookmarkCount = Object.keys(bookmarks).length;
	const isSearchMode = query.trim() !== '';

	// 북마크 로드
	useEffect(() => {
		const saved = localStorage.getItem('najunge_bookmarks');
		if (saved) setBookmarks(JSON.parse(saved));
	}, []);

  	// 신작 도서 로드
	const fetchNewArrivals = async () => {
		setNewLoading(true);

		try {
		const res = await fetch('/api/newarrivals');
		if (!res.ok) throw new Error();
		const data = await res.json();
		setNewBooks(data.books || []);
		} catch {
		setNewBooks([]);
		} finally {
		setNewLoading(false);
		}
	};
	useEffect(() => { fetchNewArrivals(); }, []);

	// 검색어를 입력하면 리랜더링
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (!hasSearched && query.trim() === '') {
				fetchNewArrivals();
			}
		};
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
	}, [hasSearched, query]);

	// API 호출 함수
	const fetchBooks = async (searchQuery, pageNum) => {
		if (!searchQuery.trim()) return;
		setLoading(true);
		setError(null);

		try {
			const url = `/api/books?query=${encodeURIComponent(searchQuery)}&page=${pageNum}`;
			const res = await fetch(url);

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.error || `서버 오류: ${res.status}`);
			}

			const data = await res.json();
			if (data.error) throw new Error(data.error);

			setBooks(data.books || []);
			setTotalCount(data.totalCount || 0);
			setHasSearched(true);
		} catch (err) {
			setError(err.message);
			setBooks([]);
		} finally {
			setLoading(false);
		}
	};

	// 검색필드에 아무것도 적지않을때
	useEffect(() => {
		if (query.trim() === '') {
			setBooks([]);
			setTotalCount(0);
			setHasSearched(false);
			setError(null);
			setPage(1);
			return;
		}

		// 자동검색 디바운스 0.5초
		const timeoutId = setTimeout(() => {
		setPage(1);
		fetchBooks(query, 1);
		}, 500);

		// 자동검색 디바운스, 클린업
		return () => clearTimeout(timeoutId);
	}, [query]);


	// 페이지 변경 시 API 재호출
	const handlePageChange = (newPage) => {
		setPage(newPage);
		fetchBooks(query, newPage);
	};

	// 북마크 업데이트
	const saveBookmarks = (updated) => {
		setBookmarks(updated);
		localStorage.setItem('najunge_bookmarks', JSON.stringify(updated));
	};

	// 북마크 클릭 이벤트 -> 도서 정보를 모달 팝업에 저장
	const handleBookmarkClick  = (book) => setModalBook(book);

	// 북마크 저장 이벤트 -> 도서 정보를 북마크에 저장
	const handleBookmarkSave   = (book, memo) => {
		const key = book.ISBN || book.TITLE;
		saveBookmarks({ ...bookmarks, [key]: { ...book, memo, savedAt: new Date().toISOString() } });
	};
  
	// 북마크 삭제 이벤트 -> 도서 정보를 북마크에서 삭제
	const handleBookmarkRemove = (book) => {
		const key = book.ISBN || book.TITLE;
		const updated = { ...bookmarks };
		delete updated[key];
		saveBookmarks(updated);
	};

	const isBookmarked    = (book) => !!bookmarks[book.ISBN || book.TITLE];
	const getExistingMemo = (book) => bookmarks[book.ISBN || book.TITLE]?.memo || '';

	return (
		<div className="wrap">
			{/* Header */}
			<header className="header">
				<div className="header-wrap">
				<h1 className="logo">
					<img src="/images/logo.png" alt="나중에볼랭 로고" />
				</h1>
				<Link href="/bookmarks" className="b-normal b-togo">
					My Bookmarks
					{bookmarkCount > 0 && <span className="num">{bookmarkCount}</span>}
				</Link>
				</div>
			</header>

			<div className='container' role='main'>
				{/* Search */}
				<section className="search">
					<p className="search-text">
						추천받은 도서를 검색하고, <br />간단히 메모를 남겨 나만의 도서 목록을 만들어보세요.
					</p>
					<div className="search-field">
						<input
							ref={inputRef}
							type="text"
							className="input"
							placeholder="책 제목 또는 저자를 검색해주세요"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
					</div>
					<div className="spinner-wrap">
						{loading && <span className="spinner" />}
					</div>
				</section>

				{/* Content */}
				<section className="content">
					{error && <div className="error"><span>⚠️</span> {error}</div>}

					{/* 검색 모드 */}
					{isSearchMode && (
						<>
							{hasSearched && !loading && books.length === 0 && !error && (
								<div className="empty">
									<div className="empty-icon">📭</div>
									<p>검색 결과가 없습니다. 다른 키워드로 검색해보세요.</p>
								</div>
							)}

							{books.length > 0 && (
							<>
								<h2 className="sr-only">검색결과</h2>
								<div className="result">
									{/* ✅ 전체 건수 그대로 표시 */}
									<span>총 <strong>{totalCount.toLocaleString()}</strong>건</span>
									<span className="result-num">{page} / {totalPages} 페이지</span>
								</div>

								<div className="book-list">
									{books.map((book, idx) => (
										<BookCard
										// ISBN이 중복될 수 있으므로 index를 조합하여 유일한 key를 만듭니다.
										key={`${book.ISBN || book.TITLE}-${idx}`} 
										book={book}
										isBookmarked={isBookmarked(book)}
										onBookmarkClick={handleBookmarkClick}
										/>
									))}
								</div>

								{totalPages > 1 && (
								<div className="pagination">
									<button
										className="b-sm b-page"
										onClick={() => handlePageChange(1)}
										disabled={page === 1}
										title="처음 페이지로 이동"
									>
									«
									</button>
									<button
										className="b-sm b-page"
										onClick={() => handlePageChange(page - 1)}
										disabled={page === 1}
										title="앞 페이지로 이동"
									>
									←
									</button>
									<div className="numbers-wrap">
										{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
											let pageNum;
											if (totalPages <= 5)             pageNum = i + 1;
											else if (page <= 3)              pageNum = i + 1;
											else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
											else                             pageNum = page - 2 + i;
											return (
											<button
												key={pageNum}
												className={`b-sm b-num ${page === pageNum ? 'active' : ''}`}
												title={page === pageNum ? '현재 페이지' : ''}
												onClick={() => handlePageChange(pageNum)}
											>
												{pageNum}
											</button>
											);
										})}
									</div>
									<button
										className="b-sm b-page"
										onClick={() => handlePageChange(page + 1)}
										disabled={page === totalPages}
										title="다음 페이지로 이동"
									>
										→
									</button>
									<button
										className="b-sm b-page"
										onClick={() => handlePageChange(totalPages)}
										disabled={page === totalPages}
										title="마지막 페이지로 이동"
									>
										»
									</button>
								</div>
								)}
							</>
							)}
						</>
					)}

					{/* 초기화면 — 신작 도서 */}
					{!isSearchMode && (
					<>
						{newLoading ? (
						<div className="empty">
							<div className="empty-icon">📖</div>
							<p>최신 신작 도서를 불러오는 중...</p>
						</div>
						) : (
						<>
							<div className="result">
								<h2>서울도서관 신작 도서</h2>
								<a href="https://lib.seoul.go.kr/newarrival?category=all&newdays=30"
									className="b-more"
									target="_blank"
									rel="noopener noreferrer"
								>
									더보기 →
								</a>
							</div>
							<div className="book-list">
								{newBooks.map((book, idx) => (
									<BookCard
									key={`${book.ISBN || book.TITLE}-${idx}`} 
									book={book}
									isBookmarked={isBookmarked(book)}
									onBookmarkClick={handleBookmarkClick}
									/>
								))}
							</div>
						</>
						)}
					</>
				)}
				</section>

				{/* 모달창 */}
				{modalBook && (
					<BookmarkModal
						book={modalBook}
						existingMemo={getExistingMemo(modalBook)}
						onSave={handleBookmarkSave}
						onClose={() => setModalBook(null)}
					/>
				)}
			</div>
		</div>
	);
}