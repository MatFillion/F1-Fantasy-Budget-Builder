import { test, expect } from '@playwright/test';

test.describe('Prices Tab', () => {
  test('page loads and shows header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toContainText('F1');
    await expect(page.locator('header')).toContainText('Fantasy Grid Notes');
  });

  test('shows Tier A and Tier B tables', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Tier A')).toBeVisible();
    await expect(page.getByText('Tier B')).toBeVisible();
  });

  test('shows driver abbreviations in tables', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Tier A')).toBeVisible();
    // Check that at least one 3-letter abbreviation appears
    const allCells = page.locator('table td');
    const count = await allCells.count();
    expect(count).toBeGreaterThan(0);
    // Verify a common abbreviation like VER or NOR exists
    await expect(page.locator('table').getByText('VER').first()).toBeVisible();
  });

  test('price column header is sortable via keyboard', async ({ page }) => {
    await page.goto('/');
    const priceHeader = page.getByRole('columnheader', { name: '$' }).first();
    await expect(priceHeader).toBeVisible();
    await priceHeader.press('Enter');
    // After pressing Enter, aria-sort should change
    await expect(priceHeader).toHaveAttribute('aria-sort', /ascending|descending/);
  });
});
