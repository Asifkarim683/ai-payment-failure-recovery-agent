import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Zap,
  ShieldCheck,
  Clock3,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatMoney } from "./recoveryUtils";
import { ExportReportModal } from "./ExportReportModal";

interface ReportsTabProps {
  totalRecovered: number;
}

export function ReportsTab({ totalRecovered }: ReportsTabProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const reportQuery = trpc.recovery.report.useQuery();

  const reportData = reportQuery.data;

  const performanceActions = reportData?.actionPerformance ?? [
    { action: "delayed_retry" as const, recovered: 24800, recoveryRate: 0.82 },
    { action: "fresh_checkout_link" as const, recovered: 16450, recoveryRate: 0.64 },
    { action: "update_payment_method" as const, recovered: 11200, recoveryRate: 0.58 },
    { action: "cart_recovery_nudge" as const, recovered: 6400, recoveryRate: 0.41 },
  ];

  return (
    <>
      {reportQuery.isLoading && (
        <div className="loading-strip">
          <RefreshCw size={14} className="spin" /> Refreshing report metrics…
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="eyebrow">PERFORMANCE INTELLIGENCE</div>
          <h1>Reports & Analytics</h1>
          <p>
            Measure what the agent recovered, how it acted, and where humans stepped
            in.
          </p>
        </div>
        <Button
          variant="outline"
          className="export-button"
          onClick={() => setExportOpen(true)}
        >
          <ArrowDownRight size={15} /> Export report
        </Button>
      </div>

      {/* Highlights Grid */}
      <div className="report-grid">
        <div className="report-highlight">
          <div className="eyebrow">NET RECOVERED · CURRENT CYCLE</div>
          <strong>{formatMoney(totalRecovered + 10350)}</strong>
          <span>
            <ArrowUpRight size={14} /> 18.4% vs. previous period
          </span>
          <div className="sparkline">
            <div className="mini-chart">
              <div className="chart-area">
                <svg viewBox="0 0 620 170" preserveAspectRatio="none">
                  <path
                    d="M0 144 C38 138 55 115 86 124 S140 148 170 108 S220 98 255 110 S300 72 334 89 S375 109 405 65 S457 72 483 47 S529 52 560 28 S600 40 620 16 V170 H0 Z"
                    fill="#5b8def33"
                  />
                  <path
                    d="M0 144 C38 138 55 115 86 124 S140 148 170 108 S220 98 255 110 S300 72 334 89 S375 109 405 65 S457 72 483 47 S529 52 560 28 S600 40 620 16"
                    fill="none"
                    stroke="#5b8def"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="metric-card green">
          <div className="metric-icon">
            <TrendingUp size={17} />
          </div>
          <div className="metric-label">Recovery rate</div>
          <div className="metric-value">
            {reportData ? `${Math.round(reportData.recoveryRate * 100)}%` : "68.2%"}
          </div>
          <div className="metric-footer">
            <span className="metric-delta">
              <ArrowUpRight size={13} /> +6.8 pts
            </span>
            <span>target 62%</span>
          </div>
        </div>

        <div className="metric-card violet">
          <div className="metric-icon">
            <Zap size={17} />
          </div>
          <div className="metric-label">Cost per recovery</div>
          <div className="metric-value">₹14.20</div>
          <div className="metric-footer">
            <span className="metric-delta text-emerald-600">−8.6%</span>
            <span>vs. ₹15.53 prior</span>
          </div>
        </div>
      </div>

      {/* Breakdown Columns */}
      <div className="report-columns">
        {/* Action Performance */}
        <div className="panel report-panel">
          <div className="panel-head">
            <div>
              <h2>Action performance</h2>
              <p>Net revenue recovered by autonomous action strategy.</p>
            </div>
          </div>

          <div className="space-y-4 mt-2">
            {performanceActions.map((item, idx) => {
              const labels: Record<string, string> = {
                delayed_retry: "Delayed retry",
                fresh_checkout_link: "Fresh checkout link",
                update_payment_method: "Update payment method",
                cart_recovery_nudge: "Cart recovery nudge",
              };
              const tones = ["blue", "violet", "green", "amber"];
              const tone = tones[idx % tones.length];
              const pct = Math.round((item.recoveryRate || 0.6) * 100);

              return (
                <div className="performance-row" key={item.action}>
                  <div>
                    <strong>{labels[item.action] || item.action}</strong>
                    <span>{formatMoney(item.recovered)} recovered</span>
                  </div>
                  <div className="performance-bar">
                    <i className={tone} style={{ width: `${pct}%` }} />
                  </div>
                  <b>{pct}%</b>
                </div>
              );
            })}
          </div>
        </div>

        {/* Approval Activity */}
        <div className="panel report-panel">
          <div className="panel-head">
            <div>
              <h2>Governance & SLA activity</h2>
              <p>Human-in-the-loop turnaround and oversight metrics.</p>
            </div>
          </div>

          <div className="approval-stat">
            <ShieldCheck size={18} />
            <div>
              <strong>18</strong>
              <span>actions reviewed</span>
            </div>
            <small>94% within SLA</small>
          </div>

          <div className="approval-stat">
            <Clock3 size={18} />
            <div>
              <strong>6m 42s</strong>
              <span>median turnaround</span>
            </div>
            <small>−2m 18s faster</small>
          </div>

          <div className="approval-stat">
            <AlertTriangle size={18} />
            <div>
              <strong>3</strong>
              <span>rejected actions</span>
            </div>
            <small>4.8% of total</small>
          </div>
        </div>
      </div>

      <ExportReportModal open={exportOpen} onOpenChange={setExportOpen} />
    </>
  );
}
