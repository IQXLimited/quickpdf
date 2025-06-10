import { satisfies } from "semver"

const requiredVersion = ">=20.0.0"

if ( !satisfies ( process.version, requiredVersion ) ) {
  console.error (
    `\nError: Node.js version ${requiredVersion} is required. You are using ${process.version}.\n`
  )
  process.exit ( 1 )
}

export * from "./modules/pdf2img.js"

export * from "./modules/img2pdf.js"

export * from "./modules/html2pdf.js"

export { launchBrowser, closeBrowser } from "./browsers.js"