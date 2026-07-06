import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BuscarScreen } from "./BuscarScreen";

const { searchApi } = vi.hoisted(() => ({ searchApi: { search: vi.fn() } }));
vi.mock("../../data/api", () => ({ searchApi }));

describe("BuscarScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("antes de buscar, muestra el estado inicial", () => {
    render(<BuscarScreen />);
    expect(screen.getByText(/Escribe algo arriba para buscar/)).toBeInTheDocument();
  });

  it("al buscar, muestra los resultados ordenados por similitud (mayor score primero)", async () => {
    const user = userEvent.setup();
    searchApi.search.mockResolvedValue([
      { chunk: { id: "c1", noteId: "n1", content: "Menos relevante", position: 0 }, noteTitle: "Nota B", score: 0.3 },
      { chunk: { id: "c2", noteId: "n2", content: "Más relevante", position: 0 }, noteTitle: "Nota A", score: 0.9 },
    ]);
    render(<BuscarScreen />);

    await user.type(screen.getByLabelText("Qué estás buscando"), "levadura horno");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    const titles = await screen.findAllByRole("heading", { level: 2 });
    expect(titles.map((t) => t.textContent)).toEqual(["Nota A", "Nota B"]);
    expect(screen.getByText("90% similar")).toBeInTheDocument();
  });

  it("sin resultados, avisa de que no se ha encontrado nada", async () => {
    const user = userEvent.setup();
    searchApi.search.mockResolvedValue([]);
    render(<BuscarScreen />);

    await user.type(screen.getByLabelText("Qué estás buscando"), "algo raro");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText(/No se ha encontrado nada relacionado con "algo raro"/)).toBeInTheDocument();
  });
});
