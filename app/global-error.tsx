"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // Без DSN captureException молча ничего не делает — отдельная проверка не нужна.
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          background: "#0a1220",
          color: "#e8eef7",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Что-то пошло не так</h1>
        <p style={{ color: "#93a4bd", maxWidth: "32rem" }}>
          Произошла непредвиденная ошибка. Мы уже получили уведомление — попробуйте обновить
          страницу.
        </p>
        {/* Обычная ссылка, а не next/link: приложение уже в сломанном состоянии,
            и полная перезагрузка страницы надёжнее клиентской навигации. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{
            borderRadius: "999px",
            border: "1px solid #24334a",
            padding: "0.625rem 1.5rem",
            color: "inherit",
            textDecoration: "none",
          }}
        >
          На главную
        </a>
      </body>
    </html>
  );
}
