"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BookmarkCard from '../components/BookmarkCard/BookmarkCard'
import BookmarkModal from '../components/BookModal/BookmarkModal';
import styles from './bookmarks.module.css';

export default function BookmarksPage() {
    const [bookmarks, setBookmarks] = useState({});
    const [editingBook, setEditingBook] = useState(null);
    const [filter, setFilter] = useState('');
    const [mounted, setMounted] = useState(false);

    // 북마크 목록 업데이트 후 가져오기
    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('najunge_bookmarks');
        if (saved) setBookmarks(JSON.parse(saved));
    }, []);

    // 북마크 저장 -> 업데이트
    const saveBookmarks = (updated) => {
        setBookmarks(updated);
        localStorage.setItem('najunge_bookmarks', JSON.stringify(updated));
    };

    // 북마크 삭제 -> 업데이트
    const handleRemove = (key) => {
        if (!confirm('북마크에서 삭제할까요?')) return;
        const updated = { ...bookmarks };
        delete updated[key];
        saveBookmarks(updated);
    };

    // 북마크 수정 -> 업데이트
    const handleEditSave = (book, memo) => {
        const key = book.ISBN || book.TITLE;
        saveBookmarks({ ...bookmarks, [key]: { ...bookmarks[key], memo } });
    };

    // 북마크 목록 필터링
    const entries = Object.entries(bookmarks);
    const filtered = filter
        ? entries.filter(([, book]) =>
            book.TITLE?.includes(filter) || book.AUTHOR?.includes(filter) || book.memo?.includes(filter)
        )
        : entries;


    //북마크 저장한 날짜 설정  
    const formatDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    };

    if (!mounted) return null;

    return (
        <div className="wrap">

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerWrap}>
                    <Link href="/" className={`b-normal ${styles.bToBack}`} title="목록으로 이동">
                        ← <span>목록으로</span>
                    </Link>
                    <h1 className={styles.logo}>
                        <img src="/images/logo.png" alt="나중에볼랭 로고" />
                    </h1>
                </div>
            </header>

            <div className='container' role='main'>
                {/* Search */}
                <section className={styles.search}>
                    {entries.length > 0 && (
                        <div className={styles.searchField}>
                            <input
                                type="text"
                                className="input"
                                placeholder="책 제목 또는 저자를 검색해주세요"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    )}

                    {filtered.length === 0 && entries.length > 0 && (
                        <div className={styles.empty}>
                            <p>해당하는 검색결과가 없습니다.</p>
                        </div>
                    )}

                    {entries.length === 0 && (
                        <div className={styles.empty}>
                            <div className={styles.emptyIcon}>📋</div>
                            <p>아직 북마크한 책 목록이 없어요!</p>
                        </div>
                    )}
                </section>

                {/* Content */}
                <section className='content'>
                {entries.length > 0 && (
                    <p className={styles.result}>
                        {entries.length === 0
                            ? ''
                            : `총 ${entries.length}권의 책을 저장하고 있어요`
                        }
                    </p>
                )}
                    <div className={styles.bookmarkList}>
                        {filtered.map(([key, book]) => (
                            <BookmarkCard
                                key={key}
                                bookKey={key}
                                book={book}
                                onEdit={setEditingBook}
                                onRemove={handleRemove}
                                formatDate={formatDate}
                            />
                        ))}
                    </div>
                </section>
            </div>

            {editingBook && (
                <BookmarkModal
                    book={editingBook}
                    existingMemo={editingBook.memo}
                    onSave={handleEditSave}
                    onClose={() => setEditingBook(null)}
                />
            )}
        </div>
    );
}