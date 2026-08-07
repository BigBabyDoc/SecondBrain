import Link from "next/link";
import { PLAN_PRICES } from "@/lib/access";

export const metadata = {
  title: "Вопросы и ответы — Второй мозг педиатра",
  description:
    "Как устроен доступ к заметкам, сколько стоит подписка, как оплатить и отменить продление.",
};

const FAQ: { question: string; answer: React.ReactNode }[] = [
  {
    question: "Что это за сервис?",
    answer: (
      <>
        «Второй мозг педиатра» — библиотека структурированных клинических заметок: алгоритмы,
        памятки по дозировкам, разборы случаев. Всё собрано так, чтобы находить нужное во время
        приёма, не листая десяток источников.
      </>
    ),
  },
  {
    question: "Для кого эти материалы?",
    answer: (
      <>
        Для практикующих врачей и ординаторов. Это не сервис консультаций для пациентов и не
        замена клиническим рекомендациям — материалы носят справочный характер.
      </>
    ),
  },
  {
    question: "Что доступно бесплатно?",
    answer: (
      <>
        Часть заметок открыта без оплаты — по ним можно оценить стиль подачи и глубину
        разбора. Они помечены как «Бесплатно» в{" "}
        <Link href="/notes" className="text-brand-blue hover:underline">
          каталоге
        </Link>
        .
      </>
    ),
  },
  {
    question: "Сколько стоит подписка?",
    answer: (
      <>
        {PLAN_PRICES.MONTHLY} ₽ за месяц или {PLAN_PRICES.YEARLY} ₽ за год — это на два месяца
        дешевле, чем платить помесячно. Оба тарифа открывают одну и ту же полную библиотеку,
        разница только в периоде оплаты. Подробнее — на странице{" "}
        <Link href="/pricing" className="text-brand-blue hover:underline">
          «Тарифы»
        </Link>
        .
      </>
    ),
  },
  {
    question: "Как оплатить?",
    answer: (
      <>
        Оплата картой через ЮKassa. После подтверждения платежа доступ открывается
        автоматически, а чек приходит на почту — его формирует сервис «Мой налог».
      </>
    ),
  },
  {
    question: "Зачем подтверждать email?",
    answer: (
      <>
        На этот адрес приходит чек по платежу и уведомления о подписке, поэтому перед оплатой
        адрес нужно подтвердить по ссылке из письма. Повторно отправить письмо можно в личном
        кабинете.
      </>
    ),
  },
  {
    question: "Подписка продлевается сама?",
    answer: (
      <>
        Нет. Автоматических списаний нет: следующий период вы оплачиваете сами, когда захотите.
        По окончании оплаченного срока доступ к платным материалам просто закроется, а аккаунт и
        бесплатные заметки останутся.
      </>
    ),
  },
  {
    question: "Можно ли вернуть деньги?",
    answer: (
      <>
        Да, в течение 7 дней с момента оплаты, если доступ к оплаченным материалам фактически не
        был получен. Условия описаны в{" "}
        <Link href="/oferta" className="text-brand-blue hover:underline">
          публичной оферте
        </Link>
        .
      </>
    ),
  },
  {
    question: "Как часто появляются новые заметки?",
    answer: (
      <>
        Библиотека пополняется по мере разбора новых тем и случаев. Подписка даёт доступ ко всем
        материалам, включая те, что выйдут в течение оплаченного периода.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">Вопросы и ответы</h1>
      <p className="mt-2 text-muted">
        Коротко о том, как устроен доступ к материалам и подписка.
      </p>

      <div className="mt-10 divide-y divide-border border-y border-border">
        {FAQ.map((item) => (
          <details key={item.question} className="group py-4">
            <summary className="flex cursor-pointer items-center justify-between gap-4 py-1 font-medium marker:content-none">
              {item.question}
              <span
                aria-hidden="true"
                className="shrink-0 text-muted transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.answer}</p>
          </details>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted">
        Остались вопросы? Напишите на{" "}
        <a
          href="mailto:second_brain_pediatra@mail.ru"
          className="text-brand-blue hover:underline"
        >
          second_brain_pediatra@mail.ru
        </a>
        .
      </p>
    </div>
  );
}
