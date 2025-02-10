import { satisfies } from "semver"
import { launchBrowsers, installBrowsers } from "./browsers.js"

const requiredVersion = ">=20.0.0"

if ( !satisfies ( process.version, requiredVersion ) ) {
  console.error (
    `\nError: Node.js version ${requiredVersion} is required. You are using ${process.version}.\n`
  )
  process.exit ( 1 )
}

installBrowsers ( ).then ( launchBrowsers ).catch ( e => {
  console.error ( "Puppeteer installation failed in @iqx-limited/quick-form:", e )
} )

export * from "./modules/pdf2img.js"

export * from "./modules/img2pdf.js"

export * from "./modules/html2pdf.js"

export { closeBrowsers, launchBrowsers } from "./browsers.js"