import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../../components/ConfirmProvider";
import type { Note } from "../../data/types";
import { NotasScreen } from "./NotasScreen";

const { notesApi } = vi.hoisted(() => ({
  notesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../../data/api", () => ({ notesApi }));

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "Receta de pan",
    content: "Harina, agua, sal y levadura.",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <ConfirmProvider>
      <NotasScreen />
    </ConfirmProvider>,
  );
}

describe("NotasScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin notas, muestra el aviso de que no hay ninguna", async () => {
    notesApi.list.mockResolvedValue([]);
    renderScreen();

    expect(await screen.findByText("Todavía no tienes ninguna nota. Escribe la primera.")).toBeInTheDocument();
  });

  it("crea una nota nueva y la lista se recarga", async () => {
    const user = userEvent.setup();
    notesApi.list.mockResolvedValueOnce([]).mockResolvedValueOnce([note()]);
    notesApi.create.mockResolvedValue(note());
    renderScreen();

    await screen.findByText("Todavía no tienes ninguna nota. Escribe la primera.");
    await user.click(screen.getByRole("button", { name: "+ Nueva nota" }));
    await user.type(screen.getByLabelText("Título"), "Receta de pan");
    await user.type(screen.getByLabelText(/Contenido/), "Harina, agua, sal y levadura.");
    await user.click(screen.getByRole("button", { name: "Crear nota" }));

    expect(notesApi.create).toHaveBeenCalledWith({ title: "Receta de pan", content: "Harina, agua, sal y levadura." });
    expect(await screen.findByText("Receta de pan")).toBeInTheDocument();
  });

  it("pide confirmación antes de borrar una nota y solo la borra si se confirma", async () => {
    const user = userEvent.setup();
    notesApi.list.mockResolvedValue([note()]);
    notesApi.remove.mockResolvedValue(undefined);
    renderScreen();

    await screen.findByText("Receta de pan");
    await user.click(screen.getByRole("button", { name: "Eliminar nota Receta de pan" }));
    expect(screen.getByText(/¿Eliminar la nota "Receta de pan"\?/)).toBeInTheDocument();
    expect(notesApi.remove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(notesApi.remove).toHaveBeenCalledWith("n1"));
  });

  it("no borra la nota si se cancela la confirmación", async () => {
    const user = userEvent.setup();
    notesApi.list.mockResolvedValue([note()]);
    renderScreen();

    await screen.findByText("Receta de pan");
    await user.click(screen.getByRole("button", { name: "Eliminar nota Receta de pan" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(notesApi.remove).not.toHaveBeenCalled();
    expect(screen.getByText("Receta de pan")).toBeInTheDocument();
  });
});
