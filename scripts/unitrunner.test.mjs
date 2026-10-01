import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const runner = fileURLToPath(new URL('./run-unit-tests.mjs', import.meta.url))
const modules = fileURLToPath(new URL('../node_modules', import.meta.url))

function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'unitrunner-fixture-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'tmp'))
  mkdirSync(join(root, 'barrier'))
  mkdirSync(join(root, 'tests/unit'), { recursive: true })
  symlinkSync(modules, join(root, 'node_modules'), 'dir')
  for (const [path, source] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), source)
  }
  return root
}

function run(root, env = {}) {
  const childEnv = { ...process.env, TMPDIR: join(root, 'tmp'), NODE_DISABLE_COMPILE_CACHE: '1', ...env }
  delete childEnv.NODE_TEST_CONTEXT
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [runner], {
      cwd: root,
      env: childEnv,
      timeout: 60_000,
    }, (error, stdout, stderr) => {
      if (error && typeof error.code !== 'number') {
        reject(error)
        return
      }
      resolve({ code: error?.code ?? 0, output: stdout + stderr })
    })
  })
}

test('discovers new nested specs and rewrites only relative module specifiers', async (t) => {
  const root = fixture(t, {
    'tests/unit/original.test.ts': `
      import test from 'node:test'
      test('original spec', () => {})
    `,
    'tests/unit/new/nested.test.ts': `
      import assert from 'node:assert/strict'
      import test from 'node:test'
      import { answer } from '../../../src/barrel'
      import { label } from "../../../src/value.config"
      import '../../../src/side-effect'
      import { existing } from '../../../src/existing.js'
      test('new nested spec', async () => {
        const dynamic = await import('../../../src/dynamic')
        const directory = await import('../../../src/directory')
        assert.equal(answer + dynamic.value + directory.value + existing, 42)
        assert.equal(label, "from './value.config'")
        assert.equal(process.env.UNITRUNNER_SIDE_EFFECT, 'loaded')
      })
    `,
    'tests/unit/ignored.ts': 'const invalid: number = "must not compile"',
    'src/barrel.ts': `export { answer } from './reexport'`,
    'src/reexport.ts': `export * from './answer'`,
    'src/answer.ts': 'export const answer = 30',
    'src/value.config.ts': `export const label = "from './value.config'"`,
    'src/side-effect.ts': `process.env.UNITRUNNER_SIDE_EFFECT = 'loaded'`,
    'src/existing.ts': 'export const existing = 3',
    'src/dynamic.ts': 'export const value = 4',
    'src/directory/index.ts': 'export const value = 5',
  })

  const result = await run(root)

  assert.equal(result.code, 0, result.output)
  assert.match(result.output, /# tests 2\b/)
  assert.match(result.output, /# pass 2\b/)
  assert.deepEqual(readdirSync(join(root, 'tmp')), [])
  t.diagnostic('Two specs passed; static/dynamic/side-effect imports, re-exports, index and dotted paths resolved; output cleaned.')
})

test('concurrent runners use distinct outputs that remain available until both tests finish', async (t) => {
  const root = fixture(t, {
    'tests/unit/concurrent.test.ts': `
      import assert from 'node:assert/strict'
      import { existsSync, readFileSync, renameSync, unwatchFile, watchFile, writeFileSync } from 'node:fs'
      import { join } from 'node:path'
      import { fileURLToPath } from 'node:url'
      import test from 'node:test'
      test('simultaneous output isolation', async () => {
        const barrier = join(process.cwd(), 'barrier')
        const id = process.env.UNITRUNNER_ID
        const arrive = (phase: string, content: string) => new Promise<void>((resolve, reject) => {
          const paths = ['one', 'two'].map((name) => join(barrier, phase + '-' + name))
          const signal = AbortSignal.timeout(10_000)
          const cleanup = () => {
            for (const path of paths) unwatchFile(path, changed)
            signal.removeEventListener('abort', aborted)
          }
          const changed = () => {
            if (paths.every((path) => existsSync(path))) {
              cleanup()
              resolve()
            }
          }
          const aborted = () => {
            cleanup()
            reject(new Error('Barrier timed out: ' + phase))
          }
          signal.addEventListener('abort', aborted, { once: true })
          for (const path of paths) watchFile(path, { interval: 20 }, changed)
          const path = join(barrier, phase + '-' + id)
          writeFileSync(path + '.tmp', content)
          renameSync(path + '.tmp', path)
          changed()
        })

        await arrive('ready', fileURLToPath(import.meta.url))
        const paths = ['one', 'two'].map((name) => readFileSync(join(barrier, 'ready-' + name), 'utf8'))
        assert.notEqual(paths[0], paths[1])
        assert.ok(paths.every((path) => existsSync(path)), JSON.stringify(
          paths.map((path) => ({ path, exists: existsSync(path) }))))
        await arrive('checked', 'ok')
      })
    `,
  })

  const results = await Promise.all([
    run(root, { UNITRUNNER_ID: 'one' }),
    run(root, { UNITRUNNER_ID: 'two' }),
  ])

  for (const [index, result] of results.entries()) {
    if (result.code !== 0) t.diagnostic(JSON.stringify({ runner: index, ...result }))
  }
  for (const result of results) {
    assert.equal(result.code, 0, result.output)
    assert.match(result.output, /# pass 1\b/)
  }
  assert.deepEqual(readdirSync(join(root, 'tmp')), [])
  t.diagnostic('Both runners passed after checking distinct, simultaneously existing emitted files; both outputs cleaned.')
  t.diagnostic(JSON.stringify({ emittedPaths: ['one', 'two'].map(
    (id) => readFileSync(join(root, 'barrier', 'ready-' + id), 'utf8'),
  ) }))
})

test('compile failure returns nonzero without executing tests and cleans its output', async (t) => {
  const root = fixture(t, {
    'tests/unit/compile.test.ts': `
      import { writeFileSync } from 'node:fs'
      const invalid: number = 'type error'
      writeFileSync('executed', String(invalid))
    `,
  })

  const result = await run(root)

  assert.notEqual(result.code, 0)
  assert.match(result.output, /TS2322/)
  assert.equal(existsSync(join(root, 'executed')), false)
  assert.deepEqual(readdirSync(join(root, 'tmp')), [])
  t.diagnostic('Compiler reported TS2322; runner failed, test side effect absent, output cleaned.')
})

test('test failure returns nonzero and cleans its output', async (t) => {
  const root = fixture(t, {
    'tests/unit/failure.test.ts': `
      import assert from 'node:assert/strict'
      import test from 'node:test'
      test('intentional failure', () => assert.equal(1, 2))
    `,
  })

  const result = await run(root)

  assert.notEqual(result.code, 0)
  assert.match(result.output, /# fail 1\b/)
  assert.deepEqual(readdirSync(join(root, 'tmp')), [])
  t.diagnostic('Node test failure propagated as nonzero; output cleaned.')
})

test('empty discovery fails without falling back to Node automatic discovery', async (t) => {
  const root = fixture(t, {
    'unrelated.test.js': `throw new Error('UNRELATED_TEST_EXECUTED')`,
  })

  const result = await run(root)

  assert.notEqual(result.code, 0)
  assert.match(result.output, /No unit tests found/)
  assert.doesNotMatch(result.output, /UNRELATED_TEST_EXECUTED/)
  assert.deepEqual(readdirSync(join(root, 'tmp')), [])
})
