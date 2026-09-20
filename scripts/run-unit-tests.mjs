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
  'tests/unit/feedbackApi.test.ts',
  'tests/unit/feedbackApiFallback.test.ts',
  'tests/unit/internalHref.test.ts',
  'tests/unit/libraryApi.test.ts',
  'tests/unit/majorApi.test.ts',
  'tests/unit/resumeApi.test.ts',
  'tests/unit/userApi.test.ts',
  'src/features/auth/api/authAccessToken.ts',
  'src/features/auth/api/authApi.ts',
  'src/features/auth/api/authApi.types.ts',
  'src/features/auth/api/authenticatedRequest.ts',
  'src/features/auth/api/authHttpClient.ts',
  'src/features/auth/api/authTokenStorage.ts',
  'src/features/feedback/api/feedbackApi.ts',
  'src/features/feedback/api/feedbackApi.types.ts',
  'src/features/feedback/api/feedbackHttpClient.ts',
  'src/features/library/api/libraryApi.ts',
  'src/features/library/api/libraryApi.types.ts',
  'src/features/library/api/libraryHttpClient.ts',
  'src/features/major/api/majorApi.ts',
  'src/features/major/api/majorApi.types.ts',
  'src/features/major/api/majorHttpClient.ts',
  'src/features/resume/api/resumeApi.ts',
  'src/features/resume/api/resumeApi.types.ts',
  'src/features/resume/api/resumeHttpClient.ts',
  'src/features/user/api/userApi.ts',
  'src/features/user/api/userApi.types.ts',
  'src/features/user/api/userHttpClient.ts',
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
writeFileSync(
  emittedAuthApiPath,
  emittedAuthApi
    .replace("from './authAccessToken'", "from './authAccessToken.js'")
    .replace("from './authHttpClient'", "from './authHttpClient.js'"),
)

const emittedAuthTokenStoragePath = join(outDir, 'src/features/auth/api/authTokenStorage.js')
const emittedAuthTokenStorage = readFileSync(emittedAuthTokenStoragePath, 'utf8')
writeFileSync(
  emittedAuthTokenStoragePath,
  emittedAuthTokenStorage.replace("from './authAccessToken'", "from './authAccessToken.js'"),
)

const emittedAuthenticatedRequestPath = join(outDir, 'src/features/auth/api/authenticatedRequest.js')
const emittedAuthenticatedRequest = readFileSync(emittedAuthenticatedRequestPath, 'utf8')
writeFileSync(
  emittedAuthenticatedRequestPath,
  emittedAuthenticatedRequest
    .replace("from './authApi'", "from './authApi.js'")
    .replace("from './authTokenStorage'", "from './authTokenStorage.js'"),
)

const emittedResumeApiPath = join(outDir, 'src/features/resume/api/resumeApi.js')
const emittedResumeApi = readFileSync(emittedResumeApiPath, 'utf8')
writeFileSync(emittedResumeApiPath, emittedResumeApi.replace("from './resumeHttpClient'", "from './resumeHttpClient.js'"))
const emittedResumeHttpClientPath = join(outDir, 'src/features/resume/api/resumeHttpClient.js')
const emittedResumeHttpClient = readFileSync(emittedResumeHttpClientPath, 'utf8')
writeFileSync(
  emittedResumeHttpClientPath,
  emittedResumeHttpClient.replace("from '../../auth/api/authenticatedRequest'", "from '../../auth/api/authenticatedRequest.js'"),
)

const emittedFeedbackApiPath = join(outDir, 'src/features/feedback/api/feedbackApi.js')
const emittedFeedbackApi = readFileSync(emittedFeedbackApiPath, 'utf8')
writeFileSync(
  emittedFeedbackApiPath,
  emittedFeedbackApi.replace("from './feedbackHttpClient'", "from './feedbackHttpClient.js'"),
)
const emittedFeedbackHttpClientPath = join(outDir, 'src/features/feedback/api/feedbackHttpClient.js')
const emittedFeedbackHttpClient = readFileSync(emittedFeedbackHttpClientPath, 'utf8')
writeFileSync(
  emittedFeedbackHttpClientPath,
  emittedFeedbackHttpClient.replace("from '../../auth/api/authenticatedRequest'", "from '../../auth/api/authenticatedRequest.js'"),
)

const emittedLibraryApiPath = join(outDir, 'src/features/library/api/libraryApi.js')
const emittedLibraryApi = readFileSync(emittedLibraryApiPath, 'utf8')
writeFileSync(emittedLibraryApiPath, emittedLibraryApi.replace("from './libraryHttpClient'", "from './libraryHttpClient.js'"))
const emittedLibraryHttpClientPath = join(outDir, 'src/features/library/api/libraryHttpClient.js')
const emittedLibraryHttpClient = readFileSync(emittedLibraryHttpClientPath, 'utf8')
writeFileSync(
  emittedLibraryHttpClientPath,
  emittedLibraryHttpClient.replace("from '../../auth/api/authenticatedRequest'", "from '../../auth/api/authenticatedRequest.js'"),
)

const emittedMajorApiPath = join(outDir, 'src/features/major/api/majorApi.js')
const emittedMajorApi = readFileSync(emittedMajorApiPath, 'utf8')
writeFileSync(emittedMajorApiPath, emittedMajorApi.replace("from './majorHttpClient'", "from './majorHttpClient.js'"))
const emittedMajorHttpClientPath = join(outDir, 'src/features/major/api/majorHttpClient.js')
const emittedMajorHttpClient = readFileSync(emittedMajorHttpClientPath, 'utf8')
writeFileSync(
  emittedMajorHttpClientPath,
  emittedMajorHttpClient.replace("from '../../auth/api/authenticatedRequest'", "from '../../auth/api/authenticatedRequest.js'"),
)

const emittedUserApiPath = join(outDir, 'src/features/user/api/userApi.js')
const emittedUserApi = readFileSync(emittedUserApiPath, 'utf8')
writeFileSync(emittedUserApiPath, emittedUserApi.replace("from './userHttpClient'", "from './userHttpClient.js'"))
const emittedUserHttpClientPath = join(outDir, 'src/features/user/api/userHttpClient.js')
const emittedUserHttpClient = readFileSync(emittedUserHttpClientPath, 'utf8')
writeFileSync(
  emittedUserHttpClientPath,
  emittedUserHttpClient.replace("from '../../auth/api/authenticatedRequest'", "from '../../auth/api/authenticatedRequest.js'"),
)

run('node', ['--test', `${outDir}/tests/unit/*.test.js`])
