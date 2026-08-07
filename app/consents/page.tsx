import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Формы согласий — Второй мозг педиатра",
  description: "Согласия на обработку персональных данных, автопродление, аналитику и рассылки.",
};

export default function Page() {
  return <LegalPage document="consents" />;
}
