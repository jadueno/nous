import { useState, type ComponentType, type SVGProps } from "react";
import { BrandMark } from "./components/BrandMark";
import { ConfirmProvider } from "./components/ConfirmProvider";
import { ChatIcon, NotesIcon } from "./components/icons";
import { ChatScreen } from "./features/chat/ChatScreen";
import { NotasScreen } from "./features/notas/NotasScreen";

type Section = "notas" | "chat";

const sections: { id: Section; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: "notas", label: "Notas", icon: NotesIcon },
  { id: "chat", label: "Chat", icon: ChatIcon },
];

export default function App() {
  const [section, setSection] = useState<Section>("notas");

  return (
    <ConfirmProvider>
      <div className="paper-shell flex min-h-screen flex-col sm:flex-row">
        {/* Sidebar de escritorio */}
        <nav
          aria-label="Secciones de la app"
          className="hidden shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--surface-1)] p-4 sm:sticky sm:top-0 sm:flex sm:h-screen sm:w-60"
        >
          <div className="mb-4 flex items-center gap-2.5 px-2">
            <BrandMark />
            <p className="font-display text-lg leading-tight font-semibold text-[var(--text-primary)]">Nous</p>
          </div>
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              aria-current={section === s.id ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-sm font-semibold whitespace-nowrap transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-clay)] ${
                section === s.id
                  ? "bg-[var(--ink)] text-[var(--on-ink)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--gridline)]"
              }`}
            >
              <s.icon className="size-5 shrink-0" />
              {s.label}
            </button>
          ))}
        </nav>

        <main className="relative flex-1 p-4 pb-28 sm:p-8 sm:pb-12">
          <div className="mx-auto max-w-4xl">
            {section === "notas" && <NotasScreen />}
            {section === "chat" && <ChatScreen />}
          </div>
        </main>

        {/* Barra de navegación inferior en móvil */}
        <nav
          aria-label="Secciones de la app"
          className="fixed inset-x-0 bottom-0 z-10 pb-[env(safe-area-inset-bottom)] sm:hidden"
        >
          <div className="mx-2 mb-3 flex justify-around rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-1)]/90 px-0.5 py-1.5 shadow-float backdrop-blur-md">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                aria-current={section === s.id ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[10px] font-semibold whitespace-nowrap transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-clay)] ${
                  section === s.id ? "bg-[var(--ink)] text-[var(--on-ink)]" : "text-[var(--text-muted)]"
                }`}
              >
                <s.icon className="size-5 shrink-0" />
                <span className="leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </ConfirmProvider>
  );
}
