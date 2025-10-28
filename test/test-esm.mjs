import { mkdirSync, statSync, writeFileSync, readFileSync } from "fs"
import { rm, writeFile } from "fs/promises"
import { dirname, resolve } from "path"
import { html2pdf, img2pdf, pdf2img, closeBrowser } from "../dist/index.mjs"
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
    const pdf = "https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf"

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

    const testFile = readFileSync ( resolve ( __dirname, "./test-pdf.html" ), "utf-8" )
    const html = await html2pdf ( testFile )
    await writeFile ( resolve ( testAssetsDir, "html-to-pdf.pdf" ), html )
    console.log ( "HTML to PDF Conversion Successful (ESM)" )

    console.log("Starting stress test... (20 attempts)")

    const attempts = 20
    for (let i = 0; i < attempts; i++) {
      try {
        const html = await html2pdf ( testFile )
        await writeFile ( resolve ( testAssetsDir, `stress-test-${i}.pdf` ), html )
      } catch ( error ) {
        console.error ( `html2pdf failed on attempt ${i}`, error )
      }
    }

    console.log("Stress Test Successful (ESM)")
    console.log("Starting parallel conversion tests... (10 parallel conversions)")

    const parallel = Array.from ( { length: 10 } ).map ( ( _, i ) =>
      html2pdf ( testFile )
        .then ( result => writeFile ( resolve ( testAssetsDir, `parallel-${i}.pdf` ), result ) )
        .catch ( error => console.error ( `Parallel conversion ${i} failed`, error ) )
    )
    await Promise.all ( parallel )
    console.log ( "Parallel Conversion Tests Successful (ESM)" )
  } catch ( error ) {
    console.error ( "Error during ESM tests:", error )
  } finally {
    // Clean up the test-assets directory after the tests
    await rm ( testAssetsDir, { force: true, recursive: true } )
    await closeBrowser ( )
    process.exit ( 0 )
  }
}

console.log ( "Testing (ESM)..." )
runTests ( )