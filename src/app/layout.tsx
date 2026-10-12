import type { Metadata } from "next";
import localFont from "next/font/local";
import { getSiteUrl, SERVICE_NAME } from "@/lib/site-url";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SERVICE_NAME} — 상호만 넣으면 만들어지는 우리 가게 홈페이지`,
    template: `%s | ${SERVICE_NAME}`,
  },
  description: "상호와 업종만 넣으면 만들어지는 우리 가게 홈페이지",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
