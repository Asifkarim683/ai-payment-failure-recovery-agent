import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  User,
  users,
  recoveryRuns,
  recoveryCases,
  recoveryApprovals,
  policyRules,
  recoveryAuditEvents,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import type {
  Approval,
  PipelineStepName,
  PolicyRule,
  RecoveryAuditEvent,
  RecoveryCase,
  RecoveryRun,
} from "@shared/types";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ---------------------------------------------------------------------------
// In-Memory Seed & State Cache (Used seamlessly when DB is absent or as live memory)
// ---------------------------------------------------------------------------
const now = Date.now();

let inMemoryRun: RecoveryRun = {
  id: "run_2026_08_22_1642",
  startedAt: now - 12 * 60_000,
  status: "completed",
  totalAtRisk: 74600,
  totalRecovered: 50850,
  eventCount: 48,
  pipeline: { ingest: 48, diagnose: 42, policy: 36, execute: 29, audit: 48 },
};

let inMemoryCases: RecoveryCase[] = [
  {
    id: "evt_8F2A",
    runId: inMemoryRun.id,
    merchantId: "m_northstar",
    merchantName: "Northstar Learning",
    amount: 18400,
    paymentStatus: "failed",
    declineCode: "insufficient_funds",
    attemptCount: 1,
    rootCause: "insufficient_funds",
    confidence: 0.96,
    recommendedAction: "delayed_retry",
    actionGated: false,
    actionResult: "recovered",
    amountRecovered: 18400,
    createdAt: now - 2 * 60_000,
  },
  {
    id: "evt_8F2B",
    runId: inMemoryRun.id,
    merchantId: "m_arcpine",
    merchantName: "Arc & Pine Studio",
    amount: 12250,
    paymentStatus: "otp_abandoned",
    declineCode: "otp_abandoned",
    attemptCount: 0,
    rootCause: "otp_abandoned",
    confidence: 0.91,
    recommendedAction: "fresh_checkout_link",
    actionGated: true,
    gateReason: "Amount exceeds approval ceiling",
    actionResult: "needs_approval",
    amountRecovered: 0,
    createdAt: now - 4 * 60_000,
  },
  {
    id: "evt_8F2C",
    runId: inMemoryRun.id,
    merchantId: "m_morrow",
    merchantName: "Morrow Health",
    amount: 8750,
    paymentStatus: "failed",
    declineCode: "timeout",
    attemptCount: 1,
    rootCause: "timeout",
    confidence: 0.88,
    recommendedAction: "immediate_retry",
    actionGated: false,
    actionResult: "processing",
    amountRecovered: 0,
    createdAt: now - 6 * 60_000,
  },
  {
    id: "evt_8F2D",
    runId: inMemoryRun.id,
    merchantId: "m_cedar",
    merchantName: "Cedar & Co.",
    amount: 6400,
    paymentStatus: "failed",
    declineCode: "expired_card",
    attemptCount: 1,
    rootCause: "expired_card",
    confidence: 0.99,
    recommendedAction: "update_payment_method",
    actionGated: false,
    actionResult: "recovered",
    amountRecovered: 6400,
    createdAt: now - 8 * 60_000,
  },
  {
    id: "evt_8F2E",
    runId: inMemoryRun.id,
    merchantId: "m_hearthside",
    merchantName: "Hearthside Goods",
    amount: 5200,
    paymentStatus: "failed",
    declineCode: "do_not_honor",
    attemptCount: 0,
    rootCause: "do_not_honor",
    confidence: 0.73,
    recommendedAction: "alternate_payment",
    actionGated: true,
    gateReason: "Diagnosis confidence is below floor",
    actionResult: "needs_approval",
    amountRecovered: 0,
    createdAt: now - 11 * 60_000,
  },
  {
    id: "evt_8F2F",
    runId: inMemoryRun.id,
    merchantId: "m_lumen",
    merchantName: "Lumen Events",
    amount: 3800,
    paymentStatus: "failed",
    declineCode: "cart_abandoned",
    attemptCount: 0,
    rootCause: "cart_abandoned",
    confidence: 0.86,
    recommendedAction: "cart_recovery_nudge",
    actionGated: false,
    actionResult: "recovered",
    amountRecovered: 3800,
    createdAt: now - 14 * 60_000,
  },
];

