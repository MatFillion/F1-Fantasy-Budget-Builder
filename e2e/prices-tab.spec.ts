import { test, expect } from '@playwright/test';

test.describe('Prices Tab', () => {
  test('page loads and shows header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toContainText('F1');
    await expect(page.locator('header')).toContainText('Fantasy Grid Notes');
  });

  test('Prices tab is active by default', async ({ page }) => {
    await page.goto('/');
    const pricesTab = page.getByRole('button', { name: 'Prices' });
    await expect(pricesTab).toBeVisible();
    await expect(pricesTab).toHaveClass(/border-red-500/);
  });

  test('shows Tier A and Tier B tables', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Tier A — ≥18.5M')).toBeVisible();
    await expect(page.getByText('Tier B — <18.5M')).toBeVisible();
  });

  test('shows driver abbreviations in tables', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Tier A — ≥18.5M')).toBeVisible();
    // Well-known top-tier drivers should appear somewhere in the tables
    const driverCells = page.locator('table td').first();
    await expect(driverCells).toBeVisible();
    // Check that at least one 3-letter abbreviation appears
    const allCells = page.locator('table td');
    const count = await allCells.count();
    expect(count).toBeGreaterThan(0);
    // Verify a common abbreviation like VER or NOR exists
    await expect(page.locator('table').getByText('VER').first()).toBeVisible();
  });

  test('tab switching works', async ({ page }) => {
    await page.goto('/');
    // Click Drivers tab
    await page.getByRole('button', { name: 'Drivers' }).click();
    // Prices tier labels should no longer be visible
    await expect(page.getByText('Tier A — ≥18.5M')).not.toBeVisible();
    // Drivers tab should now be active
    await expect(page.getByRole('button', { name: 'Drivers' })).toHaveClass(/border-red-500/);

    // Click Constructors tab
    await page.getByRole('button', { name: 'Constructors' }).click();
    await expect(page.getByRole('button', { name: 'Constructors' })).toHaveClass(/border-red-500/);
  });

  test('clicking Prices tab returns to prices view', async ({ page }) => {
    await page.goto('/');
    // Switch away
    await page.getByRole('button', { name: 'Drivers' }).click();
    await expect(page.getByText('Tier A — ≥18.5M')).not.toBeVisible();
    // Switch back
    await page.getByRole('button', { name: 'Prices' }).click();
    await expect(page.getByText('Tier A — ≥18.5M')).toBeVisible();
    await expect(page.getByText('Tier B — <18.5M')).toBeVisible();
  });
});
