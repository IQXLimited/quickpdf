// Written by IQX Limited
// Date: 2024-11-06
// File: pdf2img.ts

import { CanvasFactory } from "../canvas.js" // Import custom canvas factory for rendering PDFs
import { getBuffer } from "../utilies.js" // Import utility function to get buffer from input
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs" // Import PDF.js for PDF document parsing (legacy mode for Node.js)
import { PngConfig, JpegConfig } from "canvas" // Import canvas image configuration for PNG and JPEG
import { fileTypeFromBuffer } from "file-type" // Import to determine the file type from a buffer
import { DocumentInitParameters } from "pdfjs-dist/types/src/display/api.js"
import { fileURLToPath } from "url"
import { resolve, dirname, join, sep } from "path"

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
   * - defaults to `image/png`
   * @param {object} [buffer] - Optional configuration for output image format and quality (PNG or JPEG).
   * @param {string} [buffer.mime] - The MIME type of the output image (either `image/png` or `image/jpeg`).
   * @param {PngConfig | JpegConfig} [buffer.options] - The options for the respective image type.
   */
  buffer?:
    | { mime: "image/png"; options: PngConfig } // PNG configuration options
    | { mime: "image/jpeg"; options: JpegConfig } // JPEG configuration options
}

// Create an instance of the custom canvas factory
const canvasFactory = new CanvasFactory ( )

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

  // Set up options for rendering the PDF document
  const newoptions: DocumentInitParameters = {
    password: options.password ?? undefined, // Set the password for encrypted PDFs if provided
    standardFontDataUrl: join ( pdfjsPath, `standard_fonts${sep}`),
    cMapUrl: join ( pdfjsPath, `cmaps${sep}` ),
    isEvalSupported: false, // Disable eval support
    data: Uint8Array.from ( buffer ) // Convert the buffer to a Uint8Array for PDF.js
  }

  // Load the PDF document
  const pdfDocument = await getDocument ( newoptions ).promise

  // Get the metadata of the PDF document
  const metadata = await pdfDocument.getMetadata ( )

  const pages = [ ] // Array to store the rendered pages as images
  // Loop through each page in the PDF
  for ( let i = 1; i <= pdfDocument.numPages; i++ ) {
    pages.push ( await getPage ( i ) ) // Render each page and add it to the pages array
  }

  // Function to render a specific page of the PDF
  async function getPage ( pageNumber: number ) {
    const page = await pdfDocument.getPage ( pageNumber )

    // Get the viewport for the page based on the scale option
    const viewport = page.getViewport ( { scale: options.scale ?? 1 } )

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

    // Convert the canvas to a buffer in the desired image format (JPEG or PNG)
    if ( options.buffer?.mime === "image/jpeg" ) {
      return canvas.toBuffer ( "image/jpeg", options.buffer.options ) // Return JPEG buffer
    } else {
      return canvas.toBuffer ( "image/png", options.buffer?.options ?? {
        resolution: 1920, // Set resolution for PNG by default
        compressionLevel: 0, // Set compression level to 0 (no compression)
        filters: canvas.PNG_FILTER_NONE // No filters for the PNG
      } ) // Return PNG buffer
    }
  }

  // Return the rendered pages and metadata
  return {
    length: pdfDocument.numPages, // Total number of pages in the PDF
    metadata: metadata.info, // PDF metadata
    pages // Array of rendered page buffers
  }
}
