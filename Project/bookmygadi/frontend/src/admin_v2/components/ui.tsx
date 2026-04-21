import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const cn = (...inputs: Array<string | false | null | undefined>) => twMerge(clsx(inputs));

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
    {children}
  </motion.section>
);

export const Button = ({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...props} className={cn("h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60", className)}>
    {children}
  </button>
);

export const Chip = ({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) => {
  const map: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", map[tone])}>{text}</span>;
};

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title?: string; children: ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg overflow-hidden bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-lg text-slate-800">{title}</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
};
