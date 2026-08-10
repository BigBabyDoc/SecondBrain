import { beforeAll, describe, expect, it } from "vitest";
import { unsubscribeToken, verifyUnsubscribeToken } from "@/lib/unsubscribe";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-unsubscribe";
});

describe("ссылка отписки", () => {
  it("свой токен распознаётся", () => {
    expect(verifyUnsubscribeToken(unsubscribeToken("user_1"))).toBe("user_1");
  });

  it("подделанная подпись отклоняется", () => {
    expect(verifyUnsubscribeToken("user_1.deadbeef")).toBeNull();
  });

  it("чужой идентификатор с чужой подписью не подходит", () => {
    // Подставить свой id к чужой подписи нельзя: подпись считается от id.
    const token = unsubscribeToken("user_1");
    const signature = token.slice(token.lastIndexOf(".") + 1);
    expect(verifyUnsubscribeToken(`user_2.${signature}`)).toBeNull();
  });

  it("токены разных пользователей различаются", () => {
    expect(unsubscribeToken("user_1")).not.toBe(unsubscribeToken("user_2"));
  });

  it("мусор и пустое значение отклоняются", () => {
    expect(verifyUnsubscribeToken(null)).toBeNull();
    expect(verifyUnsubscribeToken("")).toBeNull();
    expect(verifyUnsubscribeToken("без-точки")).toBeNull();
    expect(verifyUnsubscribeToken(".подпись")).toBeNull();
  });
});
