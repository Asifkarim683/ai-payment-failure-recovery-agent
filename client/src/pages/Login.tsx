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
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
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
        description: err.message || "Please check your credentials.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please provide both email and password.");
      return;
    }
    loginMutation.mutate({
      email,
      password,
      name: name || undefined,
      role,
    });
  };

  const handleFillSample = (sampleEmail: string, sampleRole: "admin" | "user", sampleName: string) => {
    setEmail(sampleEmail);
    setPassword("password123");
    setName(sampleName);
    setRole(sampleRole);
    toast.info("Sample credentials filled", {
      description: "Click 'Sign In to Workspace' to proceed.",
    });
  };

  const isPending = loginMutation.isPending;

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
              Autonomous Recovery
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Sign In to Workspace
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enter your credentials to access autonomous payment recovery and governance.
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Password <span className="text-red-400">*</span>
              </label>
            </div>
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

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-3 text-slate-500" />
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="pl-9 bg-slate-800/90 border-slate-700 text-white placeholder:text-slate-500 h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Workspace Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as "admin" | "user")}
                className="w-full h-10 px-3 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="admin">Finance Admin</option>
                <option value="user">Operations Analyst</option>
              </select>
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
                Sign In to Workspace <ArrowRight size={15} />
              </span>
            )}
          </Button>
        </form>

        {/* Demo Quick Fill Shortcuts */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
            <KeyRound size={12} className="text-blue-400" />
            <span>Quick Test Credentials</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleFillSample("eren@recoverly.io", "admin", "Eren Rocha")}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700/80 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Admin (Eren)</span>
            </button>
            <button
              type="button"
              onClick={() => handleFillSample("maya@recoverly.io", "user", "Maya Patel")}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700/80 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Analyst (Maya)</span>
            </button>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Enterprise 256-bit Encrypted Session Guard (AAA)</span>
        </div>
      </div>
    </div>
  );
}
