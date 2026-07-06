import { expect, test } from "@playwright/test";

test("crea una nota, la edita y la borra con confirmación", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Nueva nota" }).click();
  await page.getByLabel("Título").fill("Nota E2E");
  await page.getByLabel(/Contenido/).fill("Contenido de prueba E2E.");
  await page.getByRole("button", { name: "Crear nota" }).click();

  await expect(page.getByRole("heading", { name: "Nota E2E" })).toBeVisible();

  await page.getByRole("heading", { name: "Nota E2E" }).click();
  await page.getByLabel("Título").fill("Nota E2E editada");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByRole("heading", { name: "Nota E2E editada" })).toBeVisible();

  await page.getByRole("button", { name: "Eliminar nota Nota E2E editada" }).click();
  await expect(page.getByText('¿Eliminar la nota "Nota E2E editada"?')).toBeVisible();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Nota E2E editada" })).not.toBeVisible();
});

test("cancelar la confirmación no borra la nota", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Nueva nota" }).click();
  await page.getByLabel("Título").fill("Nota que se queda");
  await page.getByLabel(/Contenido/).fill("No debería borrarse.");
  await page.getByRole("button", { name: "Crear nota" }).click();
  await expect(page.getByRole("heading", { name: "Nota que se queda" })).toBeVisible();

  await page.getByRole("button", { name: "Eliminar nota Nota que se queda" }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Nota que se queda" })).toBeVisible();
});
