import { expect, test } from "@playwright/test";

test("la búsqueda semántica encuentra el fragmento relevante", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Nueva nota" }).click();
  await page.getByLabel("Título").fill("Notas de viaje E2E");
  await page.getByLabel(/Contenido/).fill("Fuimos a la playa en verano y comimos marisco fresco.");
  await page.getByRole("button", { name: "Crear nota" }).click();
  await expect(page.getByRole("heading", { name: "Notas de viaje E2E" })).toBeVisible();

  await page.getByRole("navigation").getByRole("button", { name: "Buscar" }).click();
  await page.getByLabel("Qué estás buscando").fill("playa marisco verano");
  await page.getByRole("main").getByRole("button", { name: "Buscar" }).click();

  await expect(page.getByRole("heading", { name: "Notas de viaje E2E" })).toBeVisible();
  await expect(page.getByText(/% similar/)).toBeVisible();
});
