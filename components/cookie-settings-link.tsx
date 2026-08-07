"use client";

/** Снова открывает баннер cookie — событие слушает CookieConsent. */
export function CookieSettingsLink() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("cookie-settings:open"))}
      className="py-2 hover:text-foreground hover:underline"
    >
      Настройки cookie
    </button>
  );
}
