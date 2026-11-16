import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const gilroy = localFont({
  src: [
    { path: "../fonts/GIP-Regular.otf", weight: "400" },
    { path: "../fonts/GIP-Medium.otf", weight: "500" },
    { path: "../fonts/GIP-SemiBold.otf", weight: "600" },
    { path: "../fonts/GIP-Bold.otf", weight: "700" },
    { path: "../fonts/GIP-ExtraBold.otf", weight: "800" },
  ],
  variable: "--font-gilroy",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Сургалтын албаны хүсэлтийн тойм",
  description: "Kaneo-гийн оюутны хүсэлтийн шууд мэдээлэл",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn" className={gilroy.variable}>
      <body>{children}</body>
    </html>
  );
}
