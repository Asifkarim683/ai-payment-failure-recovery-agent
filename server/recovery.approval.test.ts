import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("recovery.decideApproval", () => {
  it("records an approved decision with reviewer metadata", async () => {
    const ctx = { user: { name: "Ops Reviewer", email: "ops@example.com" } } as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    const result = await caller.recovery.decideApproval({ id: "apr_001", decision: "approved" });
    expect(result.status).toBe("approved");
    expect(result.reviewedBy).toBe("Ops Reviewer");
    expect(result.reviewedAt).toEqual(expect.any(Number));
  });
});
