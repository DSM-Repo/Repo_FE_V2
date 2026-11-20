import { apiBaseUrl, expect, test } from './test-fixtures'

import { authenticateWithAccessToken, createTestAccessToken } from './auth-fixtures'

test('교사는 기업 계정을 생성하고 코드를 확인한 뒤 삭제할 수 있다', async ({ page }) => {
  const accessToken = createTestAccessToken('TEACHER')
  const company = {
    companyId: 7,
    name: '가나다 기업',
    code: 'ABCD-EFGH-IJKL-MNOP',
    createdAt: '2026-11-12T01:00:00Z',
  }
  const secondCompany = { ...company, companyId: 8, name: '하나 기업', code: 'AAAA-BBBB-CCCC-DDDD' }
  let companies: (typeof company)[] = []
  let deleteRequests = 0

  await authenticateWithAccessToken(page, accessToken)
  await page.route(`${apiBaseUrl}/resume/students`, (route) =>
    route.fulfill({ json: { lastUpdatedAt: null, numberOfData: 0, students: [] } }),
  )
  await page.route(`${apiBaseUrl}/company`, async (route) => {
    const request = route.request()
    expect(request.headers().authorization).toBe(`Bearer ${accessToken}`)

    if (request.method() === 'GET') {
      await route.fulfill({ json: { companies, numberOfData: companies.length } })
      return
    }

    expect(request.method()).toBe('POST')
    const body = request.postDataJSON()
    const { name } = body
    expect([company.name, secondCompany.name]).toContain(name)
    expect(body).toEqual({ name })
    if (companies.some((item) => item.name === name)) {
      await route.fulfill({ status: 409, json: { code: 'COMPANY_ALREADY_EXISTS' } })
      return
    }

    const created = name === company.name ? company : secondCompany
    companies = [...companies, created]
    await route.fulfill({ status: 201, json: created })
  })
  await page.route(`${apiBaseUrl}/company/${company.companyId}`, async (route) => {
    expect(route.request().method()).toBe('DELETE')
    expect(route.request().headers().authorization).toBe(`Bearer ${accessToken}`)
    deleteRequests += 1
    companies = companies.filter((item) => item.companyId !== company.companyId)
    await route.fulfill({ status: 204 })
  })

  await page.goto('/students')
  await page.getByRole('link', { name: '기업 계정 관리' }).click()
  await expect(page.getByText('등록된 기업 계정이 없습니다.')).toBeVisible()

  const nameField = page.getByRole('textbox', { name: '회사 이름' })
  const formAlert = page.getByRole('form', { name: '기업 계정 생성' }).getByRole('alert')
  await nameField.fill('가'.repeat(51))
  await nameField.press('Enter')
  await expect(formAlert).toHaveText('회사 이름을 50자 이하로 입력해 주세요.')

  await nameField.fill(`  ${company.name}  `)
  await nameField.press('Enter')
  await expect(page.getByText(company.code)).toBeVisible()
  await expect(nameField).toHaveValue('')

  await page.reload()
  await expect(page.getByText(company.code)).toBeVisible()
  await nameField.fill(company.name)
  await page.getByRole('button', { name: '계정 생성' }).click()
  await expect(formAlert).toHaveText('이미 등록된 회사 이름입니다.')
  await expect(page.getByText(company.code)).toHaveCount(1)

  await nameField.fill(secondCompany.name)
  await nameField.press('Enter')
  const accounts = page.getByRole('region', { name: '기업 계정 목록' })
  await expect(accounts.locator('li strong')).toHaveText([company.name, secondCompany.name])

  for (const width of [390, 320]) {
    await page.setViewportSize({ height: 844, width })
    await expect(page.getByText(company.code)).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  }

  const deleteButton = page.getByRole('button', { name: `${company.name} 계정 삭제` })
  page.once('dialog', (dialog) => dialog.dismiss())
  await deleteButton.click()
  await expect(deleteButton).toBeVisible()
  expect(deleteRequests).toBe(0)

  page.once('dialog', (dialog) => dialog.accept())
  await deleteButton.click()
  await expect(page.getByText(company.code)).toHaveCount(0)
  await expect(page.getByText(secondCompany.code)).toBeVisible()
  expect(deleteRequests).toBe(1)
})
