import { access } from "fs/promises"
import { join } from "path"
import puppeteer, { Browser, Page } from "puppeteer"
import os from "os"
import { execSync, spawnSync } from "child_process"
import { existsSync, rmSync } from "fs"

let firefox: Browser | null = null
let chrome: Browser | null = null
let isRemoteBrowser = false

let devMode: boolean = false

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

// Helper function to escape slashes/backslashes for shell regex
function escapeForShellRegex ( path: string ) : string {
  // Escape backslashes (\) first, then forward slashes (/)
  // Replace each \ with \\, then each / with \/
  return path.replace ( /\\/g, "\\\\" ).replace ( /\//g, "\\/" )
}

const BROWSER_DATA_DIR = join ( process.cwd ( ), "browser-data" )
const LAUNCH_ID_ARG = "--quickpdf-launch-id=" // Use this prefix for easier matching
export const cleanupPuppeteerBrowsers = ( ) => {
  console.log ( "Cleaning up orphaned Puppeteer browser instances..." )
  const platform = os.platform ( )
  let pidsToKill: string [ ] = [ ]
  const escapedDataDir = escapeForShellRegex ( BROWSER_DATA_DIR )

  try {
    if ( platform === "win32" ) {
      // Find processes using 'chrome.exe' or 'firefox.exe' that have '--user-data-dir'
      // pointing to our expected browser-data directory OR the specific launch ID.
      const args = [
        "-Command",
        `Get-CimInstance Win32_Process | Where-Object {
          ($_.Name -eq 'chrome.exe' -or $_.Name -eq 'firefox.exe') -and
          ($_.CommandLine -like '*-user-data-dir=*${escapedDataDir}*' -or $_.CommandLine -like '*${LAUNCH_ID_ARG}*')
        } | Select-Object -ExpandProperty ProcessId`
      ]
      const output = spawnSync ( "powershell", args, { encoding: "utf8" } )
      pidsToKill = output.stdout.trim ( ).split ( os.EOL ).filter ( Boolean )
    } else {
      // macOS / Linux
      // Find processes using 'firefox' or 'chrome' that have '--user-data-dir'
      // pointing to our expected browser-data directory OR the specific launch ID.
      // Use 'grep -F' for fixed string matching and 'grep -v grep' to exclude the grep process itself
      const args = [
        "aux",
        "|", "grep", "-E", "'[c]hrome|[f]irefox'",
        "|", "grep", "-E", `-- '-user-data-dir=.+${escapedDataDir}' | ${LAUNCH_ID_ARG}`,
        "|", "awk", "'{print $2}'"
      ]
      const output = spawnSync ( "ps", args, { encoding: "utf8" } )
      pidsToKill = output.stdout.trim ( ).split ( os.EOL ).filter ( Boolean )
    }

    if ( pidsToKill.length === 0 ) {
      console.log ( "No orphaned Puppeteer browser instances found matching user data dir or launch ID." )
      return
    }

    console.log ( `Found ${pidsToKill.length} orphaned browser processes: ${pidsToKill.join ( ", " )}` )

    let killedCount = 0
    for ( const pid of pidsToKill ) {
      try {
        const numericPid = Number ( pid )
        if ( isNaN ( numericPid ) ) {
          console.warn ( `Skipping invalid PID: ${pid}` )
          continue
        }

        if ( platform === "win32" ) {
          // /T kills the process tree, /F forces termination
          execSync ( `taskkill /PID ${numericPid} /F /T` )
        } else {
          // Try SIGTERM first for graceful shutdown, then SIGKILL
          try {
            process.kill ( numericPid, "SIGTERM" )
            // Give it a moment to die
            execSync ( `sleep 0.5` ) // Using sleep command for cross-platform, but a real async sleep is better
          } catch ( e: any ) {
            if ( e.code !== "ESRCH" ) { // ESRCH means "No such process"
              throw e // Re-throw if it's not "process not found"
            }
          }
          // Check if process is still alive and then force kill
          try {
            process.kill ( numericPid, 0 ) // Check if process exists without sending signal
            process.kill ( numericPid, "SIGKILL" )
          } catch ( e: any ) {
            if ( e.code !== "ESRCH" ) {
              throw e
            }
          }
        }
        killedCount++
      } catch ( e: any ) {
        if ( e.message.includes ( "not found" ) || e.code === "ESRCH" ) {
          console.log ( `Process ${pid} already terminated.` )
        } else {
          console.warn ( `⚠️ Failed to kill process ${pid}: ${e.message}` )
        }
      }
    }
    console.log ( `✅ Attempted to clean up ${killedCount} orphaned Puppeteer browser instances.` )
  } catch ( e: any ) {
    console.error ( `Error during cleanup: ${e.message}` )
  } finally {
    // Check if any processes are still using the browser-data directory before deletion
    let processesUsingDir = false
    const escapedDataDir = escapeForShellRegex ( BROWSER_DATA_DIR )
    try {
      const platform = os.platform ( )
      if ( platform === "win32" ) {
      // Check for handles to the browser-data directory on Windows
        // const command = `powershell -Command "Get-Process | ` +
        //   `Where-Object { $_.MainModule.FileName -like '*${BROWSER_DATA_DIR.replace ( /\\/g, "\\\\" )}*' } | ` +
        //   `Select-Object -ExpandProperty Id"`
        const args = [
          "-Command",
          `Get-Process | Where-Object { $_.Modules | Where-Object { $_.FileName -like '*${escapedDataDir}*' } } | Select-Object -ExpandProperty Id`
        ]
        const output = spawnSync ( "powershell", args, { encoding: "utf8" } )
        processesUsingDir = output.stdout.trim ( ).length > 0
      } else {
      // Check for open file handles on Unix-like systems
        const command = `lsof +D "${BROWSER_DATA_DIR}" 2>/dev/null | grep -v COMMAND | wc -l`
        const output = execSync ( command, { encoding: "utf8" } )
        processesUsingDir = parseInt ( output.trim ( ) ) > 0
      }
    } catch ( e: any ) {
      console.log ( `Could not check if processes are using browser-data directory: ${e.message}` )
    }

    // Only attempt to remove the browser-data directory if no processes are using it
    if ( existsSync ( BROWSER_DATA_DIR ) ) {
      if ( !processesUsingDir ) {
        try {
          rmSync ( BROWSER_DATA_DIR, { recursive: true, force: true } )
          console.log ( `🧹 Cleaned up browser-data directory: ${BROWSER_DATA_DIR}` )
        } catch {
          // Something is still locking the directory, skip deletion
          console.warn ( `⚠️ Could not delete browser-data directory, it may be in use: ${BROWSER_DATA_DIR}` )
        }
      }
    }
  }
}

export const setDevMode = ( mode: boolean ) => {
  devMode = mode
  if ( devMode ) {
    console.log ( "Quick-PDF: Dev Mode Enabled" )
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

let cleanupRunning = false

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

  // Ensure cleanup only runs once at a time
  if ( cleanupRunning ) {
    // Wait for cleanup to finish by polling the flag
    while ( cleanupRunning ) {
      await new Promise ( resolve => setTimeout ( resolve, 100 ) )
    }
    // Skip cleanup since it already ran, continue with browser launch
  } else {
    cleanupRunning = true
    try {
      await cleanupPuppeteerBrowsers ( )
    } finally {
      cleanupRunning = false
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
        userDataDir: join ( process.cwd ( ), "browser-data" ),
        executablePath: BROWSER_PATHS [ browserType ] [ getOS ( ) ],
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          `--quickpdf-launch-id=${Date.now ()}`
        ]
      } )
    }

    await launchPages ( browser, browserType )

    console.log ( `${browserType.toUpperCase ( )} browser is ready for usage.` )

    if ( browserType === "chrome" ) {
      chrome = browser
      chrome.on ( "targetdestroyed", target => {
        console.log ( `Target destroyed: ${target.url ()}` )
      } )
      chrome.on ( "disconnected", ( ) => {
        chrome = null
        console.warn ( "Browser disconnected unexpectedly" )
      } )
    } else {
      firefox = browser
      firefox.on ( "targetdestroyed", target => {
        console.log ( `Target destroyed: ${target.url ()}` )
      } )
      firefox.on ( "disconnected", ( ) => {
        firefox = null
        console.warn ( "Browser disconnected unexpectedly" )
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