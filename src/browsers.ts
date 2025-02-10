import { exec } from "child_process"
import { access, mkdir } from "fs/promises"
import { homedir } from "os"
import puppeteer, { Browser } from "puppeteer"
import { resolve } from "path"

let chrome: Browser | null = null
let firefox: Browser | null = null
let launchInProgress: Promise<void> = Promise.resolve ( )
let installInProgress: Promise<void> = Promise.resolve ( )

async function installBrowsers ( ): Promise<void> {
  try {
    await access ( homedir ( ) + "/.cache" )
  } catch {
    await mkdir ( homedir ( ) + "/.cache" )
  }

  try {
    await access ( homedir ( ) + "/.cache/puppeteer" )
  } catch {
    await mkdir ( homedir ( ) + "/.cache/puppeteer" )
  }

  installInProgress = new Promise<void> ( async ( _resolve, reject ) => {
    exec (
      "npx --yes @puppeteer/browsers install chrome@stable && npx --yes @puppeteer/browsers install firefox@stable",
      {
        cwd: resolve ( homedir ( ), ".cache", "puppeteer" )
      },
      ( err, stdout ) => {
        if ( err ) {
          reject ( err )
        } else {
          console.log ( stdout )
          _resolve ( )
        }
      }
    )
  } )
}

async function getChromium ( ): Promise<Browser | null> {
  await installInProgress
  if ( chrome ) return chrome

  try {
    chrome = await puppeteer.launch ( {
      args: [ "--no-sandbox", "--disable-setuid-sandbox" ],  // Useful in certain environments (e.g., Docker)
    } )
  } catch ( err ) {
    console.error ( "Error launching Chromium browser in @iqx-limited/quick-form:", err )
  }

  console.log ( "Chromium Launched" )
  return chrome
}

async function getFirefox ( ): Promise<Browser | null> {
  await installInProgress
  if ( firefox ) return firefox

  try {
    firefox = await puppeteer.launch ( {
      browser: "firefox", // Use Firefox
      headless: true, // Set to false if you want to see the browser
      args: [ "--no-sandbox", "--disable-setuid-sandbox" ],  // Useful in certain environments (e.g., Docker)
    } )
  } catch ( err ) {
    console.error ( "Error launching Firefox browser in @iqx-limited/quick-form:", err )
  }

  console.log ( "Firefox Launched" )
  return firefox
}

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

async function launchBrowsers ( ): Promise<void> {
  launchInProgress = new Promise<void> ( async ( resolve ) => {
    await installInProgress
    await getChromium ( )
    await getFirefox ( )
    resolve ( )
  } )
}

// Listen for process exit and close browsers
process.on ( "exit", async ( ) => {
  await closeBrowsers ( )
} )

// Additional safety to ensure resources are freed if there's an unexpected shutdown
process.on ( "SIGINT", async ( ) => {
  console.log ( "SIGINT received. Closing browsers..." )
  await closeBrowsers ( )
} )

process.on ( "SIGTERM", async ( ) => {
  console.log ( "SIGTERM received. Closing browsers..." )
  await closeBrowsers ( )
} )

async function checkForLaunching ( ) {
  await installInProgress
  await launchInProgress
}

// Export the browsers for use in other files
export { getChromium, getFirefox, closeBrowsers, launchBrowsers, installBrowsers, checkForLaunching }
