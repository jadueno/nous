import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("sin errores, renderiza los hijos normalmente", () => {
    render(
      <ErrorBoundary>
        <p>Todo bien</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Todo bien")).toBeInTheDocument();
  });

  it("si un hijo lanza al renderizar, muestra el aviso en vez de una pantalla en blanco", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Algo ha ido mal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recargar" })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
