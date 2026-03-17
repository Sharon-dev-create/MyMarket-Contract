import { type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-indigo-500 text-white hover:bg-indigo-400"
      : variant === "secondary"
        ? "bg-slate-900 text-slate-100 ring-1 ring-slate-800 hover:bg-slate-800"
        : "bg-transparent text-slate-200 hover:bg-slate-900 ring-1 ring-slate-800";
  return <button className={`${base} ${styles} ${className ?? ""}`} {...props} />;
}

