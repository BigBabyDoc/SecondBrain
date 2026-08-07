import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Пользовательское соглашение — Второй мозг педиатра",
  description: "Правила использования сайта «Второй мозг педиатра».",
};

export default function Page() {
  return <LegalPage document="terms" />;
}
