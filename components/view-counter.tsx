"use client";

import { useEffect, useRef } from "react";

/**
 * Отмечает открытие заметки — один раз за вкладку на заметку.
 *
 * Считает браузер, а не сервер: серверный рендер повторяется при префетче
 * ссылки, повторной валидации и обходе поисковыми роботами, и счётчик от этого
 * показывал бы не читателей, а обращения к странице.
 */
export function ViewCounter({ slug }: { slug: string }) {
  // В строгом режиме разработки эффект выполняется дважды — ref гасит второй вызов.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const key = `note-view:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Приватный режим может запрещать sessionStorage: тогда просто считаем
      // просмотр, дубликат в пределах вкладки не страшен.
    }

    // keepalive: запрос переживёт немедленный уход со страницы.
    void fetch(`/api/notes/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      // Счётчик — не то, ради чего стоит показывать читателю ошибку.
    });
  }, [slug]);

  return null;
}