let inMemoryApprovals: Approval[] = [
  { id: "apr_001", eventId: "evt_8F2B", status: "pending" },
  { id: "apr_002", eventId: "evt_8F2E", status: "pending" },
];

let inMemoryPolicies: PolicyRule[] = [
  {
    id: "pol_001",
    rootCause: "otp_abandoned",
    action: "fresh_checkout_link",
    maxRetries: 2,
    cooldownMinutes: 240,
    amountCeiling: 10000,
    confidenceFloor: 0.82,
    permittedChannels: ["email", "checkout_link"],
    requiresApproval: false,
    updatedAt: now,
  },
];

let inMemoryAuditEvents: RecoveryAuditEvent[] = [
  {
    id: "aud_001",
    eventId: "evt_8F2B",
    stepName: "ingest",
    detail: "Payment event normalized from gateway webhook",
    state: "done",
    timestamp: now - 4 * 60_000,
  },
  {
    id: "aud_002",
    eventId: "evt_8F2B",
    stepName: "diagnose",
    detail: "Classified as OTP / 3DS abandonment with 91% confidence",
    state: "done",
    timestamp: now - 4 * 60_000 + 1000,
  },
  {
    id: "aud_003",
    eventId: "evt_8F2B",
    stepName: "policy",
    detail: "Matched rule otp_abandoned → fresh checkout link",
    state: "done",
    timestamp: now - 4 * 60_000 + 2000,
  },
  {
    id: "aud_004",
    eventId: "evt_8F2B",
    stepName: "gate",
    detail: "Amount ₹12,250 exceeds ₹10,000 ceiling; routed to approval queue",
    state: "warn",
    timestamp: now - 4 * 60_000 + 2500,
  },
  {
    id: "aud_005",
    eventId: "evt_8F2B",
    stepName: "execute",
    detail: "Awaiting Finance Ops approval before link generation",
    state: "current",
    timestamp: now - 4 * 60_000 + 3000,
  },
];

let inMemoryUsers: User[] = [
  {
    id: 1,
    openId: "user_eren_admin",
    name: "Eren Rocha",
    email: "eren@recoverly.io",
    loginMethod: "password",
    role: "admin",
    createdAt: new Date(now - 30 * 24 * 3600 * 1000),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  {
    id: 2,
    openId: "user_maya_analyst",
    name: "Maya Patel",
    email: "maya@recoverly.io",
    loginMethod: "password",
    role: "user",
    createdAt: new Date(now - 15 * 24 * 3600 * 1000),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  {
    id: 3,
    openId: "user_alex_reviewer",
    name: "Alex Thorne",
    email: "alex@recoverly.io",
    loginMethod: "password",
    role: "user",
    createdAt: new Date(now - 7 * 24 * 3600 * 1000),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
];

// ---------------------------------------------------------------------------
// User Operations
// ---------------------------------------------------------------------------
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const existingIdx = inMemoryUsers.findIndex(u => u.openId === user.openId);
  const nowTime = new Date();
  if (existingIdx >= 0) {
    inMemoryUsers[existingIdx] = {
      ...inMemoryUsers[existingIdx],
      name: user.name ?? inMemoryUsers[existingIdx].name,
      email: user.email ?? inMemoryUsers[existingIdx].email,
      role: (user.role as any) ?? inMemoryUsers[existingIdx].role,
      loginMethod: user.loginMethod ?? inMemoryUsers[existingIdx].loginMethod,
      lastSignedIn: user.lastSignedIn ?? nowTime,
      updatedAt: nowTime,
    };
  } else {
    inMemoryUsers.push({
      id: inMemoryUsers.length + 1,
      openId: user.openId,
      name: user.name ?? "User",
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? "password",
      role: (user.role as any) ?? "user",
      createdAt: nowTime,
      updatedAt: nowTime,
      lastSignedIn: nowTime,
    });
  }

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
  }
}

export async function getUserByOpenId(openId: string) {
  const memUser = inMemoryUsers.find(u => u.openId === openId);
  if (memUser) return memUser;

  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const normalized = email.toLowerCase().trim();
  const memUser = inMemoryUsers.find(u => (u.email ?? "").toLowerCase() === normalized);
  if (memUser) return memUser;

  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ---------------------------------------------------------------------------
// Recovery Runs Repository
// ---------------------------------------------------------------------------
export async function getLatestRun(): Promise<RecoveryRun> {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select().from(recoveryRuns).limit(1);
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          startedAt: r.startedAt.getTime(),
          finishedAt: r.finishedAt ? r.finishedAt.getTime() : undefined,
          status: r.status,
          totalAtRisk: Number(r.totalAtRisk),
          totalRecovered: Number(r.totalRecovered),
          eventCount: r.eventCount,
          pipeline: inMemoryRun.pipeline,
        };
      }
    } catch (e) {
      console.warn("[Database] Falling back to memory for getLatestRun:", e);
    }
  }
  return inMemoryRun;
}

