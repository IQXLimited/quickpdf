// Written by IQX Limited
// Date: 2024-11-06
// File: pdf2img.ts

const originalLog = console.log
console.log = function ( message, ...args ) {
  if (
    message &&
    (
      message ===
      `Warning: applyPath2DToCanvasRenderingContext: "TypeError: Cannot assign to read only property 'clip' of object '#<CanvasRenderingContext2D>'".`
    )
  ) {
    return // This warning is expected and can be ignored
  }

  // Otherwise, log the warning as usual
  originalLog.apply ( console, [ message, ...args ] )
}

import { CanvasFactory } from "../canvas.js" // Import custom canvas factory for rendering PDFs
import { getBuffer } from "../utilies.js" // Import utility function to get buffer from input
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs" // Import PDF.js for PDF document parsing (legacy mode for Node.js)
import { fileTypeFromBuffer } from "file-type" // Import to determine the file type from a buffer
import { DocumentInitParameters } from "pdfjs-dist/types/src/display/api.js"
import { fileURLToPath } from "url"
import { resolve, dirname, join, sep } from "path"
import sharp from "sharp"

const __filename = fileURLToPath ( import.meta.url )
const __dirname = dirname ( __filename )

// Options type for customizing the image conversion process
type Options = {
  /**
   * - defaults to `1`. If you want high-resolution images, increase this
   * @param {number} [scale] - Scaling factor for rendering the PDF pages. Default is 1.
   */
  scale?: number
  /**
   * - For decrypting password-protected PDFs.
   * @param {string} [password] - Optional password for decrypting password-protected PDFs.
   */
  password?: string
  /**
   * - For converting the rendered image to a specific format.
   * @param {"image/png" | "image/jpeg"} [mime] - Optional buffer configuration for the image format (PNG or JPEG).
   */
  mime?: "image/png" | "image/jpeg" | "image/webp"
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
  // Retrieve the buffer from the input PDF
  const buffer = await getBuffer ( input )

  // Validate that the input is a PDF file
  const type = await fileTypeFromBuffer ( buffer )
  if ( type?.mime !== "application/pdf" ) {
    console.error ( `ERROR: Provided File is not a PDF.` )
    process.exit ( 1 ) // Exit if the file is not a valid PDF
  }

  // Get the path to the PDF.js package
  const pdfjsPath = resolve ( __dirname, "..", "..", "node_modules", "pdfjs-dist" )

  // Create an instance of the custom canvas factory
  const canvasFactory = new CanvasFactory ( )

  // Set up options for rendering the PDF document
  const newoptions: DocumentInitParameters = {
    password: options.password ?? undefined, // Set the password for encrypted PDFs if provided
    standardFontDataUrl: join ( pdfjsPath, `standard_fonts${sep}` ), // Path to the predefined standard fonts
    cMapUrl: join ( pdfjsPath, `cmaps${sep}` ), // Path to the predefined character maps
    isEvalSupported: false, // Disable eval support
    CanvasFactory: CanvasFactory, // Use the custom canvas factory for rendering
    verbosity: 0, // Disable logging
    data: Uint8Array.from ( buffer ) // Convert the buffer to a Uint8Array for PDF.js
  }

  // Load the PDF document
  const pdfDocument = await getDocument ( newoptions ).promise

  // Get the metadata of the PDF document
  const metadata: any = await pdfDocument.getMetadata ( )

  const pages = [ ] // Array to store the rendered pages as images
  // Loop through each page in the PDF
  for ( let i = 1; i <= pdfDocument.numPages; i++ ) {
    pages.push ( await getPage ( i ) ) // Render each page and add it to the pages array
  }

  // Function to render a specific page of the PDF
  async function getPage ( pageNumber: number ) {
    const page = await pdfDocument.getPage ( pageNumber )

    // Get the viewport for the page based on the scale option
    const viewport = page.getViewport ( { scale: options.scale ?? 300 / 72 } ) // Default scale is 300 DPI

    // Create the canvas for rendering the page
    const { canvas, context } = canvasFactory.create (
      viewport.width,
      viewport.height,
      true
    )

    // Render the page onto the canvas
    await page.render ( {
      canvasContext: context as any, // Use the canvas context for rendering
      viewport // Set the viewport for the rendering
    } ).promise

    const quality = options.mime === "image/png" ? undefined : 100 // Set quality for JPEG images
    let imageBuffer: Buffer | undefined = undefined // Create a buffer to store the canvas image
    if ( options.mime ) {
      if ( options.mime === "image/png" ) {
        imageBuffer = canvas.toBuffer ( "image/png" ) // Convert the canvas to a buffer
      } else {
        imageBuffer = canvas.toBuffer ( options.mime!, quality ) // Convert the canvas to a buffer
      }
    } else {
      imageBuffer = canvas.toBuffer ( "image/png" ) // Convert the canvas to a buffer
    }

    const processedBuffer = await sharp ( imageBuffer )
      .toFormat ( options.mime === "image/jpeg" ? "jpeg" : "png" ) // Convert to JPEG or PNG
      .toBuffer ( ) // Return the processed buffer

    return processedBuffer // Return the rendered page buffer
  }

  // Return the rendered pages and metadata
  return {
    length: pdfDocument.numPages, // Total number of pages in the PDF
    metadata: metadata.info, // PDF metadata
    pages // Array of rendered page buffers
  }
}
