import { AlertTriangle, Check, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecoveryCase } from "@shared/types";
import {
  formatAction,
  formatConfidence,
  formatMoney,
  getInitials,
} from "./recoveryUtils";

interface ApprovalsTabProps {
  cases: RecoveryCase[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSelectCase: (c: RecoveryCase) => void;
  isProcessing?: boolean;
}

export function ApprovalsTab({
  cases,
  onApprove,
  onReject,
  onSelectCase,
  isProcessing = false,
}: ApprovalsTabProps) {
  const pendingCases = cases.filter(c => c.actionResult === "needs_approval");
  const resolvedCount = cases.filter(c => c.actionResult === "recovered").length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">HUMAN-IN-THE-LOOP GOVERNANCE</div>
          <h1>Approval queue</h1>
          <p>Review gated recovery actions before they reach execution channels.</p>
        </div>
        <div className="queue-stat">
          <span className="live-dot amber-dot" /> {pendingCases.length} awaiting review
        </div>
      </div>

      <div className="approval-grid">
        {pendingCases.map(c => (
          <div className="approval-card" key={c.id}>
            <div className="approval-head">
              <div className="case-cell">
                <div className="merchant-avatar amber">
                  {getInitials(c.merchantName)}
                </div>
                <div>
                  <strong>{c.merchantName}</strong>
                  <span>
                    {c.id} · {new Date(c.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <span className="status-warning">Needs approval</span>
            </div>

            <div className="approval-amount">
              {formatMoney(c.amount)} <span>at risk</span>
            </div>

            <div className="approval-reason">
              <AlertTriangle size={16} />
              <div>
                <strong>Why this is gated</strong>
                <p>
                  {c.gateReason ||
                    `Amount exceeds approval ceiling. Diagnosis confidence is ${formatConfidence(c.confidence)}.`}
                </p>
              </div>
            </div>

            <div className="approval-action">
              <div className="eyebrow">PROPOSED RECOVERY ACTION</div>
              <strong>{formatAction(c.recommendedAction)}</strong>
              <span>Permitted channels: Email + Instant Checkout Link</span>
            </div>

            <div className="approval-buttons">
              <Button
                className="approve-btn"
                onClick={() => onApprove(c.id)}
                disabled={isProcessing}
              >
                <Check size={15} /> Approve action
              </Button>
              <Button
                variant="outline"
                className="reject-btn"
                onClick={() => onReject(c.id)}
                disabled={isProcessing}
              >
                <X size={15} /> Reject
              </Button>
              <Button
                variant="ghost"
                className="trace-btn"
                onClick={() => onSelectCase(c)}
              >
                Explain decision <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        ))}

        {pendingCases.length === 0 && (
          <div className="empty-state bg-white border border-slate-200 rounded-lg p-10">
            <Check size={32} className="text-emerald-500 mx-auto mb-3" />
            <strong className="text-base text-slate-800">
              Approval queue is all clear!
            </strong>
            <p className="text-sm text-slate-500 mt-1">
              All high-risk and low-confidence failure events have been evaluated.
            </p>
          </div>
        )}

        {resolvedCount > 0 && (
          <div className="resolved-note">
            <Check size={16} /> {resolvedCount} action
            {resolvedCount > 1 ? "s" : ""} currently recovered in this workspace.
          </div>
        )}
      </div>
    </>
  );
}
