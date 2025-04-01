import { access } from "fs/promises"
import { join } from "path"
import puppeteer, { Browser } from "puppeteer"

let firefox: Browser | null = null

const BROWSER_PATHS = {
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
const isBrowserInstalled = async ( browser: "firefox" ) => {
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
async function launchBrowser ( browserType: "firefox" ) {
  return new Promise<Browser> ( async ( resolve ) => {
    if ( browserType === "firefox" && firefox ) return resolve ( firefox )
    if ( browserType === "firefox" && !firefox ) {
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