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
let launching: Promise<Browser> | null = null

async function launchBrowser ( browserType: "firefox" ) {
  if ( browserType !== "firefox" ) {
    throw new Error ( `Browser type ${browserType} is not supported` )
  }

  if ( firefox ) return firefox
  if ( launching ) return launching

  launching = ( async ( ) => {
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

    firefox = browser
    launching = null
    return browser
  } ) ( )

  return launching
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

launchBrowser ( "firefox" )

export { launchBrowser, firefox }