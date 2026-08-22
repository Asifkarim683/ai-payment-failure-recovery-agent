import { useState, useMemo } from "react";
import { Search, ChevronRight, Filter, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { RecoveryCase } from "@shared/types";
import {
  formatAction,
  formatCause,
  formatConfidence,
  formatMoney,
  getInitials,
  getStatusStyle,
} from "./recoveryUtils";

interface CasesTabProps {
  cases: RecoveryCase[];
  onSelectCase: (c: RecoveryCase) => void;
  onOpenSimulateModal: () => void;
}

export function CasesTab({
  cases,
  onSelectCase,
  onOpenSimulateModal,
}: CasesTabProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchesQuery = `${c.merchantName} ${c.rootCause} ${c.id} ${c.declineCode}`
        .toLowerCase()
        .includes(query.toLowerCase());

      if (!matchesQuery) return false;

      if (statusFilter === "all") return true;
      if (statusFilter === "needs_approval") return c.actionResult === "needs_approval";
      if (statusFilter === "recovered") return c.actionResult === "recovered";
      if (statusFilter === "processing") return c.actionResult === "processing";
      if (statusFilter === "rejected") return c.actionResult === "rejected";
      return true;
    });
  }, [cases, query, statusFilter]);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">RECOVERY QUEUE</div>
          <h1>Recovery cases</h1>
          <p>Every at-risk payment, AI diagnosis, and outcome in one place.</p>
        </div>
        <Button className="primary-action" onClick={onOpenSimulateModal}>
          <PlusCircle size={15} /> Simulate Failure
        </Button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="flex items-center gap-3">
          <div className="search-wrap">
            <Search size={16} />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search cases, merchants, or decline codes..."
            />
          </div>

          <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
            {[
              { id: "all", label: "All Cases" },
              { id: "needs_approval", label: "Needs Approval" },
              { id: "recovered", label: "Recovered" },
              { id: "processing", label: "In Progress" },
              { id: "rejected", label: "Rejected" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-md transition-all font-medium ${
                  statusFilter === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-meta">
          {filteredCases.length} displayed · {cases.length} total events
        </div>
      </div>

      {/* Cases Table Panel */}
      <div className="panel cases-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>CASE</th>
                <th>AMOUNT AT RISK</th>
                <th>DIAGNOSIS</th>
                <th>RECOMMENDED ACTION</th>
                <th>GATING</th>
                <th>STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map(c => {
                const statusInfo = getStatusStyle(c.actionResult);
                return (
                  <tr key={c.id} onClick={() => onSelectCase(c)}>
                    <td>
                      <div className="case-cell">
                        <div className={`merchant-avatar ${c.actionGated ? "amber" : "blue"}`}>
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
                        <span className={`cause-dot ${c.actionGated ? "amber" : "blue"}`} />
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
                      {c.actionGated ? (
                        <span className="text-amber-600 font-medium text-xs">
                          Gated ({c.gateReason?.slice(0, 24) || "Threshold"}...)
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium text-xs">
                          Auto-eligible
                        </span>
                      )}
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

        {filteredCases.length === 0 && (
          <div className="empty-state">
            <Search size={28} />
            <strong>No recovery cases found</strong>
            <p>Try adjusting your search keywords or active status filter.</p>
          </div>
        )}
      </div>
    </>
  );
}
