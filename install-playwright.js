import { existsSync } from "fs"
import { execSync } from "child_process"
import { join } from "path"
import { homedir } from "os"

// Path to the Playwright cache directory
const playwrightCacheDir = join ( homedir ( ), ".cache", "ms-playwright" )

// Check if Chrome is installed
if ( !existsSync ( playwrightCacheDir ) ) {
  console.log ( "Playwright cache does not exist in your home directory. Installing Chromium Shell..." )
  execSync ( "npx playwright install --with-deps --only-shell chromium", { stdio: "inherit" } )
}