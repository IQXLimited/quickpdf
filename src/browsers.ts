import puppeteer, { Browser } from "puppeteer"

let chrome: Browser | null = null
let firefox: Browser | null = null

async function getChromium ( ): Promise<Browser | null> {
  if ( chrome ) return chrome

  try {
    chrome = await puppeteer.launch ( {
      args: [ "--no-sandbox", "--disable-setuid-sandbox" ],  // Useful in certain environments (e.g., Docker)
    } )
  } catch ( err ) {
    console.error ( "Error launching Chromium browser in @iqx-limited/quick-form:", err )
  }

  return chrome
}

async function getFirefox ( ): Promise<Browser | null> {
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

  return firefox
}

// Function to close both browsers
async function closeBrowsers ( ): Promise<void> {
  try {
    if ( chrome ) {
      await chrome.close ( )
      chrome = null
      console.log ( "Chromium Browser Closed" )
    }
    if ( firefox ) {
      await firefox.close ( )
      firefox = null
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
export { getChromium, getFirefox, closeBrowsers }
