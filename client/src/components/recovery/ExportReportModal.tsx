import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ExportReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportReportModal({ open, onOpenChange }: ExportReportModalProps) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [isExporting, setIsExporting] = useState(false);

  const exportQuery = trpc.recovery.exportReport.useQuery(
    { format },
    { enabled: false }
  );

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const res = await exportQuery.refetch();
      if (res.data?.data) {
        const mimeType = format === "csv" ? "text/csv;charset=utf-8;" : "application/json";
        const blob = new Blob([res.data.data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Report downloaded successfully", {
          description: `Saved as ${res.data.filename}`,
        });
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error("Failed to export report", {
        description: e.message || "An unexpected error occurred.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs tracking-wider uppercase">
            <Download size={16} /> Data Export
          </div>
          <DialogTitle className="text-xl">Export Recovery Reports</DialogTitle>
          <DialogDescription>
            Download full case data, audit trails, and performance metrics for
            accounting, audits, and compliance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Export Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`p-3 rounded-lg border text-left transition-all ${
                  format === "csv"
                    ? "border-blue-600 bg-blue-50/50 text-blue-950 font-semibold shadow-sm"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">CSV Spreadsheet</span>
                  {format === "csv" && <CheckCircle2 size={16} className="text-blue-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-normal">
                  Standard format for Excel, Google Sheets, and ERP tools.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormat("json")}
                className={`p-3 rounded-lg border text-left transition-all ${
                  format === "json"
                    ? "border-blue-600 bg-blue-50/50 text-blue-950 font-semibold shadow-sm"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">JSON Data</span>
                  {format === "json" && <CheckCircle2 size={16} className="text-blue-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-normal">
                  Structured programmatic format for data pipelines.
                </p>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-500" /> Export Includes:
            </div>
            <ul className="list-disc list-inside text-slate-500 pl-1 space-y-0.5">
              <li>Transaction & Merchant Telemetry</li>
              <li>Diagnosis Root Causes & Confidence Scores</li>
              <li>Gating Thresholds & Policy Actions</li>
              <li>Execution & Recovery Outcomes</li>
            </ul>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            onClick={handleDownload}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <RefreshCw size={14} className="spin mr-2" /> Generating Export…
              </>
            ) : (
              <>
                <Download size={15} className="mr-2" /> Download {format.toUpperCase()} Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
