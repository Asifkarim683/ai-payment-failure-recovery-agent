import { Sparkles, TrendingUp, ShieldCheck, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AIPolicyAdvisorProps {
  onApplyRecommendation?: (changes: any) => void;
}

export function AIPolicyAdvisor({ onApplyRecommendation }: AIPolicyAdvisorProps) {
  const advisorQuery = trpc.ai.policyAdvisor.useQuery(undefined, {
    staleTime: 60000,
  });

  const handleApply = (rec: any) => {
    if (onApplyRecommendation) {
      onApplyRecommendation(rec.suggestedChange);
    }
    toast.success("Policy Recommendation Applied", {
      description: `Updated guardrail settings: ${JSON.stringify(rec.suggestedChange)}`,
    });
  };

  const healthScore = advisorQuery.data?.currentHealthScore ?? 88;
  const recommendations = advisorQuery.data?.recommendations ?? [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              AI Policy Health & Optimization
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.5 rounded">
                Gemini 2.5
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Autonomous suggestions derived from historical approval patterns & triage latency
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-extrabold text-blue-400">{healthScore}/100</div>
          <div className="text-[10px] uppercase font-semibold text-slate-500">Governance Score</div>
        </div>
      </div>

      {advisorQuery.isLoading ? (
        <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
          <RefreshCw size={14} className="spin text-blue-400" />
          <span>Evaluating recent transactions with Gemini…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="font-semibold text-xs text-slate-200 mb-1 flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-emerald-400" />
                  {rec.title}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">
                  {rec.description}
                </p>
                <div className="text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2 py-1 rounded-md mb-3 inline-block">
                  ⚡ Impact: {rec.impact}
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => handleApply(rec)}
                className="w-full bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-semibold h-8 transition-colors"
              >
                Apply Guardrail Optimization <ArrowRight size={12} className="ml-1.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
