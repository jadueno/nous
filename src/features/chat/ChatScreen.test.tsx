import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../../components/ConfirmProvider";
import { ChatScreen } from "./ChatScreen";

const { chatApi } = vi.hoisted(() => ({
  chatApi: { listMessages: vi.fn(), ask: vi.fn(), clear: vi.fn() },
}));
vi.mock("../../data/api", () => ({ chatApi }));

function renderScreen() {
  return render(
    <ConfirmProvider>
      <ChatScreen />
    </ConfirmProvider>,
  );
}

describe("ChatScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatApi.listMessages.mockResolvedValue([]);
  });

  it("sin conversación previa, muestra el estado inicial y el botón deshabilitado sin texto", async () => {
    renderScreen();
    expect(await screen.findByText(/Todavía no le has preguntado nada/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preguntar" })).toBeDisabled();
  });

  it("al cargar, hidrata la conversación ya persistida", async () => {
    chatApi.listMessages.mockResolvedValue([
      { id: "m1", role: "user", content: "¿Qué hace falta para el pan?", createdAt: "2026-01-01T00:00:00Z" },
      {
        id: "m2",
        role: "assistant",
        content: "Hace falta harina, agua, sal y levadura.",
        createdAt: "2026-01-01T00:00:01Z",
      },
    ]);
    renderScreen();

    expect(await screen.findByText("¿Qué hace falta para el pan?")).toBeInTheDocument();
    expect(screen.getByText("Hace falta harina, agua, sal y levadura.")).toBeInTheDocument();
  });

  it("al preguntar, añade el mensaje del usuario y la respuesta generada a la conversación", async () => {
    const user = userEvent.setup();
    chatApi.ask.mockResolvedValue({
      message: {
        id: "m2",
        role: "assistant",
        content: "Hace falta harina, agua, sal y levadura.",
        createdAt: "2026-01-01T00:00:01Z",
      },
      citations: [{ noteId: "n1", noteTitle: "Receta de pan", excerpt: "Harina, agua, sal y levadura." }],
    });
    renderScreen();
    await screen.findByText(/Todavía no le has preguntado nada/);

    await user.type(screen.getByLabelText("Tu pregunta"), "¿Qué hace falta para el pan?");
    await user.click(screen.getByRole("button", { name: "Preguntar" }));

    expect(chatApi.ask).toHaveBeenCalledWith("¿Qué hace falta para el pan?");
    expect(await screen.findByText("¿Qué hace falta para el pan?")).toBeInTheDocument();
    expect(await screen.findByText("Hace falta harina, agua, sal y levadura.")).toBeInTheDocument();
  });

  it("si la API falla, muestra el error en vez de quedarse cargando", async () => {
    const user = userEvent.setup();
    chatApi.ask.mockRejectedValue(new Error("Backend caído"));
    renderScreen();
    await screen.findByText(/Todavía no le has preguntado nada/);

    await user.type(screen.getByLabelText("Tu pregunta"), "¿Algo?");
    await user.click(screen.getByRole("button", { name: "Preguntar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Backend caído");
  });

  it("pide confirmación antes de vaciar la conversación y solo la vacía si se confirma", async () => {
    const user = userEvent.setup();
    chatApi.listMessages.mockResolvedValue([
      { id: "m1", role: "user", content: "¿Algo?", createdAt: "2026-01-01T00:00:00Z" },
    ]);
    chatApi.clear.mockResolvedValue(undefined);
    renderScreen();

    await screen.findByText("¿Algo?");
    await user.click(screen.getByRole("button", { name: "Vaciar conversación" }));
    expect(screen.getByText(/¿Vaciar toda la conversación\?/)).toBeInTheDocument();
    expect(chatApi.clear).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(chatApi.clear).toHaveBeenCalled());
    expect(await screen.findByText(/Todavía no le has preguntado nada/)).toBeInTheDocument();
  });
});
