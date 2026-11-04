import { authenticateAs } from './auth-fixtures'
import { apiBaseUrl, expect, test, type Page } from './test-fixtures'

async function createPhoto(page: Page, orientation: 'landscape' | 'portrait') {
  const data = await page.evaluate((shape) => {
    const canvas = document.createElement('canvas')
    canvas.width = shape === 'landscape' ? 800 : 400
    canvas.height = shape === 'portrait' ? 800 : 400
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is required for the fixture.')
    context.fillStyle = '#e04b50'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#2277cc'
    context.fillRect(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2)
    context.fillStyle = '#ffffff'
    context.beginPath()
    context.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2)
    context.fill()
    return canvas.toDataURL('image/png').split(',')[1]
  }, orientation)
  return { buffer: Buffer.from(data, 'base64'), mimeType: 'image/png', name: `${orientation}.png` }
}

test.beforeEach(async ({ page }) => {
  await authenticateAs(page, 'STUDENT')
  await page.route(`${apiBaseUrl}/user`, (route) => route.fulfill({ status: 500 }))
  await page.route(`${apiBaseUrl}/major`, (route) => route.fulfill({ json: { majors: [], numberOfData: 0 } }))
  await page.goto('/resume?mode=edit')
})

for (const orientation of ['landscape', 'portrait'] as const) {
  test(`crops ${orientation} photo with matching square selection, corner resizing, keyboard and drag controls before uploading`, async ({ page }, testInfo) => {
    let uploaded: Buffer | undefined
    await page.route(`${apiBaseUrl}/image`, async (route) => {
      const body = route.request().postDataBuffer()
      if (!body) throw new Error('Expected multipart image upload.')
      const form = await new Request(`${apiBaseUrl}/image`, { method: 'POST', headers: route.request().headers(), body: new Uint8Array(body) }).formData()
      const file = form.get('image')
      if (!(file instanceof File)) throw new Error('Expected image file.')
      expect(file.type).toBe('image/png')
      uploaded = Buffer.from(await file.arrayBuffer())
      await route.fulfill({ status: 201, json: { imageUrl: `${apiBaseUrl}/cropped.png`, key: 'cropped.png' } })
    })
    await page.route(`${apiBaseUrl}/cropped.png`, (route) => route.fulfill({ contentType: 'image/png', body: uploaded }))
    const photo = await createPhoto(page, orientation)
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: '프로필 이미지 추가' }).click()
    await (await chooser).setFiles(photo)
    const dialog = page.getByRole('dialog', { name: '프로필 사진 조정' })
    await expect(dialog).toBeVisible()
    expect(uploaded).toBeUndefined()
    const image = dialog.getByAltText('프로필 사진 미리보기')
    await expect(image).toBeVisible()
    const box = await image.boundingBox()
    if (!box) throw new Error('Preview must be measurable.')
    expect(box.width / box.height).toBeCloseTo(orientation === 'landscape' ? 2 : 0.5)
    await dialog.getByRole('slider', { name: '확대' }).fill('2')
    const preview = dialog.getByRole('group', { name: '프로필 사진 자르기 위치' })
    const initialSelection = await preview.boundingBox()
    if (!initialSelection) throw new Error('Square selection must be measurable.')
    expect(initialSelection.width).toBeCloseTo(initialSelection.height, 1)
    expect(initialSelection.width).toBeCloseTo(Math.min(box.width, box.height) / 2, 1)
    const fullImageAfterZoom = await image.boundingBox()
    expect(fullImageAfterZoom).toEqual(box)
    await preview.focus()
    await preview.press('ArrowLeft')
    const horizontal = dialog.getByRole('slider', { name: '가로 위치' })
    expect(Number(await horizontal.inputValue())).toBeLessThan(0.5)
    const previewBox = await preview.boundingBox()
    if (!previewBox) throw new Error('Crop selection must be measurable.')
    await page.mouse.move(previewBox.x + previewBox.width / 2, previewBox.y + previewBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(previewBox.x + previewBox.width / 2 + 30, previewBox.y + previewBox.height / 2 + 30)
    await page.mouse.up()
    expect(Number(await horizontal.inputValue())).toBeGreaterThan(0.5)
    for (const corner of ['왼쪽 위', '오른쪽 위', '왼쪽 아래', '오른쪽 아래']) {
      await expect(preview.getByRole('button', { name: `${corner} 크기 조절`, exact: true })).toBeVisible()
    }
    const beforeResize = await preview.boundingBox()
    const handle = await preview.getByRole('button', { name: '오른쪽 아래 크기 조절', exact: true }).boundingBox()
    if (!beforeResize || !handle) throw new Error('Corner resize handle must be measurable.')
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
    await page.mouse.down()
    await page.mouse.move(handle.x + handle.width / 2 - 10, handle.y + handle.height / 2 - 10)
    await page.mouse.up()
    const resized = await preview.boundingBox()
    if (!resized) throw new Error('Resized selection must be measurable.')
    expect(resized.width).toBeLessThan(beforeResize.width)
    expect(resized.width).toBeCloseTo(resized.height, 1)
    expect(resized.x).toBeCloseTo(beforeResize.x, 1)
    expect(resized.y).toBeCloseTo(beforeResize.y, 1)
    expect(Number(await dialog.getByRole('slider', { name: '확대' }).inputValue())).toBeGreaterThan(2)
    await horizontal.fill('1')
    await dialog.getByRole('slider', { name: '세로 위치' }).fill('1')
    const finalSelection = await preview.boundingBox()
    if (!finalSelection) throw new Error('Final selection must be measurable.')
    expect(finalSelection.x).toBeGreaterThanOrEqual(box.x - 1)
    expect(finalSelection.y).toBeGreaterThanOrEqual(box.y - 1)
    expect(finalSelection.x + finalSelection.width).toBeLessThanOrEqual(box.x + box.width + 1)
    expect(finalSelection.y + finalSelection.height).toBeLessThanOrEqual(box.y + box.height + 1)
    const expectedPixels = await image.evaluate((element, selected) => {
      const photo = element as HTMLImageElement
      const imageBox = photo.getBoundingClientRect()
      const scale = photo.naturalWidth / imageBox.width
      const canvas = document.createElement('canvas')
      canvas.width = 512; canvas.height = 512
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas required.')
      context.drawImage(photo, (selected.x - imageBox.x) * scale, (selected.y - imageBox.y) * scale,
        selected.width * scale, selected.height * scale, 0, 0, 512, 512)
      return [[64, 64], [448, 64], [256, 256], [64, 448], [448, 448]].map(([x, y]) => Array.from(context.getImageData(x, y, 1, 1).data))
    }, finalSelection)
    await page.screenshot({ path: testInfo.outputPath(`profile-crop-${orientation}.png`) })
    await dialog.getByRole('button', { name: '적용하기' }).click()
    await expect(dialog).toHaveCount(0)
    await expect.poll(() => uploaded?.length ?? 0).toBeGreaterThan(0)
    if (!uploaded) throw new Error('Crop must be uploaded after confirmation.')
    expect(uploaded.readUInt32BE(16)).toBe(512)
    expect(uploaded.readUInt32BE(20)).toBe(512)
    const pixels = await page.evaluate(async (base64) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = 512; canvas.height = 512
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas required.')
      context.drawImage(image, 0, 0)
      return [[64, 64], [448, 64], [256, 256], [64, 448], [448, 448]].map(([x, y]) => Array.from(context.getImageData(x, y, 1, 1).data))
    }, uploaded.toString('base64'))
    expect(pixels).toEqual(expectedPixels)
    expect(pixels[2]).toEqual([34, 119, 204, 255])
    await expect(page.getByRole('button', { name: '프로필 이미지 변경' }).locator('img')).toHaveAttribute('src', `${apiBaseUrl}/cropped.png`)
  })
}

