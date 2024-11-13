import { existsSync, rmSync } from "fs"
import { execSync } from "child_process"
import { join } from "path"
import { homedir } from "os"

// Path to the Playwright cache directory
const playwrightCacheDir = join ( homedir ( ), ".cache", "ms-playwright" )

// Function to check if Chrome is installed
function isChromeInstalled ( ) {
  try {
    // Command to check for Chrome across OS
    if ( process.platform === "win32" ) {
      // Possible installation paths for Chrome
      const possiblePaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // Default for 64-bit
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" // Default for 32-bit
      ]
      if ( possiblePaths.some ( path => existsSync ( path ) ) ) {
        return true
      } else {
        throw new Error ( "Chrome not found" )
      }
    } else {
      execSync ( "command -v google-chrome", { stdio: "ignore" } )
      console.log ( temp )
    }
    return true
  } catch ( e ) {
    console.error ( e )
    return false
  }
}

// Main logic
if ( isChromeInstalled ( ) ) {
  console.log ( "Google Chrome is installed. Skipping Playwright browser install..." )
} else {
  // Delete Playwright cache if it exists
  if ( existsSync ( playwrightCacheDir ) ) {
    console.log ( "Deleting existing Playwright cache..." )
    rmSync ( playwrightCacheDir, { recursive: true, force: true } )
  }
  console.log ( "Google Chrome is not installed. Installing Playwright browsers..." )
  execSync ( "npx playwright install", { stdio: "inherit" } )
}
