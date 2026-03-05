import { useState } from 'react';
import styles from './BookmarkCard.module.css';

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

function BookmarkCard({ bookKey, book, onEdit, onRemove, formatDate }) {
    const [defaultCover] = useState(
      () => DEFAULT_COVERS[Math.floor(Math.random() * DEFAULT_COVERS.length)]
    );
  
    return (
      <div className={styles.bookmarkCard}>
  
        <div>
          {book.savedAt && <span className={styles.savedDate}>{formatDate(book.savedAt)} 저장</span>}
          <div className={styles.btnWrap}>
            <button className={styles.editBtn} onClick={() => onEdit(book)} title="메모 수정"></button>
            <button className={styles.removeBtn} onClick={() => onRemove(bookKey)} title="북마크 삭제"></button>
          </div>
        </div>
        <div className={styles.desc}>
          <div className={book.COVER ? styles.coverWrap : styles.coverWrapDefault}>
            <img
              src={book.COVER || defaultCover}
              alt={`${book.TITLE} 표지`}
              className={styles.coverImg}
              onError={(e) => { e.target.src = defaultCover; }}
            />
          </div>
          <div className={styles.cardContent}>
            <p className={styles.bookTitle}>{book.TITLE}</p>
            <p className={styles.bookAuthor}>{book.AUTHOR}<span>{book.PUBLER}</span></p>
            {book.memo ? (
              <div className={styles.memo}>
                <p>{book.memo}</p>
              </div>
            ) : (
              <p className={styles.noMemo}> </p>
            )}
          </div>
        </div>
  
      </div>
    );
}

export default BookmarkCard;