import { access } from "fs/promises"
import { join } from "path"
import puppeteer, { Browser, Page } from "puppeteer-core"

let firefox: Browser | null = null
let chrome: Browser | null = null
let isRemoteBrowser = false

const BROWSER_PATHS = {
  chrome: {
    linux: "/usr/bin/google-chrome",
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
const isBrowserInstalled = async ( browser: "firefox" | "chrome" ) => {
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
let launching: Promise<{
  browser: Browser
  type: "firefox" | "chrome"
}> | null = null
const RESOURCE_LIMIT = 100 // Maximum allowed resources
let resourceCount = 0

let firefoxPagePool: Page [ ] = [ ]
let chromePagePool: Page [ ] = [ ]

async function launchPages ( browser: Browser | null, type: "chrome" | "firefox" ) {
  let pool = type === "chrome" ? chromePagePool : firefoxPagePool

  if ( !browser?.connected ) {
    throw new Error ( "Browser Not Launched" )
  }

  if ( pool.length > 0 ) {
    return pool
  }

  pool = [
    await createPage ( browser ),
    await createPage ( browser ),
    await createPage ( browser ),
    await createPage ( browser ),
    await createPage ( browser )
  ]

  if ( type === "chrome" ) {
    chromePagePool = pool
  } else {
    firefoxPagePool = pool
  }

  return pool
}

async function createPage ( browser: Browser ): Promise<Page> {
  try {
    const page = await browser.newPage ( ) // Hangs here
    await page.setRequestInterception ( true )
    await page.setDefaultNavigationTimeout ( 10000 ) // 10 seconds
    await page.goto ( "about:blank" ) // Load a blank page
    page.on ( "request", request => {
      resourceCount++
      if ( resourceCount > RESOURCE_LIMIT ) {
        page.reload ( ) // Reload the page when limit is exceeded
        resourceCount = 0 // Reset the counter
      } else {
        request.continue ( )
      }
    } )
    page.on ( "error", err => {
      console.error ( "Page error:", err )
    } )
    page.on ( "pageerror", err => {
      console.error ( "Page error:", err )
    } )
    return page
  } catch ( err ) {
    console.error ( "Error creating new page:", err )
    throw new Error ( "Failed to create a new page" )
  }
}

export async function getPage ( type: "chrome" | "firefox" ): Promise<Page> {
  await launchPages ( type === "chrome" ? chrome : firefox, type )
  const pool = type === "chrome" ? chromePagePool : firefoxPagePool
  const page = pool.pop ( )
  if ( !page ) throw new Error ( "Page pool unexpectedly empty" )
  return page
}

export async function restorePage ( type: "chrome" | "firefox", page: Page ) {
  await page.setViewport ( {
    width: 800,
    height: 600,
    deviceScaleFactor: 1
  } )
  if ( type === "chrome" ) {
    chromePagePool.push ( page )
  } else if ( type === "firefox" ) {
    firefoxPagePool.push ( page )
  }
}

async function launchBrowser ( browserType?: "firefox" | "chrome", wsURL?: string ): Promise<{
  browser: Browser
  type: "chrome" | "firefox"
}> {
  if ( !browserType ) {
    if ( firefox?.connected ) {
      return { browser: firefox, type: "firefox" }
    } else if ( chrome?.connected ) {
      return { browser: chrome, type: "chrome" }
    } else {
      const [ firefox, chrome ] = await Promise.all ( [
        launchBrowser ( "firefox", wsURL ).catch ( ( ) => null ),
        launchBrowser ( "chrome", wsURL ).catch ( ( ) => null )
      ] )
      if ( firefox ) {
        return firefox
      } else if ( chrome ) {
        return chrome
      }
      throw new Error ( "No browser launched yet" )
    }
  }

  if ( browserType === "firefox" && firefox?.connected ) {
    return {
      browser: firefox,
      type: "firefox"
    }
  } else if ( browserType === "chrome" && chrome?.connected ) {
    return {
      browser: chrome,
      type: "chrome"
    }
  }

  if ( !( await isBrowserInstalled ( browserType ) ) ) {
    throw new Error ( `${browserType.toUpperCase ( )} is not installed.` )
  }

  if ( launching ) {
    await launching
    return launchBrowser ( browserType, wsURL )
  }

  launching = ( async ( ) => {
    isRemoteBrowser = !!wsURL
    let browser: Browser
    if ( wsURL ) {
      console.log ( `Launching remote ${browserType.toUpperCase ( )} browser...` )
      browser = await puppeteer.connect ( {
        browserWSEndpoint: wsURL,
        acceptInsecureCerts: true
      } )
    } else {
      console.log ( `Launching local ${browserType.toUpperCase ( )} browser...` )
      browser = await puppeteer.launch ( {
        browser: browserType,
        headless: "shell",
        executablePath: BROWSER_PATHS [ browserType ] [ getOS ( ) ],
        args: [ "--no-sandbox", "--disable-setuid-sandbox" ]
      } )
    }

    await launchPages ( browser, browserType )

    if ( browserType === "chrome" ) {
      chrome = browser
      chrome.on ( "disconnected", ( ) => {
        chrome = null
      } )
    } else {
      firefox = browser
      firefox.on ( "disconnected", ( ) => {
        firefox = null
      } )
    }

    launching = null
    return {
      browser,
      type: browserType
    }
  } ) ( )

  return launching
}

// Close browsers when the process exits
async function closeBrowser ( ): Promise<void> {
  try {
    if ( chrome?.connected ) {
      await chrome.disconnect ( )
    }
    if ( firefox?.connected ) {
      await firefox.disconnect ( )
    }

    if ( !isRemoteBrowser ) {
      if ( chrome ) {
        await chrome.close ( )
      }
      if ( firefox ) {
        await firefox.close ( )
      }
    }
    console.log ( "Browser closed successfully." )
    chrome = null
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

export { launchBrowser, closeBrowser }