import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Публичная оферта — Второй мозг педиатра",
  description: "Договор на оказание услуг по предоставлению доступа к сервису «Второй мозг педиатра».",
};

export default function Page() {
  return <LegalPage document="offer" />;
}
