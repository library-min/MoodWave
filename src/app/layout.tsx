import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoodWave - 감정으로 음악찾기",
  description: "당신의 지금 감정에 가장 어울리는 음악을 AI가 찾아드립니다.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
