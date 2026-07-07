import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "./Button";

type ConfirmFn = (message: string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** `if (await confirm("¿Seguro?")) { ... }` — resuelve a `true` si el usuario confirma. */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return confirm;
}

/** Diálogo de confirmación global (p. ej. antes de borrar una nota): modal accesible
 * con foco atrapado entre sus dos botones y cerrable con Escape. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((msg) => {
    setMessage(msg);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setMessage(null);
  }, []);

  useEffect(() => {
    if (message) cancelRef.current?.focus();
  }, [message]);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      close(false);
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = [cancelRef.current, confirmRef.current].filter((el): el is HTMLButtonElement => el !== null);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {message && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 p-4 backdrop-blur-sm"
          style={{ overscrollBehavior: "contain" }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-message"
            className="w-full max-w-sm rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-float"
            onKeyDown={handleKeyDown}
          >
            <p id="confirm-dialog-message" className="text-sm text-[var(--text-primary)]">
              {message}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button ref={cancelRef} variant="ghost" onClick={() => close(false)}>
                Cancelar
              </Button>
              <Button ref={confirmRef} tone="critical" onClick={() => close(true)}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
