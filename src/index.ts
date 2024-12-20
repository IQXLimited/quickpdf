import { satisfies } from "semver"
import { launchBrowsers } from "./browsers.js"

const requiredVersion = ">=22.0.0"

if ( !satisfies ( process.version, requiredVersion ) ) {
  console.error (
    `\nError: Node.js version ${requiredVersion} is required. You are using ${process.version}.\n`
  )
  process.exit ( 1 )
}

await launchBrowsers ( )

export * from "./modules/pdf2img.js"

export * from "./modules/img2pdf.js"

export * from "./modules/html2pdf.js"