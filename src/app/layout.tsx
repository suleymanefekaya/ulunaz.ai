import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ulu.ai - İİF Akıllı Asistanı",
  description: "İnegöl İşletme Fakültesi için geliştirilmiş, pixel-art estetikli yapay zeka asistanı.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.className} min-h-screen bg-sky-100 text-black`}>
        {children}
      </body>
    </html>
  );
}
