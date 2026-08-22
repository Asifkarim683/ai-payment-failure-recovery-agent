# Project TODO

- [x] Live recovery dashboard with at-risk payments, pipeline status, recovery outcomes, and recovered revenue
- [x] Explainable payment-failure investigations with timeline, diagnosis, action, confidence, and audit trail
- [x] Bounded recovery-action workflow with explicit human approval queue and approve/reject controls
- [x] Editable recovery policies for retry limits, escalation thresholds, permitted channels, and approval rules
- [x] Case replay view for prior policy and recovery decisions
- [x] Recovery reports for rate, revenue, action performance, and approval activity
- [x] Persistence-ready domain models and typed APIs for cases, actions, policies, approvals, events, and reports
- [x] Seeded realistic demo data without fabricated customer testimonials or reviews
- [x] Responsive loading, empty, and error states across primary flows
- [x] Automated tests for policy, approval, and recovery-status logic
- [x] Elegant, refined visual system with responsive layout and purposeful motion
- [x] Final browser verification and single delivery checkpoint

## Connected workflow follow-up

- [x] Wire dashboard, cases, approvals, policies, replay, and reports to tRPC queries and mutations
- [x] Add live refresh for dashboard metrics and pipeline state
- [x] Connect approval controls to backend decision mutation
- [x] Bind policy editor to backend read/write procedures with validation states
- [x] Drive replay and reports from backend procedures
- [x] Add loading and error states to all primary screens and mutations
- [x] Add purposeful motion for pipeline, trace drawer, counters, and approval attention
- [x] Add dedicated approval mutation tests
- [x] Run final verification and save the single delivery checkpoint

## Full-Stack Platform Upgrade (Completed)

- [x] **Drizzle ORM Repository & Store Layer**: Persistent CRUD methods for runs, cases, approvals, policy rules, and dynamic audit events with graceful in-memory fallback.
- [x] **Gateway Webhook Ingestion Engine (`/api/webhooks/payment`)**: Normalizes Stripe (`charge.failed`), Razorpay (`payment.failed`), and custom JSON payloads, evaluating against active policies.
- [x] **Action Execution & Dispatcher Engine (`server/execution.ts`)**: Generates fresh checkout links, schedules delayed retries, and records execution audit trails.
- [x] **Frontend Modularization**: Separated monolithic `Home.tsx` into clean, dedicated components (`OverviewTab`, `CasesTab`, `ApprovalsTab`, `PolicyStudioTab`, `ReplayLabTab`, `ReportsTab`, `DecisionTraceDrawer`).
- [x] **Interactive Policy Sandbox / Simulator**: What-if testing dialog projecting auto-resolution rate, gated counts, and revenue delta on historical payments.
- [x] **Synthetic Payment Ingestion Modal**: Live event simulator allowing instant testing of pipeline diagnosis and gating directly from the UI.
- [x] **Data & Report Exporting**: CSV and JSON report exporter for audit and compliance.
- [x] **Automated Test Suite**: 21 unit and integration tests across logic, webhooks, execution, and approvals (`pnpm test` passing 100%).
