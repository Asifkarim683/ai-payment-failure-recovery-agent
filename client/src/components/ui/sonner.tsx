import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      richColors
      closeButton
      className="toaster group"
      toastOptions={{
        className:
          "bg-slate-900 text-white border border-slate-700/80 shadow-2xl rounded-xl p-4 text-sm font-medium",
        style: {
          background: "#0f172a",
          color: "#f8fafc",
          border: "1px solid #334155",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
