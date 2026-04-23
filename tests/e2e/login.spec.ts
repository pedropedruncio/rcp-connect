import { expect, test } from '@playwright/test';

test('mostra a página de login em produção web', async ({ page }) => {
  const googleAuthEnabled = process.env.VITE_ENABLE_GOOGLE_AUTH === 'true';

  await page.goto('/login');

  await expect(page).toHaveTitle(/RCP Connect/);
  await expect(page.getByRole('heading', { name: 'Iniciar Sessão' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Receber link mágico/i })).toBeVisible();

  const googleButton = page.getByRole('button', { name: /Continuar com Google/i });

  if (googleAuthEnabled) {
    await expect(googleButton).toBeVisible();
  } else {
    await expect(googleButton).toHaveCount(0);
  }
});
