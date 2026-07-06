import { expect, test } from "@playwright/test";

test("pregunta al chat y la respuesta cita la nota de origen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Nueva nota" }).click();
  await page.getByLabel("Título").fill("Receta de pan E2E");
  await page
    .getByLabel(/Contenido/)
    .fill("Para el pan casero hace falta harina, agua, sal y levadura de panadería.");
  await page.getByRole("button", { name: "Crear nota" }).click();
  await expect(page.getByRole("heading", { name: "Receta de pan E2E" })).toBeVisible();

  await page.getByRole("button", { name: "Chat" }).click();
  await page.getByLabel("Tu pregunta").fill("¿Qué hace falta para el pan casero?");
  await page.getByRole("button", { name: "Preguntar" }).click();

  await expect(page.getByText(/Respuesta a/)).toBeVisible();
  await expect(page.getByText("Receta de pan E2E", { exact: true })).toBeVisible();
});
