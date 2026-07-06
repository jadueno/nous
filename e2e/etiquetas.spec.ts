import { expect, test } from "@playwright/test";

test("añade etiquetas a una nota y filtra la lista al pulsar una", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ Nueva nota" }).click();
  await page.getByLabel(/Contenido/).fill("Lista de la compra E2E\nHarina, agua, sal y levadura.");
  const tagInput = page.getByLabel("Etiquetas");
  await tagInput.fill("comida");
  await tagInput.press("Enter");
  await tagInput.fill("recetas");
  await tagInput.press("Enter");
  await page.getByRole("button", { name: "Crear nota" }).click();

  await expect(page.getByRole("heading", { name: "Lista de la compra E2E" })).toBeVisible();
  // Los chips de la nota son texto plano; el filtro es un botón — evita ambigüedad.
  await expect(page.getByRole("button", { name: "comida", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "recetas", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "+ Nueva nota" }).click();
  await page.getByLabel(/Contenido/).fill("Ideas de fin de semana E2E\nCosas que hacer el sábado.");
  await page.getByLabel("Etiquetas").fill("planes");
  await page.getByLabel("Etiquetas").press("Enter");
  await page.getByRole("button", { name: "Crear nota" }).click();
  await expect(page.getByRole("heading", { name: "Ideas de fin de semana E2E" })).toBeVisible();

  await page.getByRole("button", { name: "comida", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Lista de la compra E2E" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ideas de fin de semana E2E" })).not.toBeVisible();
});
