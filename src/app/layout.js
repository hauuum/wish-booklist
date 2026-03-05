import './page.css';

export const metadata = {
  title: "나중에봐야지 | 나만의 도서 위시리스트",
  description: "나중에 봐야지 하고 잊어버린 도서만 해도 수십권... 차라리 저장해놓고 관리하려고 만든 나만의 도서 목록 위시리스트입니다.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
