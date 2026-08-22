import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatMoney } from "./recoveryUtils";

interface PolicySimulatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCeiling?: number;
  initialFloor?: number;
  initialRetries?: number;
  onApplyPolicy?: (params: {
    maxRetries: number;
    amountCeiling: number;
    confidenceFloor: number;
  }) => void;
}

export function PolicySimulatorModal({
  open,
  onOpenChange,
  initialCeiling = 10000,
  initialFloor = 0.82,
  initialRetries = 2,
  onApplyPolicy,
}: PolicySimulatorModalProps) {
  const [ceiling, setCeiling] = useState(String(initialCeiling));
  const [floor, setFloor] = useState(String(Math.round(initialFloor * 100)));
  const [retries, setRetries] = useState(String(initialRetries));

  const simulateMutation = trpc.recovery.simulatePolicy.useMutation();

  const handleSimulate = () => {
    simulateMutation.mutate({
      amountCeiling: Number(ceiling) || 10000,
      confidenceFloor: (Number(floor) || 82) / 100,
      maxRetries: Number(retries) || 2,
      cooldownMinutes: 240,
    });
  };

  const simResult = simulateMutation.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs tracking-wider uppercase">
            <Sparkles size={16} /> Policy Sandbox & Simulator
          </div>
          <DialogTitle className="text-xl">Simulate Guardrail Changes</DialogTitle>
          <DialogDescription>
            Test new policy thresholds against historical failed payments to project
            auto-resolution and revenue impact before publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Amount Ceiling (₹)
              </label>
              <Input
                value={ceiling}
                onChange={e => setCeiling(e.target.value)}
                placeholder="10000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Confidence Floor (%)
              </label>
              <Input
                value={floor}
                onChange={e => setFloor(e.target.value)}
                placeholder="82"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Max Retries
              </label>
              <Input
                value={retries}
                onChange={e => setRetries(e.target.value)}
                placeholder="2"
              />
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            onClick={handleSimulate}
            disabled={simulateMutation.isPending}
          >
            {simulateMutation.isPending ? (
              <>
                <RefreshCw size={14} className="spin mr-2" /> Running Simulation…
              </>
            ) : (
              "Run Simulation"
            )}
          </Button>

          {simResult && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Simulation Projection Results
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <TrendingUp size={14} className="text-emerald-600" />
                    Auto-Resolution Rate
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {Math.round(simResult.projectedAutoResolutionRate * 100)}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {simResult.projectedAutoResolved} of {simResult.totalAnalyzed} cases auto-resolved
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <ShieldAlert size={14} className="text-amber-600" />
                    Gated for Review
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {simResult.projectedGated}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Requiring human approval
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                <span className="font-semibold">Projected Recovered Revenue:</span>
                <span className="text-base font-bold">
                  {formatMoney(simResult.projectedRecoveredRevenue)}
                </span>
              </div>

              {onApplyPolicy && (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold mt-2"
                  onClick={() => {
                    onApplyPolicy({
                      amountCeiling: Number(ceiling),
                      confidenceFloor: Number(floor) / 100,
                      maxRetries: Number(retries),
                    });
                    onOpenChange(false);
                  }}
                >
                  <CheckCircle2 size={15} className="mr-2" /> Apply These Guardrails to Policy
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
