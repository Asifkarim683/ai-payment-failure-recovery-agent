import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
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
import {
  chatWithFinanceCopilot,
  generateAIDiagnosis,
  generatePolicyAdvice,
  generateRecoveryNudge,
} from "./ai.service";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      return ctx.user ?? null;
    }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(3),
        })
      )
      .mutation(async ({ input, ctx }) => {
        let existing = await getUserByEmail(input.email);
        if (!existing) {
          throw new Error("No account found with this email. Please sign up first.");
        }

        const openId = existing.openId;
        const name = existing.name || input.email.split("@")[0] || "User";
        const role = existing.role || "user";

        await upsertUser({
          openId,
          email: input.email,
          name,
          role,
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

        await logAuditEvent({
          id: `aud_auth_${Date.now()}`,
          eventId: "sys_auth",
          stepName: "audit",
          detail: `User ${user?.name || openId} signed in via credentials. Role: ${user?.role?.toUpperCase()}`,
          state: "done",
          timestamp: Date.now(),
        });

        return { success: true, user, token: sessionToken };
      }),

    signup: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(3),
          name: z.string().min(1),
          role: z.enum(["admin", "user"]).default("user"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        let existing = await getUserByEmail(input.email);
        const openId = existing ? existing.openId : `user_${Date.now().toString(36)}`;

        await upsertUser({
          openId,
          email: input.email,
          name: input.name,
          role: input.role,
          loginMethod: "password",
          lastSignedIn: new Date(),
        });

        const user = await getUserByOpenId(openId);
        const sessionToken = await sdk.createSessionToken(openId, {
          name: input.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        await logAuditEvent({
          id: `aud_auth_${Date.now()}`,
          eventId: "sys_auth",
          stepName: "audit",
          detail: `New user ${input.name} registered with role: ${input.role.toUpperCase()}`,
          state: "done",
          timestamp: Date.now(),
        });

        return { success: true, user, token: sessionToken };
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

      if (ctx.user) {
        await logAuditEvent({
          id: `aud_auth_${Date.now()}`,
          eventId: "sys_auth",
          stepName: "audit",
          detail: `User ${ctx.user.name || ctx.user.email} signed out from workspace`,
          state: "done",
          timestamp: Date.now(),
        });
      }

      return { success: true } as const;
    }),
  }),
  recovery: router({
    overview: protectedProcedure.query(async () => {
      const [run, cases, approvals, policy] = await Promise.all([
        getLatestRun(),
        getAllCases(),
        getAllApprovals(),
        getPolicyRules(),
      ]);
      return { run, cases, approvals, policy };
    }),

    listCases: protectedProcedure
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

    getCase: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getCaseById(input.id);
      }),

    getCaseAuditTrail: protectedProcedure
      .input(z.object({ eventId: z.string() }))
      .query(async ({ input }) => {
        return getAuditEventsByCaseId(input.eventId);
      }),

    approvals: protectedProcedure.query(async () => {
      return getAllApprovals();
    }),

    decideApproval: protectedProcedure
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

    policy: protectedProcedure.query(async () => {
      return getPolicyRules();
    }),

    updatePolicy: adminProcedure
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

    simulatePolicy: protectedProcedure
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

    replay: protectedProcedure
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

    report: protectedProcedure.query(async (): Promise<RecoveryReport> => {
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

    exportReport: protectedProcedure
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

    ingestTestPayment: protectedProcedure
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

    startRun: protectedProcedure.mutation(async () => {
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

  ai: router({
    diagnose: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          merchantName: z.string(),
          amount: z.number(),
          declineCode: z.string(),
          attemptCount: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        return generateAIDiagnosis(input);
      }),

    generateNudge: protectedProcedure
      .input(
        z.object({
          caseId: z.string(),
          channel: z.enum(["email", "whatsapp", "sms"]).default("email"),
          tone: z.enum(["concierge", "urgent", "security_first", "friendly"]).default("concierge"),
          discountPercent: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const foundCase = await getCaseById(input.caseId);
        if (!foundCase) {
          throw new Error(`Case ${input.caseId} not found`);
        }
        return generateRecoveryNudge({
          caseData: foundCase,
          channel: input.channel,
          tone: input.tone,
          discountPercent: input.discountPercent,
        });
      }),

    copilotChat: protectedProcedure
      .input(
        z.object({
          message: z.string().min(1),
          history: z
            .array(z.object({ role: z.enum(["user", "model"]), text: z.string() }))
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const [cases, policies, run] = await Promise.all([
          getAllCases(),
          getPolicyRules(),
          getLatestRun(),
        ]);
        const totalRecovered =
          run?.totalRecovered ??
          cases
            .filter(c => c.actionResult === "recovered")
            .reduce((sum, c) => sum + (c.amountRecovered || c.amount), 0);

        return chatWithFinanceCopilot({
          message: input.message,
          history: input.history,
          cases,
          policies,
          totalRecovered,
        });
      }),

    policyAdvisor: protectedProcedure.query(async () => {
      const [cases, policies] = await Promise.all([getAllCases(), getPolicyRules()]);
      const activePolicy = policies[0] ?? {
        id: "pol_def",
        rootCause: "all",
        amountCeiling: 10000,
        confidenceFloor: 0.82,
        maxRetries: 2,
        cooldownMinutes: 240,
        channels: ["email", "sms", "link"],
        requiresApproval: false,
      };
      return generatePolicyAdvice(cases, activePolicy);
    }),
  }),
});

export type AppRouter = typeof appRouter;
