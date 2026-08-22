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
  MoreHorizontal,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Users,
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
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const utils = trpc.useUtils();

  // Queries & Mutations
  const overviewQuery = trpc.recovery.overview.useQuery(undefined, {
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

  const quickLoginMutation = trpc.auth.quickLogin.useMutation({
    onSuccess: (data) => {
      utils.auth.me.setData(undefined, data.user as any);
      toast.success("Switched user persona", {
        description: `Active session: ${data.user?.name} (${data.user?.role?.toUpperCase()})`,
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
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={17} />
          </div>
          <div>
            <div className="brand-name">
              recover<span>ly</span>
            </div>
            <div className="brand-caption">REVENUE OPERATIONS</div>
          </div>
        </div>

        <div className="workspace">
          <div className="workspace-avatar">AC</div>
          <div>
            <div className="workspace-name">Acme Commerce</div>
            <div className="workspace-sub">Production workspace</div>
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
                onClick={() => setActiveTab(item.id)}
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

        <div className="sidebar-bottom">
          <div className="nav-label">SYSTEM</div>
          <button
            className="nav-item"
            onClick={() =>
              toast.info("Active Integrations", {
                description: "Stripe & Razorpay webhook listeners active.",
              })
            }
          >
            <Zap size={17} />
            <span>Integrations</span>
            <span className="live-dot" />
          </button>
          <button
            className="nav-item"
            onClick={() =>
              toast.info("Help Center", {
                description: "Recovery playbooks and policy guidance available.",
              })
            }
          >
            <LifeBuoy size={17} />
            <span>Help center</span>
          </button>

          {/* User Profile Footer */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="profile w-full hover:bg-slate-800/60 transition-colors rounded-lg p-2 text-left cursor-pointer border-0">
                <div className="profile-avatar">{initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="profile-name truncate">{displayName}</div>
                  <div className="profile-role truncate">{displayRole}</div>
                </div>
                <MoreHorizontal size={16} className="muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-white">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-slate-400 truncate">{displayEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 tracking-wider">
                Switch Persona
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
                onClick={() => quickLoginMutation.mutate({ persona: "admin" })}
              >
                <UserCheck size={14} className="mr-2 text-blue-400" /> Eren (Finance Admin)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
                onClick={() => quickLoginMutation.mutate({ persona: "analyst" })}
              >
                <Users size={14} className="mr-2 text-purple-400" /> Maya (Ops Analyst)
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
                onClick={() => quickLoginMutation.mutate({ persona: "reviewer" })}
              >
                <ShieldCheck size={14} className="mr-2 text-emerald-400" /> Alex (Reviewer)
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                className="cursor-pointer text-red-400 hover:bg-red-950/40 focus:bg-red-950/40"
                onClick={handleLogout}
              >
                <LogOut size={14} className="mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">
            <Menu size={18} />
            <span>recoverly</span>
          </div>
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{navItems.find(n => n.id === activeTab)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <div className="system-status">
              <span className="live-dot" />
              Agent online <span className="status-divider" />{" "}
              <span className="small-muted">Synced just now</span>
            </div>
            <button
              onClick={() => setCopilotOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 hover:text-blue-600 border border-blue-500/30 text-xs font-semibold cursor-pointer transition-all shadow-sm shadow-blue-500/10"
            >
              <Sparkles size={14} className="text-blue-500" />
              <span>AI Copilot</span>
            </button>

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

            {/* Topbar User Avatar Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="avatar-button cursor-pointer hover:opacity-90 transition-opacity">
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                    <span className="text-[10px] font-bold text-blue-600 uppercase mt-0.5">
                      {displayRole}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setLocation("/login")}
                >
                  <Users size={14} className="mr-2 text-slate-600" /> Switch / Sign In Page
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600"
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
