import { useState } from 'react';
import styles from './BookCard.module.css';

const DEFAULT_COVERS = [
    '/images/default/default-01.jpg',
    '/images/default/default-02.jpg',
    '/images/default/default-03.jpg',
    '/images/default/default-04.jpg',
    '/images/default/default-05.jpg',
    '/images/default/default-06.jpg',
    '/images/default/default-07.jpg',
    '/images/default/default-08.jpg',
    '/images/default/default-09.jpg',
];

export default function BookCard({ book, isBookmarked, onBookmarkClick }) {
    // 랜덤으로 디폴트 책 표지 이미지 불러오기
    const [defaultCover] = useState(
        () => DEFAULT_COVERS[Math.floor(Math.random() * DEFAULT_COVERS.length)]
    );

    return (
        <div className={`${styles.card} ${isBookmarked ? styles.isBookmarked : ''}`}>
            <div className={styles.cardContent}>
                <div className={book.COVER ? '' : styles.default}>
                    <img
                        src={book.COVER || defaultCover}
                        alt={`${book.TITLE} 표지`}
                        onError={(e) => {
                            e.target.src = defaultCover;
                        }}
                    />
                </div>
                <p className={styles.title}>{book.TITLE}</p>
                <p className={styles.author}>{book.AUTHOR}</p>
                {book.PUBLER && (
                    <p className={styles.publisher}>{book.PUBLER}</p>
                )}
            </div>
            <button
                className={`i-bookmark ${styles.bBookmark} ${isBookmarked ? styles.active : ''}`}
                onClick={() => onBookmarkClick(book)}
                title={isBookmarked ? '북마크 됨' : '북마크 추가'}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill={isBookmarked ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                    >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
            </button>
        </div>
    );
}