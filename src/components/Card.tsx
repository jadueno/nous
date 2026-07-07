import type { CSSProperties, ReactNode } from "react";

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-card transition-shadow duration-200 sm:p-6 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
