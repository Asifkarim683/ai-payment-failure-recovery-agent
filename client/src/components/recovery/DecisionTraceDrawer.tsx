import {
  AlertTriangle,
  Check,
  Clock3,
  Sparkles,
  ChevronRight,
  X,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import type { RecoveryCase } from "@shared/types";
import {
  formatAction,
  formatCause,
  formatConfidence,
  formatMoney,
  getStatusStyle,
} from "./recoveryUtils";

interface DecisionTraceDrawerProps {
  selectedCase: RecoveryCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isApproving?: boolean;
}

export function DecisionTraceDrawer({
  selectedCase,
  open,
  onOpenChange,
  onApprove,
  onReject,
  isApproving = false,
}: DecisionTraceDrawerProps) {
  const auditQuery = trpc.recovery.getCaseAuditTrail.useQuery(
    { eventId: selectedCase?.id ?? "" },
    { enabled: !!selectedCase && open }
  );

  if (!selectedCase) return null;

  const statusInfo = getStatusStyle(selectedCase.actionResult);
  const confidenceNum = Math.round((selectedCase.confidence ?? 0.85) * 100);

  return (
    <Sheet open={open && !!selectedCase} onOpenChange={onOpenChange}>
      <SheetContent className="trace-drawer">
        <SheetHeader>
          <div className="drawer-kicker">
            <span className="live-dot" /> DECISION TRACE
          </div>
          <SheetTitle>{selectedCase.merchantName}</SheetTitle>
          <p className="drawer-subtitle">
            {selectedCase.id} · {new Date(selectedCase.createdAt).toLocaleTimeString()}
          </p>
        </SheetHeader>

        <div className="drawer-content">
          {/* Amount at risk */}
          <div className="drawer-amount">
            <div>
              <span className="eyebrow">AMOUNT AT RISK</span>
              <strong>{formatMoney(selectedCase.amount)}</strong>
            </div>
            <span className={statusInfo.className}>{statusInfo.label}</span>
          </div>

          {/* Decision Summary */}
          <div className="trace-section">
            <div className="eyebrow">DECISION SUMMARY</div>
            <div className="decision-box">
              <div className="decision-icon">
                <Sparkles size={17} />
              </div>
              <div>
                <strong>{formatCause(selectedCase.rootCause)}</strong>
                <p>
                  Telemetry matches a{" "}
                  {formatCause(selectedCase.rootCause).toLowerCase()} pattern.
                  The recommended action is bounded by your workspace policy.
                </p>
              </div>
            </div>
            <div className="confidence-row">
              <span>Diagnosis confidence</span>
              <strong>{formatConfidence(selectedCase.confidence)}</strong>
            </div>
            <Progress value={confidenceNum} className="confidence-progress" />
          </div>

          {/* Dynamic Pipeline Timeline */}
          <div className="trace-section">
            <div className="flex items-center justify-between">
              <div className="eyebrow">PIPELINE AUDIT TRAIL</div>
              {auditQuery.isLoading && (
                <RefreshCw size={12} className="spin text-muted-foreground" />
              )}
            </div>
            <div className="audit-list">
              {(auditQuery.data ?? []).map((step, idx) => (
                <div className={`audit-item ${step.state ?? "done"}`} key={step.id || idx}>
                  <div className="audit-rail">
                    <div className="audit-dot">
                      {step.state === "warn" ? (
                        <AlertTriangle size={11} />
                      ) : step.state === "current" ? (
                        <Clock3 size={11} />
                      ) : (
                        <Check size={11} />
                      )}
                    </div>
                  </div>
                  <div className="audit-copy">
                    <div className="audit-top">
                      <strong className="capitalize">{step.stepName}</strong>
                      <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p>{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matched Policy */}
          <div className="trace-section">
            <div className="eyebrow">MATCHED POLICY RULE</div>
            <div className="policy-match">
              <div>
                <strong>{formatAction(selectedCase.recommendedAction)}</strong>
                <p>
                  Decline Code: <code>{selectedCase.declineCode || selectedCase.rootCause}</code>
                </p>
                {selectedCase.gateReason && (
                  <p className="text-amber-600 font-medium text-xs mt-1">
                    {selectedCase.gateReason}
                  </p>
                )}
              </div>
              <ChevronRight size={16} />
            </div>
          </div>

          {/* Action buttons if needs approval */}
          {selectedCase.actionResult === "needs_approval" && (
            <div className="drawer-actions">
              <Button
                className="approve-btn"
                onClick={() => onApprove(selectedCase.id)}
                disabled={isApproving}
              >
                <Check size={16} /> {isApproving ? "Approving..." : "Approve action"}
              </Button>
              <Button
                variant="outline"
                className="reject-btn"
                onClick={() => onReject(selectedCase.id)}
                disabled={isApproving}
              >
                <X size={16} /> Reject
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
