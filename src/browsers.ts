import { access, readFile, writeFile } from "fs/promises"
import { join } from "path"
import puppeteer, { Browser, Page } from "puppeteer"
import os from "os"

let firefox: Browser | null = null
let chrome: Browser | null = null
let isRemoteBrowser = false

let devMode: boolean = false
let useDataDir: boolean = false

const registryPath = join ( process.cwd ( ), ".puppeteer-launches.json" )

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

/// Function to launch the browser
let launching: Promise<{
  browser: Browser
  type: "firefox" | "chrome"
}> | null = null
const RESOURCE_LIMIT = 100 // Maximum allowed resources
let resourceCount = 0

let firefoxPagePool: Page [ ] = [ ]
let chromePagePool: Page [ ] = [ ]

// Helper to check if a process exists
const isProcessAlive = ( pid: number ) => {
  try {
    process.kill ( pid, 0 ) // throws if process does not exist
    return true
  } catch {
    return false
  }
}

// Async delay helper
const sleep = ( ms: number ) => new Promise ( resolve => setTimeout ( resolve, ms ) )

export const cleanupOrphanedBrowsers = async ( ) => {
  let registry: Record<string, { pid: number; ownerPid: number; started: number }> = { }

  try {
    const data = await readFile ( registryPath, "utf8" )
    registry = JSON.parse ( data )
  } catch {
    // File might not exist; start with empty registry
    registry = { }
  }

  const launchIds = Object.keys ( registry )
  for ( const launchId of launchIds ) {
    const { pid, ownerPid } = registry [ launchId ]

    if ( !isProcessAlive ( ownerPid ) ) {
      // Owner process is gone → safe to terminate browser
      try {
        process.kill ( pid, "SIGTERM" )
      } catch { } // ignore if already gone

      // Give it a moment before force kill
      await sleep ( 500 )

      try {
        if ( isProcessAlive ( pid ) ) {
          process.kill ( pid, "SIGKILL" )
        }
      } catch { }

      // Remove from registry
      delete registry [ launchId ]
      console.log ( `🧹 Cleaned up orphaned browser PID ${pid} (launchId: ${launchId})` )
    }
  }

  // Save updated registry
  await writeFile ( registryPath, JSON.stringify ( registry, null, 2 ) )
}

/// Function to get the operating system
const getOS = ( ) => {
  if ( process.platform === "win32" ) return "windows"
  if ( process.platform === "darwin" ) return "mac"
  return "linux"
}

export const setDevMode = ( mode: boolean ) => {
  devMode = mode
  if ( devMode ) {
    console.log ( "Quick-PDF: Dev Mode Enabled" )
    // On startup, clean up any orphaned browsers from previous runs
    cleanupOrphanedBrowsers ( ).catch ( err => {
      console.error ( "Error during cleanup of orphaned browsers:", err )
    } )
  }
}

