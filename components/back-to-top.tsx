"use client";

import { useSyncExternalStore } from "react";

/** На сколько нужно опуститься, чтобы кнопка появилась. */
const SHOW_AFTER_PX = 600;

function subscribe(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange, { passive: true });
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

const getSnapshot = () => window.scrollY > SHOW_AFTER_PX;

// На сервере прокрутки нет — кнопка в разметку не попадает.
const getServerSnapshot = () => false;

export function BackToTop() {
  // Позиция прокрутки — внешнее состояние, поэтому подписка, а не эффект
  // с setState: так учитывается и случай, когда страница открыта сразу
  // по якорю из оглавления.
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      aria-label="Вернуться к началу заметки"
      title="В начало заметки"
      // Кнопка не размонтируется, а плавно гаснет; pointer-events убирает
      // перехват кликов у невидимой кнопки.
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => {
        // behavior не указываем намеренно: тогда действует scroll-behavior из
        // globals.css, а он отключён у тех, кто просил уменьшить анимации.
        window.scrollTo({ top: 0 });
      }}
      className={`fixed bottom-6 right-6 z-40 flex size-11 items-center justify-center rounded-full border border-border bg-background-elevated text-muted shadow-lg transition-all hover:border-brand-blue hover:text-brand-blue ${
        visible ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-5"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
