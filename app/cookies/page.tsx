import { LegalPage } from "@/components/legal-page";

export const metadata = {
  title: "Политика использования файлов cookie — Второй мозг педиатра",
  description: "Какие файлы cookie использует сайт, для чего и как ими управлять.",
};

export default function Page() {
  return <LegalPage document="cookies" />;
}