export async function updateRunMetrics(updates: Partial<RecoveryRun>): Promise<RecoveryRun> {
  inMemoryRun = { ...inMemoryRun, ...updates };
  const db = await getDb();
  if (db && inMemoryRun.id) {
    try {
      await db
        .update(recoveryRuns)
        .set({
          totalAtRisk: inMemoryRun.totalAtRisk.toFixed(2),
          totalRecovered: inMemoryRun.totalRecovered.toFixed(2),
          eventCount: inMemoryRun.eventCount,
          status: inMemoryRun.status,
        })
        .where(eq(recoveryRuns.id, inMemoryRun.id));
    } catch (e) {
      console.warn("[Database] Failed to persist run update:", e);
    }
  }
  return inMemoryRun;
}

// ---------------------------------------------------------------------------
// Cases Repository
// ---------------------------------------------------------------------------
export async function getAllCases(): Promise<RecoveryCase[]> {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select().from(recoveryCases);
      if (rows.length > 0) {
        return rows.map(r => ({
          id: r.id,
          runId: r.runId,
          merchantId: r.merchantId,
          merchantName: r.merchantName,
          amount: Number(r.amount),
          paymentStatus: r.paymentStatus,
          declineCode: r.declineCode ?? undefined,
          attemptCount: r.attemptCount,
          rootCause: (r.rootCause as any) ?? undefined,
          confidence: r.confidence ? Number(r.confidence) : undefined,
          recommendedAction: (r.recommendedAction as any) ?? undefined,
          actionGated: r.actionGated === 1,
          gateReason: r.gateReason ?? undefined,
          actionResult: (r.actionResult as any) ?? undefined,
          amountRecovered: Number(r.amountRecovered),
          createdAt: r.createdAt.getTime(),
        }));
      }
    } catch (e) {
      console.warn("[Database] Falling back to memory for getAllCases:", e);
    }
  }
  return inMemoryCases;
}

export async function getCaseById(id: string): Promise<RecoveryCase | undefined> {
  const cases = await getAllCases();
  return cases.find(c => c.id === id);
}

export async function upsertCase(newCase: RecoveryCase): Promise<RecoveryCase> {
  const existingIndex = inMemoryCases.findIndex(c => c.id === newCase.id);
  if (existingIndex >= 0) {
    inMemoryCases[existingIndex] = newCase;
  } else {
    inMemoryCases.unshift(newCase);
    inMemoryRun.eventCount += 1;
    inMemoryRun.totalAtRisk += newCase.amount;
    if (inMemoryRun.pipeline) {
      inMemoryRun.pipeline.ingest += 1;
      inMemoryRun.pipeline.diagnose += 1;
      inMemoryRun.pipeline.policy += 1;
      if (!newCase.actionGated) {
        inMemoryRun.pipeline.execute += 1;
      }
      inMemoryRun.pipeline.audit += 1;
    }
  }

  const db = await getDb();
  if (db) {
    try {
      await db
        .insert(recoveryCases)
        .values({
          id: newCase.id,
          runId: newCase.runId,
          merchantId: newCase.merchantId,
          merchantName: newCase.merchantName,
          amount: newCase.amount.toFixed(2),
          paymentStatus: newCase.paymentStatus,
          declineCode: newCase.declineCode ?? null,
          attemptCount: newCase.attemptCount,
          rootCause: newCase.rootCause ?? null,
          confidence: newCase.confidence ? newCase.confidence.toFixed(4) : null,
          recommendedAction: newCase.recommendedAction ?? null,
          actionGated: newCase.actionGated ? 1 : 0,
          gateReason: newCase.gateReason ?? null,
          actionResult: newCase.actionResult ?? null,
          amountRecovered: newCase.amountRecovered.toFixed(2),
          createdAt: new Date(newCase.createdAt),
        })
        .onDuplicateKeyUpdate({
          set: {
            actionResult: newCase.actionResult ?? null,
            amountRecovered: newCase.amountRecovered.toFixed(2),
          },
        });
    } catch (e) {
      console.warn("[Database] Failed to upsert case to DB:", e);
    }
  }

  return newCase;
}

