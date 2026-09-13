import { rmSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const outDir = '/tmp/repo-v2-unit'
const tscArgs = [
  '--ignoreConfig',
  '--types',
  'node',
  '--module',
  'ESNext',
  '--moduleResolution',
  'Bundler',
  '--target',
  'ES2022',
  '--outDir',
  outDir,
  '--rootDir',
  '.',
  'tests/unit/authApi.test.ts',
  'tests/unit/internalHref.test.ts',
  'tests/unit/resumeApi.test.ts',
  'src/features/auth/api/authApi.ts',
  'src/features/auth/api/authApi.types.ts',
  'src/features/auth/api/authHttpClient.ts',
  'src/features/resume/api/resumeApi.ts',
  'src/features/resume/api/resumeApi.types.ts',
  'src/features/resume/api/resumeHttpClient.ts',
  'src/shared/lib/internalHref.ts',
]

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

rmSync(outDir, {
  force: true,
  recursive: true,
})

run('tsc', tscArgs)

const emittedAuthApiPath = join(outDir, 'src/features/auth/api/authApi.js')
const emittedAuthApi = readFileSync(emittedAuthApiPath, 'utf8')
writeFileSync(emittedAuthApiPath, emittedAuthApi.replace("from './authHttpClient'", "from './authHttpClient.js'"))

const emittedResumeApiPath = join(outDir, 'src/features/resume/api/resumeApi.js')
const emittedResumeApi = readFileSync(emittedResumeApiPath, 'utf8')
writeFileSync(emittedResumeApiPath, emittedResumeApi.replace("from './resumeHttpClient'", "from './resumeHttpClient.js'"))

run('node', ['--test', `${outDir}/tests/unit/*.test.js`])
