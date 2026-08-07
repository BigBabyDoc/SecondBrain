import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Политика обработки персональных данных — Второй мозг педиатра",
  description: "Порядок обработки персональных данных и меры по обеспечению их безопасности.",
};

export default function Page() {
  return <LegalPage document="privacy" />;
}
