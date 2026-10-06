import assert from 'node:assert/strict'
import test from 'node:test'

import { clearSavedResumeId, getSavedResumeId, saveResumeId } from '../../src/features/resume/api/resumeIdStorage'
import { AUTH_ACCESS_TOKEN_STORAGE_KEY } from '../../src/features/auth/api/authTokenStorage'

const RESUME_ID_STORAGE_KEY = 'repo.resume.id'

function installLocalStorage() {
  const values = new Map<string, string>()
  const storage: Storage = {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key: string) {
      return values.get(key) ?? null
    },
    key(index: number) {
      return [...values.keys()][index] ?? null
    },
    removeItem(key: string) {
      values.delete(key)
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage },
  })

  return storage
}

function createAccessToken(payload: Record<string, unknown>) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`
}

test('getSavedResumeId reads the legacy resume id when the access token has no subject', () => {
  const storage = installLocalStorage()
  storage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, createAccessToken({ role: 'STUDENT' }))
  storage.setItem(RESUME_ID_STORAGE_KEY, 'legacy-resume-id')

  assert.equal(getSavedResumeId(), 'legacy-resume-id')
  assert.equal(storage.getItem(RESUME_ID_STORAGE_KEY), 'legacy-resume-id')
})

test('getSavedResumeId migrates the legacy resume id to the subject scoped key', () => {
  const storage = installLocalStorage()
  storage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, createAccessToken({ role: 'STUDENT', sub: 'student@dsm.hs.kr' }))
  storage.setItem(RESUME_ID_STORAGE_KEY, 'legacy-resume-id')

  assert.equal(getSavedResumeId(), 'legacy-resume-id')
  assert.equal(storage.getItem('repo.resume.id.student%40dsm.hs.kr'), 'legacy-resume-id')
  assert.equal(storage.getItem(RESUME_ID_STORAGE_KEY), null)
})

test('saveResumeId keeps the legacy key when the access token has no subject', () => {
  const storage = installLocalStorage()
  storage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, createAccessToken({ role: 'STUDENT' }))

  saveResumeId('saved-resume-id')

  assert.equal(storage.getItem(RESUME_ID_STORAGE_KEY), 'saved-resume-id')
})

test('clearSavedResumeId removes both subject scoped and legacy resume ids', () => {
  const storage = installLocalStorage()
  storage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, createAccessToken({ role: 'STUDENT', sub: 'student@dsm.hs.kr' }))
  storage.setItem('repo.resume.id.student%40dsm.hs.kr', 'scoped-resume-id')
  storage.setItem(RESUME_ID_STORAGE_KEY, 'legacy-resume-id')

  clearSavedResumeId()

  assert.equal(storage.getItem('repo.resume.id.student%40dsm.hs.kr'), null)
  assert.equal(storage.getItem(RESUME_ID_STORAGE_KEY), null)
})
