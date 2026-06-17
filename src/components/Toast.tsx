"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info", title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, title }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-5 ${
              t.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-100 shadow-emerald-950/20"
                : t.type === "error"
                ? "bg-rose-950/90 border-rose-500/30 text-rose-100 shadow-rose-950/20"
                : "bg-neutral-900/90 border-white/[0.08] text-neutral-100 shadow-black/40"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {t.type === "info" && <Info className="w-5 h-5 text-neutral-400" />}
            </div>
            <div className="flex-1 min-w-0">
              {t.title && <h4 className="font-semibold text-sm mb-0.5 leading-none">{t.title}</h4>}
              <p className="text-xs opacity-90 break-words mt-1">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-200 transition-colors p-0.5 rounded-lg hover:bg-white/5 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
