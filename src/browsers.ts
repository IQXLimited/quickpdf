import puppeteer, { Browser } from "puppeteer"

let chromiumBrowser: Browser | null = null
let firefoxBrowser: Browser | null = null

let launchPromise: Promise<void> | null = null  // Keep track of the launch promise

// Function to launch both browsers asynchronously
async function launchBrowsers ( ): Promise<void> {
  if ( launchPromise ) {
    return launchPromise
  }

  launchPromise = ( async ( ) => {
    try {
      // Launch Chromium browser
      chromiumBrowser = await puppeteer.launch ( {
        headless: true, // Set to false if you want to see the browser
        args: [ "--no-sandbox", "--disable-setuid-sandbox" ],  // Useful in certain environments (e.g., Docker)
      } )

      // Launch Firefox browser
      firefoxBrowser = await puppeteer.launch ( {
        browser: "firefox", // Use Firefox
        headless: true, // Set to false if you want to see the browser
        args: [ "--no-sandbox", "--disable-setuid-sandbox" ],  // Useful in certain environments (e.g., Docker)
      } )
    } catch ( err ) {
      console.error ( "Error launching browsers in @iqx-limited/quick-form:", err )
    }
  } ) ( )

  return launchPromise
}

// Function to close both browsers
async function closeBrowsers ( ): Promise<void> {
  try {
    if ( chromiumBrowser ) {
      await chromiumBrowser.close ( )
      console.log ( "Chromium Browser Closed" )
    }
    if ( firefoxBrowser ) {
      await firefoxBrowser.close ( )
      console.log ( "Firefox Browser Closed" )
    }
  } catch ( err ) {
    console.error ( "Error closing browsers in @iqx-limited/quick-form:", err )
  }
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

// Export the browsers for use in other files
export { launchBrowsers, chromiumBrowser, firefoxBrowser };
