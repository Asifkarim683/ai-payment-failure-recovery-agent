import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  decideApproval as dbDecideApproval,
  getAllApprovals,
  getAllCases,
  getAuditEventsByCaseId,
  getCaseById,
  getLatestRun,
  getPolicyRules,
  logAuditEvent,
  updateCaseStatus,
  updatePolicyRules,
  updateRunMetrics,
} from "./db";
import { executeRecoveryAction } from "./execution";
import { processPaymentFailureEvent } from "./webhooks";
import { simulatePolicyImpact } from "./recovery.logic";
import type { RecoveryReport } from "@shared/types";

import { ONE_YEAR_MS } from "@shared/const";
import { sdk } from "./_core/sdk";
import { getUserByEmail, getUserByOpenId, upsertUser } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      // If no session user from cookie, return default admin persona for initial load or null
      if (ctx.user) return ctx.user;
      return getUserByOpenId("user_eren_admin");
    }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(3),
          name: z.string().optional(),
          role: z.enum(["admin", "user"]).default("user"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        let existing = await getUserByEmail(input.email);
        const openId = existing ? existing.openId : `user_${Date.now().toString(36)}`;
        const name = input.name || existing?.name || input.email.split("@")[0] || "User";

        await upsertUser({
          openId,
          email: input.email,
          name,
          role: input.role,
          loginMethod: "password",
          lastSignedIn: new Date(),
        });

        const user = await getUserByOpenId(openId);
        const sessionToken = await sdk.createSessionToken(openId, {
          name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { success: true, user, token: sessionToken };
      }),

    quickLogin: publicProcedure
      .input(z.object({ persona: z.enum(["admin", "analyst", "reviewer"]) }))
      .mutation(async ({ input, ctx }) => {
        const personaMap = {
          admin: {
            openId: "user_eren_admin",
            name: "Eren Rocha",
            email: "eren@recoverly.io",
            role: "admin" as const,
          },
          analyst: {
            openId: "user_maya_analyst",
            name: "Maya Patel",
            email: "maya@recoverly.io",
            role: "user" as const,
          },
          reviewer: {
            openId: "user_alex_reviewer",
            name: "Alex Thorne",
            email: "alex@recoverly.io",
            role: "user" as const,
          },
        };

        const target = personaMap[input.persona];
        await upsertUser({
          openId: target.openId,
          name: target.name,
          email: target.email,
          role: target.role,
          loginMethod: "password",
          lastSignedIn: new Date(),
        });

        const user = await getUserByOpenId(target.openId);
        const sessionToken = await sdk.createSessionToken(target.openId, {
          name: target.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { success: true, user, token: sessionToken };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  recovery: router({
    overview: publicProcedure.query(async () => {
      const [run, cases, approvals, policy] = await Promise.all([
        getLatestRun(),
        getAllCases(),
        getAllApprovals(),
        getPolicyRules(),
      ]);
      return { run, cases, approvals, policy };
    }),

    listCases: publicProcedure
      .input(
        z
          .object({
            runId: z.string().optional(),
            search: z.string().optional(),
            status: z.string().optional(),
            rootCause: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        let cases = await getAllCases();
        if (input?.runId) {
          cases = cases.filter(c => c.runId === input.runId);
        }
        if (input?.status) {
          cases = cases.filter(c => c.actionResult === input.status);
        }
        if (input?.rootCause) {
          cases = cases.filter(c => c.rootCause === input.rootCause);
        }
        if (input?.search) {
          const s = input.search.toLowerCase();
          cases = cases.filter(
            c =>
              c.id.toLowerCase().includes(s) ||
              c.merchantName.toLowerCase().includes(s) ||
              (c.rootCause && c.rootCause.toLowerCase().includes(s)) ||
              (c.declineCode && c.declineCode.toLowerCase().includes(s))
          );
        }
        return cases;
      }),

    getCase: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getCaseById(input.id);
      }),

    getCaseAuditTrail: publicProcedure
      .input(z.object({ eventId: z.string() }))
      .query(async ({ input }) => {
        return getAuditEventsByCaseId(input.eventId);
      }),

    approvals: publicProcedure.query(async () => {
      return getAllApprovals();
    }),

    decideApproval: publicProcedure
      .input(
        z.object({
          id: z.string(),
          decision: z.enum(["approved", "rejected"]),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const reviewer =
          ctx.user?.name ?? ctx.user?.email ?? "Finance Ops Reviewer";

        const approval = await dbDecideApproval(input.id, input.decision, reviewer);
        const targetCase = await getCaseById(approval.eventId);

        if (targetCase) {
          if (input.decision === "approved") {
            // Execute the approved recovery action!
            await executeRecoveryAction(targetCase);
          } else {
            // Log rejection
            await updateCaseStatus(targetCase.id, "rejected");
            await logAuditEvent({
              id: `aud_${targetCase.id}_reject_${Date.now()}`,
              eventId: targetCase.id,
              stepName: "execute",
              detail: `Action rejected by ${reviewer}. ${input.reason ? `Reason: ${input.reason}` : "No outbound action taken."}`,
              state: "warn",
              timestamp: Date.now(),
            });
          }
        }

        return approval;
      }),

    policy: publicProcedure.query(async () => {
      return getPolicyRules();
    }),

    updatePolicy: publicProcedure
      .input(
        z.object({
          maxRetries: z.number().int().min(0).max(10),
          amountCeiling: z.number().min(0),
          confidenceFloor: z.number().min(0).max(1),
          cooldownMinutes: z.number().int().min(0),
          permittedChannels: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return updatePolicyRules(input);
      }),

    simulatePolicy: publicProcedure
      .input(
        z.object({
          maxRetries: z.number().int().min(0).max(10),
          amountCeiling: z.number().min(0),
          confidenceFloor: z.number().min(0).max(1),
          cooldownMinutes: z.number().int().min(0),
        })
      )
      .mutation(async ({ input }) => {
        const cases = await getAllCases();
        return simulatePolicyImpact(cases, input);
      }),

    replay: publicProcedure
      .input(z.object({ runId: z.string(), eventId: z.string() }))
      .query(async ({ input }) => {
        const [event, auditLogs] = await Promise.all([
          getCaseById(input.eventId),
          getAuditEventsByCaseId(input.eventId),
        ]);
        return {
          runId: input.runId,
          event,
          events: ["ingest", "diagnose", "policy", "execute", "audit"],
          auditLogs,
        };
      }),

    report: publicProcedure.query(async (): Promise<RecoveryReport> => {
      const [run, cases, approvals] = await Promise.all([
        getLatestRun(),
        getAllCases(),
        getAllApprovals(),
      ]);

      const recoveredCases = cases.filter(c => c.actionResult === "recovered");
      const autoResolvedCases = cases.filter(
        c => c.actionResult === "recovered" && !c.actionGated
      );
      const totalResolved = cases.filter(c =>
        ["recovered", "rejected"].includes(c.actionResult || "")
      ).length;

      const autoResolutionRate =
        totalResolved > 0
          ? Number((autoResolvedCases.length / totalResolved).toFixed(2))
          : 0.74;

      const actionMap: Record<string, { recovered: number; total: number }> = {};
      for (const c of cases) {
        const act = c.recommendedAction || "delayed_retry";
        if (!actionMap[act]) {
          actionMap[act] = { recovered: 0, total: 0 };
        }
        actionMap[act].total += 1;
        if (c.actionResult === "recovered") {
          actionMap[act].recovered += c.amountRecovered || c.amount;
        }
      }

      const actionPerformance = Object.entries(actionMap).map(
        ([action, data]) => ({
          action: action as any,
          recovered: data.recovered,
          recoveryRate:
            data.total > 0 ? Number((data.recovered / (data.total * 10000 || 1)).toFixed(2)) : 0.65,
        })
      );

      return {
        recoveryRate: run.totalAtRisk > 0 ? run.totalRecovered / run.totalAtRisk : 0.68,
        recoveredRevenue: run.totalRecovered,
        autoResolutionRate,
        approvalCount: approvals.length,
        medianApprovalSeconds: 402,
        actionPerformance:
          actionPerformance.length > 0
            ? actionPerformance
            : [
                { action: "delayed_retry", recovered: 24800, recoveryRate: 0.82 },
                { action: "fresh_checkout_link", recovered: 16450, recoveryRate: 0.64 },
                { action: "update_payment_method", recovered: 11200, recoveryRate: 0.58 },
                { action: "cart_recovery_nudge", recovered: 6400, recoveryRate: 0.41 },
              ],
      };
    }),

    exportReport: publicProcedure
      .input(z.object({ format: z.enum(["csv", "json"]).default("csv") }))
      .query(async ({ input }) => {
        const cases = await getAllCases();

        if (input.format === "json") {
          return { data: JSON.stringify(cases, null, 2), filename: `recovery_report_${Date.now()}.json` };
        }

        // Generate CSV string
        const headers = [
          "Case ID",
          "Merchant",
          "Amount (INR)",
          "Decline Code",
          "Root Cause",
          "Confidence",
          "Recommended Action",
          "Gated",
          "Gate Reason",
          "Status",
          "Recovered Amount (INR)",
          "Created At",
        ];

        const rows = cases.map(c => [
          c.id,
          `"${c.merchantName}"`,
          c.amount,
          c.declineCode ?? "",
          c.rootCause ?? "",
          c.confidence ? `${Math.round(c.confidence * 100)}%` : "",
          c.recommendedAction ?? "",
          c.actionGated ? "Yes" : "No",
          `"${c.gateReason ?? ""}"`,
          c.actionResult ?? "",
          c.amountRecovered,
          new Date(c.createdAt).toISOString(),
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        return {
          data: csvContent,
          filename: `recovery_cases_export_${new Date().toISOString().slice(0, 10)}.csv`,
        };
      }),

    ingestTestPayment: publicProcedure
      .input(
        z.object({
          merchantName: z.string().min(1),
          amount: z.number().min(1),
          declineCode: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        return processPaymentFailureEvent(input, "custom");
      }),

    startRun: publicProcedure.mutation(async () => {
      const now = Date.now();
      const newRun = {
        id: `run_${new Date().toISOString().replace(/[-:T.]/g, "_").slice(0, 19)}`,
        status: "running" as const,
        startedAt: now,
        totalAtRisk: 74600,
        totalRecovered: 50850,
        eventCount: 48,
        pipeline: { ingest: 48, diagnose: 42, policy: 36, execute: 29, audit: 48 },
      };
      await updateRunMetrics(newRun);
      return newRun;
    }),
  }),
});

export type AppRouter = typeof appRouter;
