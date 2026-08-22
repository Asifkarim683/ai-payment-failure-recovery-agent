import { useState } from "react";
import {
  Bot,
  Send,
  Sparkles,
  User,
  X,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AICopilotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  role: "user" | "model";
  text: string;
}

export function AICopilotDrawer({ open, onOpenChange }: AICopilotDrawerProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Hello! I am your **Recoverly AI Finance Copilot**. I have real-time visibility into your payment telemetry, approval queue, and recovery policies. How can I help optimize your revenue operations today?",
    },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Why was case #evt_8F2B gated?",
    "Summarize today's recovery performance",
    "What policy tweaks would increase recovered revenue?",
  ]);

  const copilotMutation = trpc.ai.copilotChat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "model", text: data.reply }]);
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }
    },
    onError: (err) => {
      setMessages(prev => [
        ...prev,
        {
          role: "model",
          text: `⚠️ **Error calling AI Copilot**: ${err.message || "Please check your network connection."}`,
        },
      ]);
    },
  });

  const handleSend = (textToSend?: string) => {
    const messageToSend = textToSend || input;
    if (!messageToSend.trim()) return;

    const newMessages: Message[] = [...messages, { role: "user", text: messageToSend }];
    setMessages(newMessages);
    setInput("");

    copilotMutation.mutate({
      message: messageToSend,
      history: newMessages.slice(1, -1).map(m => ({ role: m.role, text: m.text })),
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="font-semibold text-sm flex items-center gap-1.5">
              Recoverly Copilot
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.5 rounded uppercase">
                Gemini 2.5
              </span>
            </div>
            <div className="text-xs text-slate-400">Autonomous Revenue Intelligence</div>
          </div>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          return (
            <div
              key={idx}
              className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} />
                </div>
              )}
              <div
                className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                  isUser
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none"
                }`}
              >
                <div
                  className="prose prose-invert prose-sm max-w-none text-xs"
                  dangerouslySetInnerHTML={{
                    __html: m.text
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*(.*?)\*/g, "<em>$1</em>")
                      .replace(/`([^`]+)`/g, "<code class='bg-slate-900 px-1 py-0.5 rounded text-blue-300'>$1</code>")
                      .replace(/\n/g, "<br/>"),
                  }}
                />
              </div>
              {isUser && (
                <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={13} />
                </div>
              )}
            </div>
          );
        })}

        {copilotMutation.isPending && (
          <div className="flex gap-2.5 items-center text-xs text-slate-400 p-2">
            <RefreshCw size={14} className="spin text-blue-400" />
            <span>Analyzing telemetry and generating insights…</span>
          </div>
        )}
      </div>

      {/* Suggested chips */}
      <div className="p-3 border-t border-slate-800/60 bg-slate-950/40">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2">
          <Lightbulb size={12} className="text-amber-400" /> Suggested queries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s)}
              disabled={copilotMutation.isPending}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 transition-colors text-left"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2"
      >
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask Copilot about any case or policy..."
          disabled={copilotMutation.isPending}
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-xs"
        />
        <Button
          type="submit"
          size="sm"
          disabled={copilotMutation.isPending || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 px-3"
        >
          <Send size={14} />
        </Button>
      </form>
    </div>
  );
}
