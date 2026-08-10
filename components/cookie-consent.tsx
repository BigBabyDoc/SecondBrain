"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import {
  COOKIE_CONSENT_DAYS,
  COOKIE_CONSENT_NAME,
  type CookieChoice,
} from "@/lib/cookie-consent";

function writeChoice(choice: CookieChoice) {
  const maxAge = COOKIE_CONSENT_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_CONSENT_NAME}=${choice}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Удаляет ранее выставленные аналитические cookie при отзыве согласия. */
function clearAnalyticsCookies() {
  for (const name of document.cookie.split("; ").map((row) => row.split("=")[0])) {
    if (name.startsWith("_ym")) {
      document.cookie = `${name}=; path=/; max-age=0`;
      document.cookie = `${name}=; path=/; domain=.${location.hostname}; max-age=0`;
    }
  }
}

export function CookieConsent({
  counterId,
  initialChoice,
}: {
  counterId: string | null;
  initialChoice: CookieChoice | null;
}) {
  // Начальное значение приходит с сервера, поэтому баннер сразу в нужном состоянии.
  const [choice, setChoice] = useState<CookieChoice | null>(initialChoice);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Аналитика выключена, пока её не включили: предустановленных отметок нет.
  const [analytics, setAnalytics] = useState(false);

  // Ссылка «Настройки cookie» в футере снова открывает баннер.
  useEffect(() => {
    const reopen = () => {
      clearAnalyticsCookies();
      setChoice(null);
      // Возврат к чистому выбору: прежнее согласие только что отозвано.
      setSettingsOpen(false);
      setAnalytics(false);
    };
    window.addEventListener("cookie-settings:open", reopen);
    return () => window.removeEventListener("cookie-settings:open", reopen);
  }, []);

  const decide = useCallback((value: CookieChoice) => {
    writeChoice(value);
    if (value === "necessary") clearAnalyticsCookies();
    setChoice(value);
    setSettingsOpen(false);
  }, []);

  return (
    <>
      {/* Счётчик подключается только при согласии — до этого код не выполняется. */}
      {choice === "all" && counterId && (
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
          ym(${counterId}, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:false});`}
        </Script>
      )}

      {choice === null && (
        <div
          role="dialog"
          aria-label="Использование файлов cookie"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background-elevated p-4 shadow-lg sm:p-5"
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* На телефоне баннер перекрывает пятую часть экрана, поэтому текст
                там короче. Смысл выбора сохранён — что за cookie, что даёт
                отказ и где прочитать целиком; подробности ушли в /cookies. */}
            <p className="text-sm text-muted">
              <span className="sm:hidden">
                Технические cookie нужны для входа в кабинет, аналитические — для
                статистики. Отказ от аналитических не ограничивает доступ к материалам.
              </span>
              <span className="hidden sm:inline">
                Сайт использует технически необходимые файлы cookie, без которых невозможен
                вход в личный кабинет, а также аналитические — для статистики посещаемости.
                Отказ от аналитических не ограничивает доступ к материалам.
              </span>{" "}
              <Link href="/cookies" className="text-brand-blue hover:underline">
                Подробнее
              </Link>
            </p>
            {/* Кнопки равнозначны по виду: отказ не должен быть менее заметным. */}
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                aria-expanded={settingsOpen}
                aria-controls="cookie-categories"
                className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:border-brand-blue hover:text-brand-blue"
              >
                Настроить
              </button>
              <button
                type="button"
                onClick={() => decide("necessary")}
                className="flex-1 rounded-full border border-border px-4 py-2 text-sm hover:border-brand-blue hover:text-brand-blue sm:flex-none"
              >
                Только необходимые
              </button>
              <button
                type="button"
                onClick={() => decide("all")}
                className="flex-1 rounded-full border border-border px-4 py-2 text-sm hover:border-brand-blue hover:text-brand-blue sm:flex-none"
              >
                Принять все
              </button>
            </div>
          </div>

          {/* Выбор по категориям — его обещают п. 6.1 Политики cookie и п. 7
              Согласия № 3. Технические cookie показаны выключенным флажком:
              без них не работает вход, и согласие на них не спрашивают. */}
          {settingsOpen && (
            <div
              id="cookie-categories"
              className="mx-auto mt-4 max-w-4xl space-y-3 border-t border-border pt-4"
            >
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="mt-0.5 size-4 shrink-0 accent-brand-blue"
                />
                <span>
                  <span className="font-medium text-foreground">
                    Технически необходимые
                  </span>
                  <span className="block text-muted">
                    Вход в личный кабинет и запоминание вашего выбора. Без них сайт
                    не работает, поэтому отключить их нельзя.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(event) => setAnalytics(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-brand-blue"
                />
                <span>
                  <span className="font-medium text-foreground">Аналитические</span>
                  <span className="block text-muted">
                    Яндекс.Метрика — статистика посещаемости. Отказ ничего
                    не ограничивает.
                  </span>
                </span>
              </label>

              <button
                type="button"
                onClick={() => decide(analytics ? "all" : "necessary")}
                className="rounded-full border border-border px-4 py-2 text-sm hover:border-brand-blue hover:text-brand-blue"
              >
                Сохранить выбор
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
