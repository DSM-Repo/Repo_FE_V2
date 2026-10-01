import { mkdtempSync, readdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'

function discover(directory, suffix) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return discover(path, suffix)
    return entry.isFile() && entry.name.endsWith(suffix) ? [path] : []
  }).sort()
}

function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  return result.status ?? 1
}

function rewriteImports(file, emittedFiles) {
  let source = readFileSync(file, 'utf8')
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS)
  const edits = []

  function visit(node) {
    let specifier
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      specifier = node.moduleSpecifier
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      specifier = node.arguments[0]
    }

    if (specifier && ts.isStringLiteralLike(specifier)) {
      const path = specifier.text
      if (path.startsWith('./') || path.startsWith('../')) {
        const resolved = [path, `${path}.js`, `${path}/index.js`].find(
          (candidate) => emittedFiles.has(resolve(dirname(file), candidate)),
        )
        if (resolved && resolved !== path) {
          edits.push({ start: specifier.getStart(parsed), end: specifier.end, text: JSON.stringify(resolved) })
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(parsed)
  // Apply parsed token edits backwards so every original source offset stays valid.
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end)
  }
  if (edits.length > 0) writeFileSync(file, source)
}

const outDir = mkdtempSync(join(tmpdir(), 'repo-v2-unit-'))

try {
  const tests = discover('tests/unit', '.test.ts')
  if (tests.length === 0) throw new Error('No unit tests found in tests/unit/**/*.test.ts')

  const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc')
  const compileStatus = run([
    tsc,
    '--ignoreConfig',
    '--types', 'node',
    '--module', 'ESNext',
    '--moduleResolution', 'Bundler',
    '--target', 'ES2022',
    '--noEmitOnError',
    '--outDir', outDir,
    '--rootDir', '.',
    ...tests,
  ])

  if (compileStatus !== 0) {
    process.exitCode = compileStatus
  } else {
    writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'module' }))
    const emittedFiles = new Set(discover(outDir, '.js'))
    for (const file of emittedFiles) rewriteImports(file, emittedFiles)

    process.exitCode = run([
      '--test',
      ...tests.map((file) => join(outDir, file.slice(0, -3) + '.js')),
    ])
  }
} finally {
  rmSync(outDir, { force: true, recursive: true })
}
