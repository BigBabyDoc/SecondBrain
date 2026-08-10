"use client";

import { useEffect, useRef } from "react";
import { METRIKA_GOALS, reachGoal, type MetrikaGoal } from "@/lib/metrika";

/**
 * Отправляет цель Метрики при показе страницы.
 *
 * `dedupeKey` защищает от повторного счёта: страница кабинета открывается и
 * после оплаты, и просто так, а обновление вкладки не должно превращаться во
 * вторую продажу в отчёте. Ключ запоминается в localStorage — на время сессии
 * этого мало, человек возвращается на сайт с той же ссылкой в письме.
 *
 * Счётчик подключается только при согласии на аналитику, поэтому у отказавшихся
 * вызов ничего не делает — это ожидаемо.
 */
export function MetrikaGoal({
  goal,
  dedupeKey,
}: {
  goal: MetrikaGoal;
  dedupeKey?: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const storageKey = dedupeKey ? `metrika-goal:${goal}:${dedupeKey}` : null;
    if (storageKey) {
      try {
        if (localStorage.getItem(storageKey)) return;
        localStorage.setItem(storageKey, "1");
      } catch {
        // Хранилище недоступно — цель отправим, дубликат лучше пропажи.
      }
    }

    // Счётчик грузится стратегией afterInteractive и может быть ещё не готов
    // в момент монтирования — короткая отложенная попытка это переживает.
    if (!trySend(goal)) {
      const timer = setTimeout(() => trySend(goal), 1500);
      return () => clearTimeout(timer);
    }
  }, [goal, dedupeKey]);

  return null;
}

function trySend(goal: MetrikaGoal): boolean {
  const ready = typeof (window as unknown as { ym?: unknown }).ym === "function";
  if (ready) reachGoal(goal);
  return ready;
}

export { METRIKA_GOALS };
