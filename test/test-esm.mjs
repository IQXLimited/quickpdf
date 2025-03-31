// TODO:
// 1. Test Sequential Calls to the Same Browser

import { mkdirSync, statSync, writeFileSync } from "fs"
import { rm, writeFile } from "fs/promises"
import { dirname, resolve } from "path"
import { html2pdf, img2pdf, pdf2img } from "../dist/index.mjs"
import { fileURLToPath } from "url"

const __dirname = dirname ( fileURLToPath ( import.meta.url ) )
const testAssetsDir = resolve ( __dirname, "./test-assets" )

const isDirectory = ( dirPath ) => {
  try {
    const stats = statSync ( dirPath )
    return stats.isDirectory ( )
  } catch ( err ) {
    return false
  }
}

// Create the test-assets directory if it doesn't exist
if ( !isDirectory ( testAssetsDir ) ) {
  mkdirSync ( testAssetsDir )
}

const runTests = async ( ) => {
  try {
    const pdf = "https://www.orimi.com/pdf-test.pdf"

    const pdf2imgResult = await pdf2img ( pdf )
    let index = 1
    for ( const page of pdf2imgResult.pages ) {
      writeFileSync ( resolve ( testAssetsDir, `pdf-2-img-${index}.png` ), page )
      index++
    }
    console.log ( "PDF to Image Conversion Successful (ESM)" )

    const img2pdfResult = await img2pdf ( pdf2imgResult.pages [ 0 ], {
      header: "Header",
      footer: "Footer"
    } )
    await writeFile ( resolve ( testAssetsDir, "img-2-pdf.pdf" ), img2pdfResult )
    console.log ( "Image to PDF Conversion Successful (ESM)" )

    const html2pdfResult = await html2pdf ( "<h1>Hello World</h1>" )
    await writeFile ( resolve ( testAssetsDir, "html-to-pdf.pdf" ), html2pdfResult )
    console.log ( "HTML to PDF Conversion Successful (ESM)" )
  } catch ( error ) {
    console.error ( "Error during ESM tests:", error )
  } finally {
    // Clean up the test-assets directory after the tests
    await rm ( testAssetsDir, { force: true, recursive: true } )
    process.exit ( 0 )
  }
}

console.log ( "Testing (ESM)..." )
runTests ( )