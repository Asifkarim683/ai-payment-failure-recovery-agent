import { useState, useEffect } from "react";
import { ShieldCheck, LockKeyhole, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { PolicySimulatorModal } from "./PolicySimulatorModal";
import { AIPolicyAdvisor } from "./AIPolicyAdvisor";

export function PolicyStudioTab() {
  const [retry, setRetry] = useState("2");
  const [ceiling, setCeiling] = useState("10000");
  const [floor, setFloor] = useState(82);
  const [cooldown, setCooldown] = useState("4 hours");
  const [saved, setPolicySaved] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const policyQuery = trpc.recovery.policy.useQuery();
  const updatePolicy = trpc.recovery.updatePolicy.useMutation({
    onSuccess: () => {
      setPolicySaved(true);
      toast.success("Policy guardrails published", {
        description: "New governance thresholds are now active across all recovery pipelines.",
      });
    },
    onError: () => {
      toast.error("Failed to update policy", {
        description: "Please check your network connection and try again.",
      });
    },
  });

  useEffect(() => {
    const activePolicy: any = policyQuery.data?.[0];
    if (activePolicy) {
      setRetry(String(activePolicy.maxRetries));
      setCeiling(String(activePolicy.amountCeiling));
      setFloor(Math.round(activePolicy.confidenceFloor * 100));
    }
  }, [policyQuery.data]);

  const handlePublish = () => {
    updatePolicy.mutate({
      maxRetries: Number(retry) || 2,
      amountCeiling: Number(ceiling) || 10000,
      confidenceFloor: floor / 100,
      cooldownMinutes: cooldown === "8 hours" ? 480 : cooldown === "24 hours" ? 1440 : 240,
    });
  };

  const handleApplyFromSimulator = (params: {
    maxRetries: number;
    amountCeiling: number;
    confidenceFloor: number;
  }) => {
    setRetry(String(params.maxRetries));
    setCeiling(String(params.amountCeiling));
    setFloor(Math.round(params.confidenceFloor * 100));
    toast.info("Applied simulator values", {
      description: "Remember to click 'Publish changes' to commit to the live workspace.",
    });
  };

  const handleApplyAdvisor = (changes: any) => {
    if (changes.amountCeiling) setCeiling(String(changes.amountCeiling));
    if (changes.confidenceFloor) setFloor(Math.round(changes.confidenceFloor * 100));
    if (changes.maxRetries) setRetry(String(changes.maxRetries));
    setPolicySaved(false);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">GOVERNANCE & BOUNDARIES</div>
          <h1>Policy studio</h1>
          <p>Shape the operational boundaries your recovery agent must operate within.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs h-9 font-semibold"
            onClick={() => setSimulatorOpen(true)}
          >
            <Sparkles size={15} /> Policy Sandbox
          </Button>
          <Button
            className="primary-action"
            onClick={handlePublish}
            disabled={updatePolicy.isPending}
          >
            <ShieldCheck size={15} />
            {updatePolicy.isPending
              ? "Publishing…"
              : saved
              ? "Published"
              : "Publish changes"}
          </Button>
        </div>
      </div>

      {/* AI Policy Optimization Advisor Banner */}
      <div className="mb-4">
        <AIPolicyAdvisor onApplyRecommendation={handleApplyAdvisor} />
      </div>

      <div className="policy-layout">
        {/* Main Guardrails */}
        <div className="panel policy-main">
          <div className="panel-head">
            <div>
              <h2>Recovery guardrails</h2>
              <p>
                {policyQuery.isLoading
                  ? "Loading active policy…"
                  : "Changes are versioned and apply across future automated recovery runs."}
              </p>
            </div>
            <Badge variant="outline">v2.1 · Active</Badge>
          </div>

          <div className="form-section">
            <div className="form-row">
              <div>
                <strong>Maximum automated retries</strong>
                <p>Cease automated attempts after reaching this limit.</p>
              </div>
              <Input
                className="compact-input"
                value={retry}
                onChange={e => {
                  setRetry(e.target.value);
                  setPolicySaved(false);
                }}
              />
            </div>

            <div className="form-row">
              <div>
                <strong>Approval amount ceiling</strong>
                <p>Transactions above this value require human approval before action.</p>
              </div>
              <div className="input-prefix">
                <span>₹</span>
                <Input
                  className="compact-input"
                  value={ceiling}
                  onChange={e => {
                    setCeiling(e.target.value);
                    setPolicySaved(false);
                  }}
                />
              </div>
            </div>

            <div className="form-row">
              <div>
                <strong>Minimum diagnosis confidence</strong>
                <p>Below this threshold, route directly to human-in-the-loop triage.</p>
              </div>
              <div className="range-value">{floor}%</div>
            </div>
            <input
              type="range"
              className="policy-range"
              min="50"
              max="99"
              value={floor}
              onChange={e => {
                setFloor(Number(e.target.value));
                setPolicySaved(false);
              }}
            />

            <div className="form-row">
              <div>
                <strong>Cooldown between retries</strong>
                <p>Prevent customer fatigue by enforcing an interval between recovery attempts.</p>
              </div>
              <select
                className="select-input"
                value={cooldown}
                onChange={e => {
                  setCooldown(e.target.value);
                  setPolicySaved(false);
                }}
              >
                <option value="4 hours">4 hours</option>
                <option value="8 hours">8 hours</option>
                <option value="24 hours">24 hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* Permitted Channels */}
        <div className="panel policy-side">
          <div className="panel-head">
            <div>
              <h2>Permitted channels</h2>
              <p>Approved communication channels for payment recovery.</p>
            </div>
          </div>

          {[
            "Fresh checkout link",
            "Email reminder",
            "SMS nudge",
            "Alternate payment prompt",
          ].map((x, i) => (
            <label className="toggle-row" key={x}>
              <span>{x}</span>
              <input type="checkbox" defaultChecked={i !== 2} />
              <span className="toggle-ui" />
            </label>
          ))}

          <div className="policy-note">
            <LockKeyhole size={15} />
            <span>
              All recovery decisions are cryptographically logged with a mandatory
              reason string.
            </span>
          </div>
        </div>
      </div>

      <PolicySimulatorModal
        open={simulatorOpen}
        onOpenChange={setSimulatorOpen}
        initialCeiling={Number(ceiling) || 10000}
        initialFloor={floor / 100}
        initialRetries={Number(retry) || 2}
        onApplyPolicy={handleApplyFromSimulator}
      />
    </>
  );
}
