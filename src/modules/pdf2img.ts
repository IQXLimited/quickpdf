// Written by IQX Limited
// Date: 2024-11-06
// File: pdf2img.ts

import { getBuffer } from "../utilies.js" // Import utility function to get buffer from input
import { fileTypeFromBuffer } from "file-type" // Import to determine the file type from a buffer
import { fileURLToPath, pathToFileURL } from "url"
import { resolve, dirname } from "path"
import puppeteer, { ScreenshotOptions } from "puppeteer"
import { writeFile, readFile, unlink } from "fs/promises"

const __filename = fileURLToPath ( import.meta.url )
const __dirname = dirname ( __filename )

// Options type for customizing the image conversion process
type Options = {
  /**
   * - defaults to `1`. If you want high-resolution images, increase this
   * @param {number} [quality] - Scaling factor for rendering the PDF pages. Default is 1.
   */
  quality?: number
  /**
   * - For decrypting password-protected PDFs.
   * @param {string} [password] - Optional password for decrypting password-protected PDFs.
   */
  password?: string
  /**
   * - For converting the rendered image to a specific format.
   * @param {"png" | "jpeg" | "webp"} [type] - Optional buffer configuration for the image format (PNG or JPEG).
   */
  type?: "png" | "jpeg" | "webp"
}

/**
 * Converts a PDF file into image format (PNG or JPEG).
 *
 * @param {Buffer | string | URL} input - The input PDF file in buffer, file path, or http url (as a string or URL).
 * @param {Options} options - Optional configuration for scaling and image format.
 * @returns {Promise<Buffer[]>} An array of buffers representing the images generated from each PDF page.
 * @throws {Error} If the input is not a valid PDF or if an error occurs during conversion.
 */
export const pdf2img = async (
  input: Buffer | string | URL, // Input can be a PDF file (buffer, string path, or URL)
  options: Options = { } // Options for scaling, password decryption, and image format
) => {
  const browser = await puppeteer.launch ( {
    browser: "firefox",
    headless: true,
  } )
  const page = await browser.newPage ( )

  let path: string = ""
  let buffer: Buffer = Buffer.from ( "" )
  let tempFile: boolean = false

  if ( Buffer.isBuffer ( input ) ) {
    buffer = input
    path = resolve ( __dirname, "temp.pdf" )
    tempFile = true
    await writeFile ( path, buffer )
  } else {
    if ( typeof input === "string" && input.startsWith ( "http" ) ) {
      path = input
      buffer = await getBuffer ( path )
    } else {
      path = pathToFileURL ( resolve ( input.toString ( ) ) ).toString ( )
      buffer = await readFile ( path )
    }
  }

  // Determine the file type from the buffer
  const fileType = await fileTypeFromBuffer ( buffer )
  if ( !fileType || fileType.ext !== "pdf" ) {
    throw new Error ( "Invalid PDF file" )
  }

  await page.goto ( path, {
    waitUntil: "networkidle0"
  } )

  try {
    // Wait for the password prompt (if it appears)
    await page.waitForSelector ( 'input[type="password"]', {
      visible: true,
      timeout: 5000
    } )

    // Type the password if prompted
    console.log ( "Password prompt detected, entering password..." )
    await page.type ( 'input[type="password"]', options.password || "" )
    await page.keyboard.press ( "Enter" )
  } catch ( error ) {
    // If no password prompt is found, assume the PDF is accessible without a password
    console.log ( "No password prompt, continuing with unlocked PDF..." )
  }

  const imageBuffers = [ ]

  const pageCount = await page.evaluate ( ( ) => {
    if ( ( window as any ).PDFViewerApplication ) {
      return ( window as any ).PDFViewerApplication.pagesCount
    }
    return 0
  } )

  const metadata = await page.evaluate ( ( ) => {
    const app = ( window as any ).PDFViewerApplication
    if ( app && app.pdfDocument ) {
      return app.documentInfo ?? { }
    }
    return { }
  } )

  // Dynamically calculate the size of the PDF content
  const pdfDimensions = await page.evaluate ( ( ) => {
    const canvas: any = document.querySelector ( "canvas" ) // Assuming the PDF is rendered on a canvas
    const { width, height } = canvas.getBoundingClientRect ( )
    return { width, height }
  } )

  // Set the viewport to match the size of the PDF content
  await page.setViewport ( {
    width: pdfDimensions.width,
    height: pdfDimensions.height
  } )

  for ( let i = 1; i <= pageCount; i++ ) {
    // Navigate to each page in the PDF (if necessary, depends on how PDF is rendered)
    await page.evaluate ( ( pageNum ) => {
      if ( ( window as any ).PDFViewerApplication ) {
        ( window as any ).PDFViewerApplication.page = pageNum
      }
    }, i )

    // Get the bounding box of the .page element
    const pageBoundingBox = await page.evaluate ( ( ) => {
      const pageElement: any = document.querySelector ( ".canvasWrapper" )
      const { x, y, width, height } = pageElement.getBoundingClientRect ( )
      return { x, y, width, height }
    } )

    const screenshotOptions: ScreenshotOptions = {
      fullPage: false, // Capture only the viewport
      type: options.type ?? "png", // Set the image format
      clip: {
        x: pageBoundingBox.x,
        y: pageBoundingBox.y,
        width: pageBoundingBox.width,
        height: pageBoundingBox.height
      } // Capture only the content
    }

    if ( options.type && options.type !== "png" ) {
      screenshotOptions.quality = options.quality ?? 100
    }

    // Take a screenshot of the current page
    imageBuffers.push ( await page.screenshot ( screenshotOptions ) )
  }

  if ( tempFile ) {
    await unlink ( path )
  }

  await browser.close ( )

  // Return the rendered pages and metadata
  return {
    length: pageCount, // Total number of pages in the PDF
    metadata: metadata.info, // PDF metadata
    pages: imageBuffers // Array of rendered page buffers
  }
}
