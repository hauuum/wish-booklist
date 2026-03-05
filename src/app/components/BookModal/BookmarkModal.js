"use client";
import { useState, useEffect } from 'react';
import styles from './BookmarkModal.module.css';

export default function BookmarkModal({ book, existingMemo, onSave, onClose }) {
	const [memo, setMemo] = useState(existingMemo || '');

	useEffect(() => {
		setMemo(existingMemo || '');
	}, [existingMemo]);

	const handleSave = () => {
		onSave(book, memo);
		onClose();
	};

	return (
		<div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className={styles.modal}>
				<span className={styles.mark}>📌</span>
				<p className={styles.label}>북마크하기</p>
				<h3 className={styles.title}>{book.TITLE}</h3>
				<p className={styles.author}>{book.AUTHOR} <span>{book.PUBLER}</span></p>

				<div className={styles.memo}>
					<textarea
						className={styles.textarea}
						placeholder="이 책을 읽고 싶은 이유, 추천 경로 등등 메모를 남겨주세요"
						value={memo}
						onChange={(e) => setMemo(e.target.value)}
						rows={4}
						maxLength={200}
					/>
					<span className={styles.count}>{memo.length}/200</span>
				</div>

				<div className={styles.btnWrap}>
					<button className={`b-normal ${styles.bCancel}`} onClick={onClose}>취소</button>
					<button className={`b-normal ${styles.bSave}`} onClick={handleSave}>
						✓ 저장하기
					</button>
				</div>
			</div>
		</div>
	);
}