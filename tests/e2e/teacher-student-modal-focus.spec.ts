import { expect, test, apiBaseUrl } from './test-fixtures'

import { authenticateAs } from './auth-fixtures'

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 600 }, { width: 390, height: 844 }]) {
  test(`scrolls a full class while keeping its heading and close button visible at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await authenticateAs(page, 'TEACHER')
    const students = Array.from({ length: 30 }, (_, index) => ({
      classNumber: 1,
      grade: 1,
      majorName: '프론트엔드',
      name: `학생${index + 1}`,
      number: index + 1,
      resumeId: `resume-${index + 1}`,
      schoolNumber: `11${String(index + 1).padStart(2, '0')}`,
      studentId: index + 1,
      submissionStatus: 'ONGOING',
      submitted: false,
      submittedAt: null,
    }))
    await page.route(`${apiBaseUrl}/resume/students`, (route) => route.fulfill({
      json: { schoolYear: 2026, grade: null, classNumber: null, lastUpdatedAt: '2026-10-21T06:04:00.000Z', numberOfData: students.length, students },
    }))
    await page.goto('/students')
    await page.getByRole('button', { name: /1반 30명/ }).first().click()

    const dialog = page.getByRole('dialog')
    const list = dialog.locator('[aria-label$="학생 제출 현황"]')
    const heading = dialog.getByRole('heading')
    const headingBefore = await heading.boundingBox()
    await expect.poll(() => list.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
    await list.hover()
    await page.mouse.wheel(0, 5000)
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    const lastStudent = dialog.getByRole('link', { name: /1130 학생30/ })
    await expect(lastStudent).toBeInViewport({ ratio: 1 })
    const rowContentsFit = await list.locator('a').evaluateAll((rows) => rows.every((row) => {
      const bounds = row.getBoundingClientRect()
      return Array.from(row.children).every((child) => {
        const content = child.getBoundingClientRect()
        return content.top >= bounds.top && content.bottom <= bounds.bottom
      })
    }))
    expect(rowContentsFit).toBe(true)
    expect(await heading.boundingBox()).toEqual(headingBefore)
    await expect(dialog.getByRole('button', { name: '반 상세 닫기' })).toBeInViewport({ ratio: 1 })
    await page.screenshot({ path: testInfo.outputPath(`class-list-scrolled-${viewport.width}.png`) })
    await dialog.getByRole('button', { name: '반 상세 닫기' }).click()
    await expect(dialog).toHaveCount(0)
  })
}

test('moves focus into the class dialog and restores it when closed', async ({ page }) => {
  await authenticateAs(page, 'TEACHER')
  await page.route('**/resume/students', async (route) => {
    await route.fulfill({
      body: JSON.stringify({ lastUpdatedAt: '2026-09-20T00:00:00.000Z', numberOfData: 0, students: [] }),
      contentType: 'application/json',
      status: 200,
    })
  })
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