export const setDataDir = ( mode: boolean ) => {
  useDataDir = mode
  if ( useDataDir ) {
    console.log ( `Quick-PDF: Using Data Directory` )
  }
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

async function createPage ( browser: Browser | null ): Promise<Page> {
  try {
    const context = browser?.defaultBrowserContext ( ) || await browser?.createBrowserContext ( )
    // Potential hanging issue: This may occur if the browser context is not properly initialized,
    // or if system resources are constrained. Consider retrying the operation or ensuring the
    // browser is fully launched before calling this method.
    const page = await context?.newPage ( )

    if ( !page ) {
      throw new Error ( "Failed to create a new page" )
    }

    await page.setRequestInterception ( true )
    await page.setDefaultNavigationTimeout ( 10000 ) // 10 seconds
    await page.goto ( "about:blank" ) // Load a blank page
    page.on ( "request", ( request: any ) => {
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
    if ( devMode ) {
      console.log ( `Trying to launch a page with browser: ${browser?.process ( ) ? "exists" : "null"}` )
      console.log ( `Browser process PID: ${browser?.process ( ) ? browser.process ( )?.pid : "N/A"}` )
      console.log ( `Browser contexts: ${browser?.browserContexts ( ).length ?? 0}` )
      console.log ( `Browser connected: ${browser?.connected}` )
      console.log ( `Browser user agent: ${await browser?.userAgent ( )}` )
      console.log ( `Browser version: ${await browser?.version ( )}` )
      for ( const context of browser?.browserContexts ?. () ?? [] ) {
        console.log ( `  - context ID: ${context.id || "(no id)"}` )
      }
      console.log ( `Product: ${browser?.process ( )?.spawnargs?.join ( " " ) ?? "(no spawnargs)"}` )
      const targets = browser?.targets ?. () ?? []
      console.log ( `Targets: ${targets.length}` )
      targets.forEach ( t => {
        console.log ( `  - Target type: ${t.type ()}, URL: ${t.url ()}` )
      } )
    }
    throw err
  }
}

export async function getPage ( type: "chrome" | "firefox" ): Promise<Page> {
  const browser = type === "chrome" ? chrome : firefox
  await launchPages ( browser, type )
  const pool = type === "chrome" ? chromePagePool : firefoxPagePool
  const page = pool.pop ( )
  if ( !page ) return await createPage ( browser ) // e.g. async of requests > RESOURCE_LIMIT
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
  const isBrowserValid = ( browser: Browser | null ) => {
    try {
      if ( browser && browser.browserContexts ( ).length && browser.connected && browser.process ( ) !== null ) {
        return true
      }
      return false
    } catch {
      return false
    }
  }
  if ( !browserType ) {
    if ( isBrowserValid ( firefox ) ) {
      return { browser: firefox!, type: "firefox" }
    } else if ( isBrowserValid ( chrome ) ) {
      return { browser: chrome!, type: "chrome" }
    } else {
      // Try launching Firefox first, Chrome to be revoked at a later time
      const firefox = await launchBrowser ( "firefox", wsURL ).catch ( ( ) => null )
      if ( firefox ) {
        return firefox
      }
      const chrome = await launchBrowser ( "chrome", wsURL ).catch ( ( ) => null )
      if ( chrome ) {
        return chrome
      }
      throw new Error ( "No browser launched yet" )
    }
  }

  if ( browserType === "firefox" && isBrowserValid ( firefox ) ) {
    return {
      browser: firefox!,
      type: "firefox"
    }
  } else if ( browserType === "chrome" && isBrowserValid ( chrome ) ) {
    return {
      browser: chrome!,
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
      const userDataDir = join ( os.tmpdir ( ), `puppeteer-${Date.now ( )}-${process.pid}` )
      browser = await puppeteer.launch ( {
        browser: browserType,
        headless: "shell",
        userDataDir: useDataDir && devMode ? userDataDir : undefined,
        executablePath: BROWSER_PATHS [ browserType ] [ getOS ( ) ],
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          `--quickpdf-launch-id=${Date.now ()}`
        ]
      } )
      if ( devMode ) {
        console.log ( `${browserType.toUpperCase ( )} launched with PID: ${browser.process ( )?.pid}` )
      }
      if ( useDataDir && devMode ) {
        console.log ( `Puppeteer profile directory for debugging: ${userDataDir}` )
      }
    }

    // Record new browser pid in registry
    let registry: Record<string, { pid: number; ownerPid: number; started: number }> = { }
    try {
      const data = await readFile ( registryPath, "utf8" )
      registry = JSON.parse ( data )
    } catch {
      // Ignore errors and start with an empty registry
    }

    const pid = browser.process ( )?.pid
    if ( pid ) {
      registry [ pid ] = {
        pid: pid,
        ownerPid: process.pid,
        started: Date.now ( )
      }
    }

    await writeFile ( registryPath, JSON.stringify ( registry, null, 2 ) )

    await launchPages ( browser, browserType )

    console.log ( `${browserType.toUpperCase ( )} browser is ready for usage.` )

    if ( browserType === "chrome" ) {
      chrome = browser
      chrome.on ( "targetdestroyed", target => {
        console.log ( `Target destroyed: ${target.url ()}` )
      } )
      chrome.on ( "disconnected", ( ) => {
        chrome = null
        console.warn ( "Browser disconnected" )
      } )
    } else {
      firefox = browser
      firefox.on ( "targetdestroyed", target => {
        console.log ( `Target destroyed: ${target.url ()}` )
      } )
      firefox.on ( "disconnected", ( ) => {
        firefox = null
        console.warn ( "Browser disconnected" )
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

process.on ( "uncaughtException", async ( ) => {
  await closeBrowser ( )
} )

export { launchBrowser, closeBrowser }