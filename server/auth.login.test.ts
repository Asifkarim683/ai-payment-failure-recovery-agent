import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

function createTestContext(): { ctx: TrpcContext; setCookies: Record<string, string> } {
  const setCookies: Record<string, string> = {};

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, val: string) => {
        setCookies[name] = val;
      },
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx, setCookies };
}

describe("auth.login and auth.quickLogin", () => {
  it("authenticates a custom email user and sets session cookie", async () => {
    const { ctx, setCookies } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      email: "finance.analyst@example.com",
      password: "secure_password_123",
      name: "Finance User",
      role: "user",
    });

    expect(result.success).toBe(true);
    expect(result.user?.email).toBe("finance.analyst@example.com");
    expect(result.user?.name).toBe("Finance User");
    expect(setCookies[COOKIE_NAME]).toBeDefined();
  });

  it("authenticates via quickLogin for admin persona", async () => {
    const { ctx, setCookies } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.quickLogin({ persona: "admin" });

    expect(result.success).toBe(true);
    expect(result.user?.name).toBe("Eren Rocha");
    expect(result.user?.role).toBe("admin");
    expect(setCookies[COOKIE_NAME]).toBeDefined();
  });
});
