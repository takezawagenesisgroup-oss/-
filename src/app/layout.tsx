import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "職人マッチ | 職人と依頼者をつなぐマッチングサービス",
  description:
    "腕利きの職人が個人で仕事を受注できる、職人と依頼者のためのマッチングサービス。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-neutral-200 bg-white py-6 text-center text-sm text-neutral-500">
            © 2026 職人マッチ. All rights reserved.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
