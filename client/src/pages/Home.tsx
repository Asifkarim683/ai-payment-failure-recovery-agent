import { useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart3,
  Bell,
  ChevronRight,
  CreditCard,
  History,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import type { RecoveryCase } from "@shared/types";
import { OverviewTab } from "@/components/recovery/OverviewTab";
import { CasesTab } from "@/components/recovery/CasesTab";
import { ApprovalsTab } from "@/components/recovery/ApprovalsTab";
import { PolicyStudioTab } from "@/components/recovery/PolicyStudioTab";
import { ReplayLabTab } from "@/components/recovery/ReplayLabTab";
import { ReportsTab } from "@/components/recovery/ReportsTab";
import { DecisionTraceDrawer } from "@/components/recovery/DecisionTraceDrawer";
import { SimulatePaymentModal } from "@/components/recovery/SimulatePaymentModal";
import { AICopilotDrawer } from "@/components/recovery/AICopilotDrawer";
import { getInitials } from "@/components/recovery/recoveryUtils";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, logout, loading, isAuthenticated } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const utils = trpc.useUtils();

  // Queries & Mutations (enabled only when authenticated)
  const overviewQuery = trpc.recovery.overview.useQuery(undefined, {
    enabled: !!user && isAuthenticated,
    refetchInterval: 5000,
  });

  const decideApproval = trpc.recovery.decideApproval.useMutation({
    onSuccess: (_, variables) => {
      overviewQuery.refetch();
      if (variables.decision === "approved") {
        toast.success("Recovery action approved", {
          description: "Action released and dispatched to execution channels.",
        });
      } else {
        toast("Recovery action rejected", {
          description: "Case remains logged in audit trail with no execution.",
        });
      }
    },
    onError: () => {
      toast.error("Approval update failed", {
        description: "The case status was not changed. Please retry.",
      });
    },
  });

  const startRunMutation = trpc.recovery.startRun.useMutation({
    onSuccess: () => {
      overviewQuery.refetch();
    },
  });

  const cases = overviewQuery.data?.cases ?? [];
  const run = overviewQuery.data?.run;

  const pendingApprovalsCount = cases.filter(
    c => c.actionResult === "needs_approval"
  ).length;

  const totalRecovered =
    run?.totalRecovered ??
    cases
      .filter(c => c.actionResult === "recovered")
      .reduce((sum, c) => sum + (c.amountRecovered || c.amount), 0);

  const handleSelectCase = (c: RecoveryCase) => {
    setSelectedCase(c);
    setDrawerOpen(true);
  };

  const handleApprove = (id: string) => {
    decideApproval.mutate({ id, decision: "approved" });
  };

  const handleReject = (id: string) => {
    decideApproval.mutate({ id, decision: "rejected" });
  };

  const handleStartRun = () => {
    setRunning(true);
    startRunMutation.mutate();
    toast.success("Recovery batch run started", {
      description: "Evaluating telemetry and active guardrails across all payment flows.",
    });
    setTimeout(() => setRunning(false), 2600);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out of workspace");
      setLocation("/login");
    } catch {
      setLocation("/login");
    }
  };

  const displayName = user?.name || "Eren Rocha";
  const displayEmail = user?.email || "eren@recoverly.io";
  const displayRole = user?.role === "admin" ? "Finance admin" : "Operations analyst";
  const initials = getInitials(displayName);

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "cases", label: "Recovery cases", icon: CreditCard, count: cases.length || undefined },
    { id: "approvals", label: "Approval queue", icon: ShieldCheck, count: pendingApprovalsCount || undefined },
    { id: "policies", label: "Policy studio", icon: SlidersHorizontal },
    { id: "replay", label: "Replay lab", icon: History },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];

  return (
    <div className="app-shell">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Navigation Sidebar (Fixed & Clean) */}
      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="brand-name">
              recover<span>ly</span>
            </div>
            <div className="brand-caption">AUTONOMOUS RECOVERY</div>
          </div>
        </div>

        <div className="workspace">
          <div className="workspace-avatar">AC</div>
          <div className="min-w-0 flex-1">
            <div className="workspace-name truncate">Acme Commerce</div>
            <div className="workspace-sub truncate">Production workspace</div>
          </div>
          <ChevronRight size={14} className="muted" />
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="nav-count">{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div
            className="mobile-brand"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            role="button"
            tabIndex={0}
          >
            <Menu size={20} />
            <span>recoverly</span>
          </div>

          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{navItems.find(n => n.id === activeTab)?.label}</strong>
          </div>

          <div className="topbar-actions">
            {/* Integrations Quick Action */}
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-medium cursor-pointer transition-colors border border-slate-200"
              onClick={() =>
                toast.info("Active Integrations", {
                  description: "Stripe & Razorpay webhook listeners active.",
                })
              }
            >
              <Zap size={14} className="text-amber-500" />
              <span className="hidden sm:inline">Integrations</span>
              <span className="live-dot ml-0.5" />
            </button>

            {/* Help Center Quick Action */}
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-medium cursor-pointer transition-colors border border-slate-200"
              onClick={() =>
                toast.info("Help Center", {
                  description: "Recovery playbooks and policy guidance available.",
                })
              }
            >
              <LifeBuoy size={14} className="text-blue-500" />
              <span className="hidden sm:inline">Help</span>
            </button>

            {/* Live System Status */}
            <div className="system-status hidden lg:flex">
              <span className="live-dot" />
              Agent online <span className="status-divider" />{" "}
              <span className="small-muted">Synced just now</span>
            </div>

            {/* AI Copilot Trigger */}
            <button
              onClick={() => setCopilotOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 hover:text-blue-600 border border-blue-500/30 text-xs font-semibold cursor-pointer transition-all shadow-xs"
            >
              <Sparkles size={14} className="text-blue-500" />
              <span>AI Copilot</span>
            </button>

            {/* Notification Bell */}
            <button
              className="icon-button"
              onClick={() =>
                toast.info("System Status", {
                  description: "Recovery agent active. 0 errors detected.",
                })
              }
            >
              <Bell size={17} />
              {pendingApprovalsCount > 0 && <span className="notification-dot" />}
            </button>

            {/* Topbar User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-slate-100 text-left cursor-pointer transition-colors border border-slate-200 bg-slate-50/60">
                  <div className="avatar-button">{initials}</div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[90px]">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-slate-500 leading-tight capitalize truncate max-w-[90px]">
                      {displayRole}
                    </span>
                  </div>
                  <ChevronRight size={13} className="text-slate-400 rotate-90 hidden md:inline" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 text-slate-900 shadow-xl">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{displayEmail}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                        {displayRole}
                      </span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200/60 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Session
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut size={14} className="mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="page-wrap">
          {activeTab === "overview" && (
            <OverviewTab
              userName={user?.name}
              running={running}
              onStartRun={handleStartRun}
              onOpenSimulateModal={() => setSimulateOpen(true)}
              totalRecovered={totalRecovered}
              cases={cases}
              pipeline={run?.pipeline}
              onSelectCase={handleSelectCase}
              onViewAllCases={() => setActiveTab("cases")}
              loading={overviewQuery.isLoading}
            />
          )}

          {activeTab === "cases" && (
            <CasesTab
              cases={cases}
              onSelectCase={handleSelectCase}
              onOpenSimulateModal={() => setSimulateOpen(true)}
            />
          )}

          {activeTab === "approvals" && (
            <ApprovalsTab
              cases={cases}
              onApprove={handleApprove}
              onReject={handleReject}
              onSelectCase={handleSelectCase}
              isProcessing={decideApproval.isPending}
            />
          )}

          {activeTab === "policies" && <PolicyStudioTab />}

          {activeTab === "replay" && (
            <ReplayLabTab cases={cases} onSelectCase={handleSelectCase} />
          )}

          {activeTab === "reports" && <ReportsTab totalRecovered={totalRecovered} />}
        </div>
      </main>

      {/* Floating AI Copilot Launcher */}
      <button
        onClick={() => setCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/30 cursor-pointer transition-all hover:scale-105 border border-blue-400/40"
      >
        <Sparkles size={15} />
        <span>Ask Recoverly Copilot</span>
      </button>

      {/* AI Copilot Drawer */}
      <AICopilotDrawer
        open={copilotOpen}
        onOpenChange={setCopilotOpen}
      />

      {/* Decision Trace Drawer */}
      <DecisionTraceDrawer
        selectedCase={selectedCase}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={decideApproval.isPending}
      />

      {/* Synthetic Payment Ingestion Modal */}
      <SimulatePaymentModal
        open={simulateOpen}
        onOpenChange={setSimulateOpen}
        onSuccess={() => overviewQuery.refetch()}
      />
    </div>
  );
}
