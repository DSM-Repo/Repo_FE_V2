import { expect, test } from '@playwright/test'

test('filters the selected class student list by name', async ({ page }) => {
  await page.goto('/students')

  const searchField = page.getByRole('searchbox', { name: '학생 이름 검색' })
  const classTrigger = page.getByRole('button', { name: /1반/ }).first()

  await classTrigger.click()
  await expect(page.getByRole('dialog').getByRole('link', { name: /레주메 보러가기/ })).toHaveCount(9)

  await page.getByRole('button', { name: '반 상세 닫기' }).click()
  await searchField.fill('없는 학생')
  await classTrigger.click()
  await expect(page.getByRole('dialog').getByRole('link', { name: /레주메 보러가기/ })).toHaveCount(0)

  await page.getByRole('button', { name: '반 상세 닫기' }).click()
  await searchField.fill('최하')
  await classTrigger.click()
  await expect(page.getByRole('dialog').getByRole('link', { name: /레주메 보러가기/ })).toHaveCount(9)
})
