"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteAccountAction, setMarketingConsentAction } from "@/lib/actions/account";

const CONFIRM_WORD = "УДАЛИТЬ";

/** Оплаченный доступ, который пропадёт при удалении. null — платной подписки нет. */
export type PaidAccess = { endsAt: string; daysLeft: number };

function pluralDays(count: number): string {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return "дней";
  switch (count % 10) {
    case 1:
      return "день";
    case 2:
    case 3:
    case 4:
      return "дня";
    default:
      return "дней";
  }
}

export function AccountPrivacy({
  marketingEnabled,
  paidAccess,
}: {
  marketingEnabled: boolean;
  paidAccess: PaidAccess | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  return (
    <section className="mt-8 rounded-2xl border border-border bg-background-elevated p-6">
      <h2 className="text-lg font-semibold">Согласия и данные</h2>

      <form action={setMarketingConsentAction} className="mt-4">
        {/* Скрытое поле задаёт новое состояние: отправка формы его переключает. */}
        <input type="hidden" name="enable" value={marketingEnabled ? "off" : "on"} />
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <p className="font-medium">Информационные и рекламные сообщения</p>
            <p className="text-muted">
              {marketingEnabled
                ? "Вы согласились получать новости о материалах и тарифах."
                : "Сейчас такие письма вам не приходят."}
            </p>
          </div>
          <button className="shrink-0 rounded-full border border-border px-4 py-1.5 text-sm hover:border-brand-blue hover:text-brand-blue">
            {marketingEnabled ? "Отозвать согласие" : "Подписаться"}
          </button>
        </div>
      </form>

      <p className="mt-4 border-t border-border pt-4 text-sm text-muted">
        Отзыв согласия на обработку персональных данных выполняется удалением учётной записи:
        по{" "}
        <Link href="/consents" className="text-brand-blue hover:underline">
          Согласию № 1
        </Link>{" "}
        это одно и то же действие. Сервисные письма об оплате и подписке приходят независимо от
        согласия на рассылки — они нужны для исполнения договора.
      </p>

      <div className="mt-4 border-t border-border pt-4">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-sm text-muted hover:text-red-400"
          >
            Удалить учётную запись
          </button>
        ) : (
          <form action={deleteAccountAction} className="space-y-3 text-sm">
            {/* Человек с оплаченной подпиской должен видеть, что именно теряет:
                общей фразы «деньги не возвращаются» для этого мало. */}
            {paidAccess && (
              <p className="rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-red-300">
                У вас оплачен доступ до {paidAccess.endsAt} — это ещё{" "}
                <strong>
                  {paidAccess.daysLeft} {pluralDays(paidAccess.daysLeft)}
                </strong>
                . При удалении учётной записи он пропадёт. Если хотите вернуть деньги за
                неиспользованный период, сделайте это{" "}
                <Link href="/oferta#vozvrat" className="underline hover:text-red-200">
                  до удаления
                </Link>
                : после удаления аккаунта подтвердить оплату будет сложнее.
              </p>
            )}

            <p className="text-red-400">
              Учётная запись и доступ к платным материалам будут удалены безвозвратно. Сведения
              о платежах сохранятся в обезличенном виде — их хранение обязательно для
              налогового учёта. Деньги за неиспользованный период не возвращаются
              автоматически: возврат оформляется по заявлению в порядке{" "}
              <Link href="/oferta" className="underline hover:text-red-200">
                раздела 11 оферты
              </Link>
              .
            </p>
            <label className="block">
              <span className="text-muted">
                Введите {CONFIRM_WORD}, чтобы подтвердить
              </span>
              <input
                name="confirm"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-red-400"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={typed !== CONFIRM_WORD}
                className="rounded-full border border-red-400/40 px-4 py-1.5 text-red-400 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Удалить навсегда
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setTyped("");
                }}
                className="rounded-full border border-border px-4 py-1.5 hover:border-brand-blue"
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
