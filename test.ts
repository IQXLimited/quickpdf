import { mkdirSync, statSync, writeFileSync } from "fs"
import { rm, writeFile } from "fs/promises"
import { dirname, resolve } from "path"
import { html2pdf, img2pdf, pdf2img } from "src"
import { fileURLToPath } from "url"

const __filename = fileURLToPath ( import.meta.url )
const __dirname = dirname ( __filename )

/**
 * Checks if a directory exists.
 *
 * @param {string} dirPath - The path to the directory.
 * @returns {boolean} Returns true if the directory exists, false otherwise.
 */
const isDirectory = ( dirPath: string ): boolean => {
  try {
    const stats = statSync ( dirPath )
    return stats.isDirectory ( ) // Returns true if it's a directory
  } catch  ( err ) {
    return false // Directory doesn't exist or path is incorrect
  }
}

if ( !isDirectory ( resolve ( __dirname, "./test-assets" ) ) ) {
  mkdirSync ( resolve ( __dirname, "./test-assets" ) )
}

const pdf = "https://www.orimi.com/pdf-test.pdf"

pdf2img ( pdf )
.then ( async res => {
  let index = 1
  for ( const page of res.pages ) {
    writeFileSync ( resolve ( __dirname, `./test-assets/test-${index}.png` ), page )
    index++
  }
  console.log ( "PDF to Image Conversion Successful" )
} )
.then ( ( ) => {
  return img2pdf ( resolve ( __dirname, "./test-assets/test-1.png" ), {
    header: "Header",
    footer: "Footer"
  } )
} )
.then ( async res => {
  writeFile ( resolve ( __dirname, `./test-assets/test-img.pdf` ), res )
  console.log ( "Image to PDF Conversion Successful" )
} )
.then ( ( ) => {
  return html2pdf ( "<h1>Hello World</h1>" )
} )
.then ( async res => {
  writeFile ( resolve ( __dirname, `./test-assets/test-html.pdf` ), res )
  console.log ( "HTML to PDF Conversion Successful" )
} )
.catch ( e => {
  console.error ( e )
  process.exit ( 1 )
} )
.finally ( ( ) => {
  rm ( resolve ( __dirname, "./test-assets" ), {
    force: true,
    recursive: true
  } )
} )