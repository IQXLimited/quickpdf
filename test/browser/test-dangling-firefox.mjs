import puppeteer from 'puppeteer-core'
import { join } from 'path'
import { existsSync, rmSync } from 'fs'
import { fileURLToPath } from 'url'
import { platform } from 'os'
import process from 'process'

// ⬇️ Replace this with your actual Firefox binary path per OS
const BROWSER_PATHS = {
  firefox: {
    win32: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
    darwin: '/Applications/Firefox.app/Contents/MacOS/firefox',
    linux: '/usr/bin/firefox'
  }
}

const getOS = () => platform()

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

const profilePath = join(process.cwd(), 'browser-data', 'test')

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const runTest = async () => {
  console.log('🚀 Launching Firefox...')

  const browser = await puppeteer.launch({
    headless: false,
    browser: 'firefox',
    userDataDir: profilePath,
    executablePath: BROWSER_PATHS.firefox[getOS()],
    args: [
      `--profile=${profilePath}`,
      '--quickpdf-launch-id=test',
      '--remote-debugging-port=0'
    ]
  })

  const page = await browser.newPage()
  await page.goto('https://example.com')
  console.log('🟢 Firefox launched with Puppeteer.')

  const proc = browser.process?.()
  const pid = proc?.pid
  console.log('Firefox PID:', pid)

  console.log('⛔ Simulating crash (killing process)...')
  if (pid) {
    process.kill(pid)
  } else {
    console.warn('⚠️ No PID found; skipping kill.')
  }

  console.log('⏳ Waiting before cleanup...')
  await delay(1500)

  console.log('🧹 Attempting to delete profile folder...')
  for (let i = 0; i < 5; i++) {
    try {
      if (existsSync(profilePath)) {
        rmSync(profilePath, { recursive: true, force: true })
        console.log('✅ Successfully deleted profile folder.')
      } else {
        console.log('📂 Folder already gone.')
      }
      break
    } catch (err) {
      console.warn(`❌ Attempt ${i + 1} failed: ${err.message}`)
      await delay(1000)
    }
  }

  console.log('🧪 Test complete.')
}

runTest().catch(err => {
  console.error('🚨 Uncaught error:', err)
  process.exit(1)
})
