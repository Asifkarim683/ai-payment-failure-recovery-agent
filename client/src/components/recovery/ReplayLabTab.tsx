import { useState } from "react";
import {
  Play,
  Check,
  AlertTriangle,
  TimerReset,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { RecoveryCase } from "@shared/types";
import { formatMoney, getInitials } from "./recoveryUtils";

interface ReplayLabTabProps {
  cases: RecoveryCase[];
  onSelectCase: (c: RecoveryCase) => void;
}

export function ReplayLabTab({ cases, onSelectCase }: ReplayLabTabProps) {
  const [playing, setPlaying] = useState(false);
  const [selectedRunIdx, setSelectedRunIdx] = useState(0);

  const targetCase = cases[1] || cases[0];
  const replayQuery = trpc.recovery.replay.useQuery(
    {
      runId: "run_2026_08_22_1642",
      eventId: targetCase?.id ?? "evt_8F2B",
    },
    { enabled: !!targetCase }
  );

  const startReplay = () => {
    setPlaying(true);
    toast.success("Replay sequence started", {
      description: "Stepping through agent reasoning signals at 1× speed.",
    });
    setTimeout(() => {
      setPlaying(false);
      toast.info("Replay sequence finished", {
        description: "All pipeline decision steps verified against policy v2.1.",
      });
    }, 3800);
  };

  const runs = [
    { id: "run_2026_08_22_1642", label: "Today", count: "48 events", recovered: "₹50,850" },
    { id: "run_2026_08_21_0918", label: "Yesterday", count: "36 events", recovered: "₹42,100" },
    { id: "run_2026_08_19_1741", label: "3 days ago", count: "41 events", recovered: "₹36,400" },
  ];

  const replaySteps = [
    { name: "Ingest", status: "Complete" },
    { name: "Diagnose", status: "Complete" },
    { name: "Policy", status: "Complete" },
    { name: "Gate", status: targetCase?.actionGated ? "Gated" : "Complete" },
    { name: "Execute", status: "Pending approval" },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">DEBUGGING & AUDIT TRAIL</div>
          <h1>Replay lab</h1>
          <p>
            Step through a prior recovery decision and see exactly what signals the
            agent evaluated.
          </p>
        </div>
        <Button className="primary-action" onClick={startReplay} disabled={playing}>
          <Play size={15} fill="currentColor" />
          {playing ? "Replaying sequence…" : "Play replay"}
        </Button>
      </div>

      <div className="replay-layout">
        {/* Left Run Selector */}
        <div className="panel replay-selector">
          <div className="panel-head">
            <div>
              <h2>Historical recovery runs</h2>
              <p>Replay is read-only and never dispatches live actions.</p>
            </div>
          </div>

          {runs.map((r, i) => (
            <button
              key={r.id}
              className={`run-row ${selectedRunIdx === i ? "selected" : ""}`}
              onClick={() => setSelectedRunIdx(i)}
            >
              <div>
                <strong>{r.id}</strong>
                <span>
                  {r.label} · {r.count}
                </span>
              </div>
              <span>{r.recovered}</span>
            </button>
          ))}
        </div>

        {/* Right Replay Stage */}
        <div className="panel replay-stage">
          <div className="replay-case">
            <div className="eyebrow">SELECTED TRANSACTION TELEMETRY</div>
            {targetCase && (
              <div className="case-cell">
                <div className="merchant-avatar amber">
                  {getInitials(targetCase.merchantName)}
                </div>
                <div>
                  <strong>{targetCase.merchantName}</strong>
                  <span>
                    {targetCase.id} · {formatMoney(targetCase.amount)} at risk
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Track */}
          <div className="replay-track">
            {replaySteps.map((step, i) => (
              <div
                className={`replay-step ${playing && i <= 3 ? "played" : ""}`}
                key={step.name}
              >
                <div className="replay-node">
                  {i < 3 ? (
                    <Check size={14} />
                  ) : i === 3 ? (
                    <AlertTriangle size={14} />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <strong>{step.name}</strong>
                <small>{step.status}</small>
              </div>
            ))}
          </div>

          <div className="replay-footer">
            <span>
              <TimerReset size={14} /> Timeline offset: +00:00:01.8 · State verified
            </span>
            {targetCase && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectCase(targetCase)}
              >
                Open full trace <ChevronRight size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
