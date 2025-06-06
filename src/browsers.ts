import { access } from "fs/promises"
import { join } from "path"
import puppeteer, { Browser } from "puppeteer"

let firefox: Browser | null = null
let isRemoteBrowser = false

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

async function launchBrowser ( browserType: "firefox", wsURL: string = "" ): Promise<Browser> {
  if ( browserType !== "firefox" ) {
    throw new Error ( `Browser type ${browserType} is not supported` )
  }

  if ( firefox ) return firefox
  if ( launching ) return launching

  launching = ( async ( ) => {
    if ( !( await isBrowserInstalled ( browserType ) ) ) {
      console.error ( `${browserType.toUpperCase ( )} is not installed.` )
      process.exit ( 1 )
    }

    isRemoteBrowser = !!wsURL
    if ( wsURL ) {
      console.log ( `Launching remote ${browserType.toUpperCase ( )} browser...` )
      firefox = await puppeteer.connect ( {
        browserWSEndpoint: wsURL,
        acceptInsecureCerts: true
      } )
    } else {
      console.log ( `Launching local ${browserType.toUpperCase ( )} browser...` )
      firefox = await puppeteer.launch ( {
        browser: browserType,
        headless: "shell",
        executablePath: BROWSER_PATHS [ browserType ] [ getOS ( ) ],
        args: [ "--no-sandbox", "--disable-setuid-sandbox" ]
      } )
    }

    launching = null

    firefox.on ( "disconnected", ( ) => {
      firefox = null
    } )
    return firefox
  } ) ( )

  return launching
}

// Close browsers when the process exits
async function closeBrowser ( ): Promise<void> {
  try {
    if ( firefox ) {
      if ( firefox.connected ) {
        await firefox.disconnect ( )
      }
      if ( !isRemoteBrowser ) {
        await firefox.close ( )
      }
    }
    console.log ( "Firefox browser closed successfully." )
    firefox = null
  } catch ( err ) {
    console.error ( "Error closing browsers in @iqx-limited/quick-form:", err )
  }
}

// Listen for process exit and close browsers
process.on ( "exit", async ( ) => {
  await closeBrowser ( )
} )

// Additional safety to ensure resources are freed if there"s an unexpected shutdown
process.on ( "SIGINT", async ( ) => {
  console.log ( "SIGINT received. Closing browsers..." )
  await closeBrowser ( )
} )

process.on ( "SIGTERM", async ( ) => {
  console.log ( "SIGTERM received. Closing browsers..." )
  await closeBrowser ( )
} )

async function initBrowser ( ) {
  if ( !firefox ) {
    await launchBrowser ( "firefox" )
  }
}

export { launchBrowser, initBrowser, closeBrowser }