test('cancel and Escape release the preview and upload nothing; corrupt files remain retryable', async ({ page }, testInfo) => {
  let uploads = 0
  await page.route(`${apiBaseUrl}/image`, async (route) => { uploads += 1; await route.fulfill({ status: 500 }) })
  const photo = await createPhoto(page, 'landscape')
  const trigger = page.getByRole('button', { name: '프로필 이미지 추가' })
  for (const action of ['cancel', 'escape', 'corrupt']) {
    const chooser = page.waitForEvent('filechooser')
    await trigger.click()
    await (await chooser).setFiles(action === 'corrupt' ? { ...photo, buffer: Buffer.from('corrupt') } : photo)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    if (action === 'corrupt') {
      await expect(dialog.getByRole('alert')).toContainText('사진을 읽지 못했습니다')
      await expect(dialog.getByRole('button', { name: '적용하기' })).toBeDisabled()
    } else {
      const url = await dialog.getByAltText('프로필 사진 미리보기').getAttribute('src')
      await page.setViewportSize({ width: 390, height: 740 })
      await expect(dialog.getByRole('button', { name: '적용하기' })).toBeInViewport()
      await page.screenshot({ path: testInfo.outputPath(`profile-crop-mobile-${action}.png`) })
      if (action === 'escape') await page.keyboard.press('Escape')
      else await dialog.getByRole('button', { name: '취소' }).click()
      await expect(dialog).toHaveCount(0)
      const revoked = await page.evaluate(async (source) => {
        const image = new Image(); image.src = source ?? ''
        try { await image.decode(); return false } catch { return true }
      }, url)
      expect(revoked).toBe(true)
      await expect(trigger).toBeFocused()
      continue
    }
    await dialog.getByRole('button', { name: '취소' }).click()
  }
  expect(uploads).toBe(0)
})
