const { html2pdf, img2pdf, pdf2img, launchBrowser } = require ( "../dist/index.cjs" )
const { mkdirSync, statSync, readFileSync } = require ( "fs" )
const { rm, writeFile } = require ( "fs/promises" )
const { resolve } = require ( "path" )

const testAssetsDir = resolve ( __dirname, "./test-assets" )

const isDirectory = ( dirPath ) => {
  try {
    const stats = statSync ( dirPath )
    return stats.isDirectory ( )
  } catch {
    return false
  }
}

// Create the test-assets directory if it doesn't exist
if ( !isDirectory ( testAssetsDir ) ) {
  mkdirSync ( testAssetsDir )
}

const runTests = async ( ) => {
  try {
    // Use browserless/chrome for testing
    // await launchBrowser ( "chrome", "ws:localhost:3000" )
    const pdf = "https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf"

    const pdf2imgResult = await pdf2img ( pdf )
    let index = 1
    for ( const page of pdf2imgResult.pages ) {
      await writeFile ( resolve ( testAssetsDir, `pdf-2-img-${index}.png` ), page )
      index++
    }
    console.log ( "PDF to Image Conversion Successful (CommonJS)" )

    const img2pdfResult = await img2pdf ( pdf2imgResult.pages [ 0 ], {
      header: "Header",
      footer: "Footer"
    } )
    await writeFile ( resolve ( testAssetsDir, "img-2-pdf.pdf" ), img2pdfResult )
    console.log ( "Image to PDF Conversion Successful (CommonJS)" )

    const html = await html2pdf ( readFileSync ( resolve ( __dirname, "./test-pdf.html" ), "utf-8" ) )
    await writeFile ( resolve ( testAssetsDir, "html-to-pdf.pdf" ), html )
    console.log ( "HTML to PDF Conversion Successful (CommonJS)" )
  } catch ( error ) {
    console.error ( "An error occurred during the tests:", error )
  } finally {
    // Clean up the test-assets directory after the tests
    await rm ( testAssetsDir, { force: true, recursive: true } )
    process.exit ( 0 )
  }
}

console.log ( "Testing (CommonJS)..." )
runTests ( )