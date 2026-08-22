import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Download,
  FileClock,
  Filter,
  Gauge,
  Play,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PipelineCounters, RecoveryCase } from "@shared/types";
import {
  formatAction,
  formatCause,
  formatConfidence,
  formatMoney,
  getInitials,
  getStatusStyle,
} from "./recoveryUtils";

interface OverviewTabProps {
  userName?: string | null;
  running: boolean;
  onStartRun: () => void;
  onOpenSimulateModal: () => void;
  totalRecovered: number;
  cases: RecoveryCase[];
  pipeline?: PipelineCounters;
  onSelectCase: (c: RecoveryCase) => void;
  onViewAllCases: () => void;
  loading: boolean;
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Good morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  } else if (hour >= 17 && hour < 22) {
    return "Good evening";
  } else {
    return "Good evening";
  }
}

export function OverviewTab({
  userName,
  running,
  onStartRun,
  onOpenSimulateModal,
  totalRecovered,
  cases,
  pipeline,
  onSelectCase,
  onViewAllCases,
  loading,
}: OverviewTabProps) {
  const pendingApprovals = cases.filter(c => c.actionResult === "needs_approval");
  const recoveredCases = cases.filter(c => c.actionResult === "recovered");
  const totalAtRisk = cases.reduce((sum, c) => sum + c.amount, 0) || 74600;
  const recoveryRate =
    totalAtRisk > 0 ? ((totalRecovered / totalAtRisk) * 100).toFixed(1) : "68.2";

  const greeting = getTimeBasedGreeting();
  const firstName = userName ? userName.split(" ")[0] : "Eren";

  return (
    <>
      {loading && (
        <div className="loading-strip">
          <RefreshCw size={14} className="spin" /> Syncing live recovery signals…
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="eyebrow">REVENUE OPERATIONS DASHBOARD</div>
          <h1>{greeting}, {firstName}</h1>
          <p>Here’s the latest signal on revenue at risk across your payment flows.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <Button
            variant="outline"
            className="text-xs h-9 font-semibold flex-1 sm:flex-initial"
            onClick={onOpenSimulateModal}
          >
            <PlusCircle size={15} /> Simulate Payment Failure
          </Button>
          <Button
            onClick={onStartRun}
            className="primary-action flex-1 sm:flex-initial"
            disabled={running}
          >
            <Play size={15} fill="currentColor" />
            {running ? "Running recovery…" : "Run recovery agent"}
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="metric-grid">
        <div className="metric-card blue">
          <div className="metric-icon">
            <TrendingUp size={17} />
          </div>
          <div className="metric-label">Recovered revenue</div>
          <div className="metric-value">{formatMoney(totalRecovered)}</div>
          <div className="metric-footer">
            <span className="metric-delta">
              <ArrowUpRight size={13} /> +18.4%
            </span>
            <span>vs. previous period</span>
          </div>
        </div>

        <div className="metric-card green">
          <div className="metric-icon">
            <Gauge size={17} />
          </div>
          <div className="metric-label">Recovery rate</div>
          <div className="metric-value">{recoveryRate}%</div>
          <div className="metric-footer">
            <span className="metric-delta">
              <ArrowUpRight size={13} /> +6.8 pts
            </span>
            <span>of {formatMoney(totalAtRisk)} at risk</span>
          </div>
        </div>

        <div className="metric-card amber">
          <div className="metric-icon">
            <AlertTriangle size={17} />
          </div>
          <div className="metric-label">Needs attention</div>
          <div className="metric-value">{pendingApprovals.length}</div>
          <div className="metric-footer">
            <span className="metric-delta">
              {formatMoney(pendingApprovals.reduce((s, c) => s + c.amount, 0))}
            </span>
            <span>awaiting approval</span>
          </div>
        </div>

        <div className="metric-card violet">
          <div className="metric-icon">
            <Activity size={17} />
          </div>
          <div className="metric-label">Auto-resolution</div>
          <div className="metric-value">74%</div>
          <div className="metric-footer">
            <span className="metric-delta">
              <ArrowUpRight size={13} /> +11.2%
            </span>
            <span>of safe failure events</span>
          </div>
        </div>
      </div>

      {/* Overview Grid: Pipeline + Performance Chart */}
      <div className="overview-grid">
        {/* Pipeline Panel */}
        <div className="panel pipeline-panel">
          <div className="panel-head">
            <div>
              <h2>Live recovery pipeline</h2>
              <p>Active autonomous execution flow · {cases.length} total events</p>
            </div>
            <Badge className="live-badge">
              <span className="live-dot" /> Live
            </Badge>
          </div>

          <div className="pipeline">
            <div className="pipeline-node">
              <div className="node-icon">
                <ArrowDownRight size={17} />
              </div>
              <strong>{pipeline?.ingest ?? cases.length}</strong>
              <span>Ingest</span>
              <small>events</small>
            </div>
            <div className="pipeline-line active" />

            <div className="pipeline-node">
              <div className="node-icon">
                <Sparkles size={17} />
              </div>
              <strong>{pipeline?.diagnose ?? Math.max(cases.length - 2, 0)}</strong>
              <span>Diagnose</span>
              <small>classified</small>
            </div>
            <div className="pipeline-line active" />

            <div className="pipeline-node">
              <div className="node-icon">
                <ShieldCheck size={17} />
              </div>
              <strong>{pipeline?.policy ?? Math.max(cases.length - 4, 0)}</strong>
              <span>Policy</span>
              <small>matched</small>
            </div>
            <div className="pipeline-line active" />

            <div className="pipeline-node">
              <div className="node-icon">
                <Zap size={17} />
              </div>
              <strong>{recoveredCases.length || (pipeline?.execute ?? 29)}</strong>
              <span>Execute</span>
              <small>resolved</small>
            </div>
            <div className="pipeline-line" />

            <div className="pipeline-node">
              <div className="node-icon">
                <FileClock size={17} />
              </div>
              <strong>100%</strong>
              <span>Audit</span>
              <small>logged</small>
            </div>
          </div>

          <div className="pipeline-foot">
            <span>
              <i className="legend-dot blue" /> {recoveredCases.length} resolved
            </span>
            <span>
              <i className="legend-dot amber" /> {pendingApprovals.length} gated
            </span>
            <span>
              <i className="legend-dot gray" /> {cases.length - recoveredCases.length - pendingApprovals.length} in progress
            </span>
            <span className="pipeline-time">
              <RefreshCw size={13} /> Synchronized live
            </span>
          </div>
        </div>

        {/* Chart Panel */}
        <div className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h2>Recovery performance</h2>
              <p>Recovered revenue trend</p>
            </div>
            <button className="filter-button">
              <Filter size={14} /> 7 days
            </button>
          </div>
          <div className="chart-value">
            {formatMoney(totalRecovered)}
            <span>
              <ArrowUpRight size={13} /> 24.6%
            </span>
          </div>
          <div className="mini-chart">
            <div className="chart-y">
              <span>20k</span>
              <span>15k</span>
              <span>10k</span>
              <span>5k</span>
              <span>0</span>
            </div>
            <div className="chart-area">
              <svg viewBox="0 0 620 170" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#5b8def" stopOpacity=".22" />
                    <stop offset="1" stopColor="#5b8def" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 144 C38 138 55 115 86 124 S140 148 170 108 S220 98 255 110 S300 72 334 89 S375 109 405 65 S457 72 483 47 S529 52 560 28 S600 40 620 16 V170 H0 Z"
                  fill="url(#fill)"
                />
                <path
                  d="M0 144 C38 138 55 115 86 124 S140 148 170 108 S220 98 255 110 S300 72 334 89 S375 109 405 65 S457 72 483 47 S529 52 560 28 S600 40 620 16"
                  fill="none"
                  stroke="#5b8def"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <div className="chart-x">
                <span>Aug 16</span>
                <span>Aug 18</span>
                <span>Aug 20</span>
                <span>Aug 22</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Cases Section */}
      <div className="panel cases-panel">
        <div className="panel-head">
          <div>
            <h2>Recent recovery cases</h2>
            <p>Review the latest agent decisions, telemetry, and outcomes.</p>
          </div>
          <Button variant="ghost" className="view-all" onClick={onViewAllCases}>
            View all ({cases.length}) <ChevronRight size={15} />
          </Button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>CASE</th>
                <th>AMOUNT AT RISK</th>
                <th>DIAGNOSIS</th>
                <th>RECOMMENDED ACTION</th>
                <th>STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cases.slice(0, 5).map(c => {
                const statusInfo = getStatusStyle(c.actionResult);
                return (
                  <tr key={c.id} onClick={() => onSelectCase(c)}>
                    <td>
                      <div className="case-cell">
                        <div className="merchant-avatar">
                          {getInitials(c.merchantName)}
                        </div>
                        <div>
                          <strong>{c.merchantName}</strong>
                          <span>
                            {c.id} · {new Date(c.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{formatMoney(c.amount)}</strong>
                    </td>
                    <td>
                      <div className="diagnosis">
                        <span className="cause-dot blue" />
                        {formatCause(c.rootCause)}
                      </div>
                      <small>{formatConfidence(c.confidence)} confidence</small>
                    </td>
                    <td>
                      <span className="action-pill">
                        {formatAction(c.recommendedAction)}
                      </span>
                    </td>
                    <td>
                      <span className={statusInfo.className}>{statusInfo.label}</span>
                    </td>
                    <td>
                      <ChevronRight size={16} className="muted" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
