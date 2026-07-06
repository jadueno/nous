import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatScreen } from "./ChatScreen";

const { askApi } = vi.hoisted(() => ({ askApi: { ask: vi.fn() } }));
vi.mock("../../data/api", () => ({ askApi }));

describe("ChatScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("antes de preguntar, muestra el estado inicial y el botón deshabilitado sin texto", () => {
    render(<ChatScreen />);
    expect(screen.getByText(/Todavía no le has preguntado nada/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preguntar" })).toBeDisabled();
  });

  it("al preguntar, muestra la respuesta citando la nota de origen", async () => {
    const user = userEvent.setup();
    askApi.ask.mockResolvedValue({
      text: "Hace falta harina, agua, sal y levadura.",
      citations: [{ noteId: "n1", noteTitle: "Receta de pan", excerpt: "Harina, agua, sal y levadura." }],
    });
    render(<ChatScreen />);

    await user.type(screen.getByLabelText("Tu pregunta"), "¿Qué hace falta para el pan?");
    await user.click(screen.getByRole("button", { name: "Preguntar" }));

    expect(askApi.ask).toHaveBeenCalledWith("¿Qué hace falta para el pan?");
    expect(await screen.findByText("Hace falta harina, agua, sal y levadura.")).toBeInTheDocument();
    expect(screen.getByText("Receta de pan")).toBeInTheDocument();
    expect(screen.getByText('"Harina, agua, sal y levadura."')).toBeInTheDocument();
  });

  it("sin citas en la respuesta, avisa de que no está anclada a ninguna nota", async () => {
    const user = userEvent.setup();
    askApi.ask.mockResolvedValue({ text: "No tienes notas todavía.", citations: [] });
    render(<ChatScreen />);

    await user.type(screen.getByLabelText("Tu pregunta"), "¿Algo?");
    await user.click(screen.getByRole("button", { name: "Preguntar" }));

    expect(await screen.findByText(/no cita ninguna nota/)).toBeInTheDocument();
  });

  it("si la API falla, muestra el error en vez de quedarse cargando", async () => {
    const user = userEvent.setup();
    askApi.ask.mockRejectedValue(new Error("Backend caído"));
    render(<ChatScreen />);

    await user.type(screen.getByLabelText("Tu pregunta"), "¿Algo?");
    await user.click(screen.getByRole("button", { name: "Preguntar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Backend caído");
  });
});
