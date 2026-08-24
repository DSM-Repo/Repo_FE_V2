import { expect, test } from '@playwright/test'

test('moves focus into the class dialog and restores it when closed', async ({ page }) => {
  await page.goto('/students')

  const classTrigger = page.getByRole('button', { name: /1반/ }).first()
  const backgroundContent = page.locator('section[aria-labelledby="students-title"] > div').first()

  await classTrigger.click()

  const closeButton = page.getByRole('button', { name: '반 상세 닫기' })
  await expect(closeButton).toBeFocused()
  await expect(backgroundContent).toHaveAttribute('inert', '')

  await closeButton.click()
  await expect(classTrigger).toBeFocused()
  await expect(backgroundContent).not.toHaveAttribute('inert', '')
})
