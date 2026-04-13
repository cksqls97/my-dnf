import "./globals.css";

export const metadata = {
  title: "DNF Info Manager",
  description: "Dungeon & Fighter Character Manager",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}
