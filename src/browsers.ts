import { access } from "fs/promises"
import { join } from "path"
import puppeteer, { Browser } from "puppeteer"

let chrome: Browser | null = null
let firefox: Browser | null = null

const BROWSER_PATHS = {
  chrome: {
    linux: "/usr/bin/google-chrome-stable",
    mac: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    windows: join ( "C:", "Program Files", "Google", "Chrome", "Application", "chrome.exe" )
  },
  firefox: {
    linux: "/usr/bin/firefox",
    mac: "/Applications/Firefox.app/Contents/MacOS/firefox",
    windows: join ( "C:", "Program Files", "Mozilla Firefox", "firefox.exe" )
  }
}

/// Function to get the operating system
const getOS = ( ) => {
  if ( process.platform === "win32" ) return "windows"
  if ( process.platform === "darwin" ) return "mac"
  return "linux"
}

/// Function to check if the browser is installed
const isBrowserInstalled = async ( browser: "chrome" | "firefox" ) => {
  const os = getOS ( )
  const browserPath = BROWSER_PATHS [ browser ] [ os ]
  try {
    await access ( browserPath )
    return true
  } catch {
    return false
  }
}

/// Function to launch the browser
async function launchBrowser ( browserType: "chrome" | "firefox" ) {
  return new Promise<Browser> ( async ( resolve ) => {
    if ( browserType === "chrome" && chrome ) return resolve ( chrome )
    if ( browserType === "firefox" && firefox ) return resolve ( firefox )
    if ( ( browserType === "chrome" && !chrome ) || ( browserType === "firefox" && !firefox ) ) {
      const os = getOS ( )
      const executablePath = BROWSER_PATHS [ browserType ] [ os ]

      if ( !( await isBrowserInstalled ( browserType ) ) ) {
        console.error ( `${browserType.toUpperCase ( )} is not installed.` )
        process.exit ( 1 )
      }

      const browser = await puppeteer.launch ( {
        browser: browserType,
        headless: "shell",
        executablePath,
        args: [ "--no-sandbox", "--disable-setuid-sandbox" ]
      } )

      if ( browserType === "chrome" ) {
        chrome = browser
      }

      if ( browserType === "firefox" ) {
        firefox = browser
      }

      return resolve ( browser )
    }
    throw new Error ( `Browser type ${browserType} is not supported` )
  } )
}

// Close browsers when the process exits
async function closeBrowsers ( ): Promise<void> {
  try {
    if ( chrome ) {
      await ( await chrome ).close ( )
      chrome = null
    }
    if ( firefox ) {
      await ( await firefox ).close ( )
      firefox = null
    }
  } catch ( err ) {
    console.error ( "Error closing browsers in @iqx-limited/quick-form:", err )
  }
}

// Listen for process exit and close browsers
process.on ( "exit", async ( ) => {
  await closeBrowsers ( )
} )

// Additional safety to ensure resources are freed if there"s an unexpected shutdown
process.on ( "SIGINT", async ( ) => {
  console.log ( "SIGINT received. Closing browsers..." )
  await closeBrowsers ( )
} )

process.on ( "SIGTERM", async ( ) => {
  console.log ( "SIGTERM received. Closing browsers..." )
  await closeBrowsers ( )
} )

export { launchBrowser }