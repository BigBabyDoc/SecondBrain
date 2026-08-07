import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CookieConsent } from "@/components/cookie-consent";
import { metrikaCounterId, readCookieChoice } from "@/lib/cookie-consent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Курсивная антиква для подписи авторов. Кириллица обязательна — имена русские.
const signature = Cormorant_Garamond({
  variable: "--font-signature",
  subsets: ["latin", "cyrillic"],
  style: "italic",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "Второй мозг педиатра — медицинские заметки по подписке",
    template: "%s",
  },
  description:
    "Клинические заметки для педиатров и врачей: быстро, удобно, достоверно. Часть материалов доступна бесплатно.",
  openGraph: {
    siteName: "Второй мозг педиатра",
    locale: "ru_RU",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieChoice = await readCookieChoice();

  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} ${signature.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <CookieConsent counterId={metrikaCounterId()} initialChoice={cookieChoice} />
      </body>
    </html>
  );
}
