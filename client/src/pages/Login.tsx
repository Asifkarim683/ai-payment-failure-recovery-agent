import { useState } from "react";
import { useLocation } from "wouter";
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "user">("admin");
  const [isCustomMode, setIsCustomMode] = useState(false);

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      utils.auth.me.setData(undefined, data.user as any);
      toast.success("Welcome back!", {
        description: `Signed in as ${data.user?.name} (${data.user?.role === "admin" ? "Finance Admin" : "Operations Analyst"})`,
      });
      setLocation("/");
    },
    onError: (err: any) => {
      toast.error("Authentication failed", {
        description: err.message || "Please check your credentials.",
      });
    },
  });

  const quickLoginMutation = trpc.auth.quickLogin.useMutation({
    onSuccess: (data) => {
      utils.auth.me.setData(undefined, data.user as any);
      toast.success("Signed in successfully", {
        description: `Active session: ${data.user?.name} (${data.user?.role?.toUpperCase()})`,
      });
      setLocation("/");
    },
    onError: (err: any) => {
      toast.error("Quick sign-in failed", {
        description: err.message || "Please try again.",
      });
    },
  });

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    loginMutation.mutate({
      email,
      password,
      name: name || undefined,
      role,
    });
  };

  const handleQuickPersona = (persona: "admin" | "analyst" | "reviewer") => {
    quickLoginMutation.mutate({ persona });
  };

  const isPending = loginMutation.isPending || quickLoginMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10 text-white">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-white">
              recover<span className="text-blue-400">ly</span>
            </div>
            <div className="text-[10px] tracking-widest uppercase text-slate-400 font-semibold">
              Revenue Operations
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Sign in to Workspace
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Access autonomous payment recovery workflows and policy governance.
          </p>
        </div>

        {/* 1-Click Fast Persona Switcher */}
        {!isCustomMode ? (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select a Team Persona
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleQuickPersona("admin")}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 hover:border-blue-500 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold flex items-center justify-center text-xs">
                    ER
                  </div>
                  <div>
                    <strong className="block text-sm font-semibold text-slate-100 group-hover:text-blue-300">
                      Eren Rocha
                    </strong>
                    <span className="text-xs text-slate-400">
                      Finance Admin · Full Policy & Approval Access
                    </span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickPersona("analyst")}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 hover:border-blue-500 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold flex items-center justify-center text-xs">
                    MP
                  </div>
                  <div>
                    <strong className="block text-sm font-semibold text-slate-100 group-hover:text-purple-300">
                      Maya Patel
                    </strong>
                    <span className="text-xs text-slate-400">
                      Recovery Ops Analyst · Triage & Review
                    </span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-500 group-hover:text-purple-400 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickPersona("reviewer")}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 hover:border-blue-500 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center text-xs">
                    AT
                  </div>
                  <div>
                    <strong className="block text-sm font-semibold text-slate-100 group-hover:text-emerald-300">
                      Alex Thorne
                    </strong>
                    <span className="text-xs text-slate-400">
                      Finance Reviewer · Approvals & Reporting
                    </span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium underline underline-offset-4"
              >
                Or sign in with custom credentials
              </button>
            </div>
          </div>
        ) : (
          /* Custom Credentials Form */
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-3 text-slate-500" />
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-3 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Password / Passcode</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-3 text-slate-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Workspace Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as "admin" | "user")}
                className="w-full h-10 px-3 bg-slate-800 border border-slate-700 rounded-md text-sm text-white"
              >
                <option value="admin">Finance Admin (Full Permissions)</option>
                <option value="user">Operations Analyst (Triage & Approvals)</option>
              </select>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <RefreshCw size={14} className="spin mr-2" /> Authenticating…
                </>
              ) : (
                "Sign In to Workspace"
              )}
            </Button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className="text-xs text-slate-400 hover:text-slate-300"
              >
                ← Back to Persona Selection
              </button>
            </div>
          </form>
        )}

        {/* Security badge */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck size={14} className="text-blue-400" />
          <span>Enterprise 256-bit Encrypted Session Guard</span>
        </div>
      </div>
    </div>
  );
}