export async function updateCaseStatus(
  id: string,
  status: RecoveryCase["actionResult"],
  amountRecovered?: number
): Promise<RecoveryCase | undefined> {
  const c = inMemoryCases.find(item => item.id === id);
  if (!c) return undefined;

  c.actionResult = status;
  if (amountRecovered !== undefined) {
    c.amountRecovered = amountRecovered;
    inMemoryRun.totalRecovered += amountRecovered;
  }

  const db = await getDb();
  if (db) {
    try {
      await db
        .update(recoveryCases)
        .set({
          actionResult: status ?? null,
          amountRecovered: (amountRecovered ?? c.amountRecovered).toFixed(2),
        })
        .where(eq(recoveryCases.id, id));
    } catch (e) {
      console.warn("[Database] Failed to update case status in DB:", e);
    }
  }

  return c;
}

// ---------------------------------------------------------------------------
// Approvals Repository
// ---------------------------------------------------------------------------
export async function getAllApprovals(): Promise<Approval[]> {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select().from(recoveryApprovals);
      if (rows.length > 0) {
        return rows.map(r => ({
          id: r.id,
          eventId: r.eventId,
          status: r.status,
          reviewedBy: r.reviewedBy ?? undefined,
          reviewedAt: r.reviewedAt ? r.reviewedAt.getTime() : undefined,
        }));
      }
    } catch (e) {
      console.warn("[Database] Falling back to memory for getAllApprovals:", e);
    }
  }
  return inMemoryApprovals;
}

export async function createApproval(approval: Approval): Promise<Approval> {
  const existing = inMemoryApprovals.find(a => a.id === approval.id || a.eventId === approval.eventId);
  if (!existing) {
    inMemoryApprovals.push(approval);
  }
  return approval;
}

export async function decideApproval(
  id: string,
  decision: "approved" | "rejected",
  reviewer: string = "analyst"
): Promise<Approval> {
  const item = inMemoryApprovals.find(a => a.id === id || a.eventId === id);
  if (!item) throw new Error(`Approval record not found for id/eventId: ${id}`);

  item.status = decision;
  item.reviewedBy = reviewer;
  item.reviewedAt = Date.now();

  const db = await getDb();
  if (db) {
    try {
      await db
        .update(recoveryApprovals)
        .set({
          status: decision,
          reviewedBy: reviewer,
          reviewedAt: new Date(item.reviewedAt),
        })
        .where(eq(recoveryApprovals.id, item.id));
    } catch (e) {
      console.warn("[Database] Failed to persist approval decision:", e);
    }
  }

  return item;
}

// ---------------------------------------------------------------------------
// Policy Rules Repository
// ---------------------------------------------------------------------------
export async function getPolicyRules(): Promise<PolicyRule[]> {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select().from(policyRules);
      if (rows.length > 0) {
        return rows.map(r => ({
          id: r.id,
          rootCause: r.rootCause as any,
          action: r.action as any,
          maxRetries: r.maxRetries,
          cooldownMinutes: r.cooldownMinutes,
          amountCeiling: Number(r.amountCeiling),
          confidenceFloor: Number(r.confidenceFloor),
          permittedChannels: Array.isArray(r.permittedChannels) ? (r.permittedChannels as string[]) : [],
          requiresApproval: r.requiresApproval === 1,
          updatedAt: r.updatedAt.getTime(),
        }));
      }
    } catch (e) {
      console.warn("[Database] Falling back to memory for getPolicyRules:", e);
    }
  }
  return inMemoryPolicies;
}

