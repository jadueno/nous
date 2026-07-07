import { expect, test } from "@playwright/test";

test("pregunta al chat, la conversación sobrevive a recargar la página y se puede vaciar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Nueva nota" }).click();
  await page
    .getByLabel(/Contenido/)
    .fill("Receta de pan E2E\nPara el pan casero hace falta harina, agua, sal y levadura de panadería.");
  await page.getByRole("button", { name: "Crear nota" }).click();
  await expect(page.getByRole("heading", { name: "Receta de pan E2E" })).toBeVisible();

  await page.getByRole("button", { name: "Chat" }).click();
  await page.getByLabel("Tu pregunta").fill("¿Qué hace falta para el pan casero?");
  await page.getByRole("button", { name: "Preguntar" }).click();

  await expect(page.getByText("¿Qué hace falta para el pan casero?").first()).toBeVisible();
  await expect(page.getByText(/respuesta simulada/)).toBeVisible();

  // La conversación se persiste en el backend, no solo en memoria del navegador.
  await page.reload();
  await page.getByRole("button", { name: "Chat" }).click();
  await expect(page.getByText("¿Qué hace falta para el pan casero?").first()).toBeVisible();

  await page.getByRole("button", { name: "Vaciar conversación" }).click();
  await page.getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByText(/Todavía no le has preguntado nada/)).toBeVisible();
});
