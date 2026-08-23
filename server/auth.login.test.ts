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

describe("auth.login and auth.signup", () => {
  it("signs up a new user with RBAC role and sets session cookie", async () => {
    const { ctx, setCookies } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.signup({
      email: "jordan.lee@example.com",
      password: "secure_password_123",
      name: "Jordan Lee",
      role: "admin",
    });

    expect(result.success).toBe(true);
    expect(result.user?.email).toBe("jordan.lee@example.com");
    expect(result.user?.name).toBe("Jordan Lee");
    expect(result.user?.role).toBe("admin");
    expect(setCookies[COOKIE_NAME]).toBeDefined();
  });

  it("authenticates an existing user via login", async () => {
    const { ctx, setCookies } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      email: "eren@recoverly.io",
      password: "password123",
    });

    expect(result.success).toBe(true);
    expect(result.user?.name).toBe("Eren Rocha");
    expect(result.user?.role).toBe("admin");
    expect(setCookies[COOKIE_NAME]).toBeDefined();
  });
});
