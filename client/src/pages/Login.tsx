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
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Shield,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "user">("admin");
  const [showPassword, setShowPassword] = useState(false);

  const utils = trpc.useUtils();

  if (!authLoading && isAuthenticated && user) {
    setLocation("/");
    return null;
  }

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
        description: err.message || "Please check your email and password.",
      });
    },
  });

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: (data) => {
      utils.auth.me.setData(undefined, data.user as any);
      toast.success("Account created successfully!", {
        description: `Welcome ${data.user?.name}. Your ${data.user?.role === "admin" ? "Finance Admin" : "Operations Analyst"} workspace is ready.`,
      });
      setLocation("/");
    },
    onError: (err: any) => {
      toast.error("Registration failed", {
        description: err.message || "Unable to create account. Please try again.",
      });
    },
  });

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      toast.error("Please fill in your name, email, and password.");
      return;
    }
    signupMutation.mutate({ email, password, name, role });
  };

  const isPending = loginMutation.isPending || signupMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10 text-white">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-white">
              recover<span className="text-blue-400">ly</span>
            </div>
            <div className="text-[10px] tracking-widest uppercase text-slate-400 font-semibold">
              Autonomous Revenue Operations
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/80 mb-6">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "signin"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus size={14} />
            <span>Create Account</span>
          </button>
        </div>

        {/* Title */}
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            {mode === "signin" ? "Sign In to Workspace" : "Register Workspace User"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {mode === "signin"
              ? "Access autonomous payment recovery workflows and policy governance."
              : "Set up your credentials and assign Role-Based Access Control (RBAC)."}
          </p>
        </div>

        {/* SIGN IN FORM */}
        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Work Email <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-3 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="pl-9 bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500 h-10 rounded-xl text-sm focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-3 text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-9 pr-10 bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500 h-10 rounded-xl text-sm focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold h-11 rounded-xl shadow-lg shadow-blue-600/20 text-sm cursor-pointer mt-2"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <RefreshCw size={15} className="spin mr-2" /> Authenticating…
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In <ArrowRight size={15} />
                </span>
              )}
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Don't have an account? <span className="text-blue-400 underline font-medium">Create one</span>
              </button>
            </div>
          </form>
        ) : (
          /* SIGN UP FORM (WITH RBAC) */
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Full Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-3 text-slate-500" />
                <Input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  required
                  className="pl-9 bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500 h-10 rounded-xl text-sm focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Work Email <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-3 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="pl-9 bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500 h-10 rounded-xl text-sm focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-3 text-slate-500" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={3}
                  className="pl-9 pr-10 bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500 h-10 rounded-xl text-sm focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* RBAC Role Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield size={13} className="text-blue-400" />
                <span>Assign RBAC Role</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === "admin"
                      ? "border-blue-500 bg-blue-950/40 text-white ring-1 ring-blue-500/50"
                      : "border-slate-800 bg-slate-800/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-400 mb-1">
                    <ShieldCheck size={14} />
                    <span>Finance Admin</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Full policy rules, limits, approvals & copilot.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("user")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    role === "user"
                      ? "border-purple-500 bg-purple-950/40 text-white ring-1 ring-purple-500/50"
                      : "border-slate-800 bg-slate-800/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-purple-400 mb-1">
                    <Briefcase size={14} />
                    <span>Ops Analyst</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Case triage, queue approvals & recovery reports.
                  </p>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold h-11 rounded-xl shadow-lg shadow-blue-600/20 text-sm cursor-pointer mt-2"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <RefreshCw size={15} className="spin mr-2" /> Creating Account…
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create Account & Sign In <ArrowRight size={15} />
                </span>
              )}
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Already have an account? <span className="text-blue-400 underline font-medium">Sign in</span>
              </button>
            </div>
          </form>
        )}

        {/* Security badge */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Enterprise 256-bit Encrypted Session Guard (AAA & RBAC)</span>
        </div>
      </div>
    </div>
  );
}