export async function updatePolicyRules(updates: Partial<PolicyRule>): Promise<PolicyRule[]> {
  const time = Date.now();
  inMemoryPolicies = inMemoryPolicies.map(p => ({
    ...p,
    ...updates,
    updatedAt: time,
  }));

  const db = await getDb();
  if (db) {
    try {
      for (const p of inMemoryPolicies) {
        await db
          .update(policyRules)
          .set({
            maxRetries: p.maxRetries,
            cooldownMinutes: p.cooldownMinutes,
            amountCeiling: p.amountCeiling.toFixed(2),
            confidenceFloor: p.confidenceFloor.toFixed(4),
            updatedAt: new Date(time),
          })
          .where(eq(policyRules.id, p.id));
      }
    } catch (e) {
      console.warn("[Database] Failed to update policy rules in DB:", e);
    }
  }

  return inMemoryPolicies;
}

// ---------------------------------------------------------------------------
// Audit Events Repository
// ---------------------------------------------------------------------------
export async function getAuditEventsByCaseId(eventId: string): Promise<RecoveryAuditEvent[]> {
  const specific = inMemoryAuditEvents.filter(a => a.eventId === eventId);
  if (specific.length > 0) return specific;

  // Generate dynamic contextual audit events if none recorded yet
  const targetCase = inMemoryCases.find(c => c.id === eventId);
  const eventTime = targetCase ? targetCase.createdAt : Date.now();

  const generated: RecoveryAuditEvent[] = [
    {
      id: `aud_${eventId}_ingest`,
      eventId,
      stepName: "ingest",
      detail: `Payment event normalized from gateway webhook for ${targetCase?.merchantName ?? "merchant"}`,
      state: "done",
      timestamp: eventTime,
    },
    {
      id: `aud_${eventId}_diag`,
      eventId,
      stepName: "diagnose",
      detail: `Classified as ${targetCase?.rootCause ?? "payment_decline"} with ${Math.round((targetCase?.confidence ?? 0.85) * 100)}% confidence`,
      state: "done",
      timestamp: eventTime + 1000,
    },
    {
      id: `aud_${eventId}_policy`,
      eventId,
      stepName: "policy",
      detail: `Matched policy rule → ${targetCase?.recommendedAction ?? "retry"}`,
      state: "done",
      timestamp: eventTime + 2000,
    },
    {
      id: `aud_${eventId}_gate`,
      eventId,
      stepName: "gate",
      detail: targetCase?.actionGated
        ? targetCase.gateReason ?? "Approval required by policy threshold"
        : "Autonomous execution approved under current policy ceiling",
      state: targetCase?.actionGated ? "warn" : "done",
      timestamp: eventTime + 2500,
    },
    {
      id: `aud_${eventId}_exec`,
      eventId,
      stepName: "execute",
      detail:
        targetCase?.actionResult === "recovered"
          ? `Recovery action succeeded. ₹${(targetCase.amountRecovered || targetCase.amount).toLocaleString("en-IN")} recovered.`
          : targetCase?.actionResult === "needs_approval"
          ? "Queued in human review queue."
          : targetCase?.actionResult === "rejected"
          ? "Action rejected by reviewer. Audit log closed."
          : "Action in progress.",
      state:
        targetCase?.actionResult === "recovered"
          ? "done"
          : targetCase?.actionResult === "rejected"
          ? "warn"
          : "current",
      timestamp: eventTime + 3000,
    },
  ];

  return generated;
}

export async function logAuditEvent(event: RecoveryAuditEvent): Promise<RecoveryAuditEvent> {
  inMemoryAuditEvents.push(event);
  const db = await getDb();
  if (db) {
    try {
      await db.insert(recoveryAuditEvents).values({
        id: event.id,
        eventId: event.eventId,
        stepName: event.stepName,
        detailJson: { detail: event.detail, state: event.state, metadata: event.metadata },
        timestamp: new Date(event.timestamp),
      });
    } catch (e) {
      console.warn("[Database] Failed to log audit event in DB:", e);
    }
  }
  return event;
}
