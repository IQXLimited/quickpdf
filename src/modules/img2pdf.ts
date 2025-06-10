// Written by IQX Limited
// Date: 2024-11-06
// File: img2pdf.ts

import { imageSize } from "image-size" // Import to get image dimensions
import PDFDocument from "pdfkit" // Import PDFKit for PDF document generation
import { getBuffer } from "../utilies.js" // Import custom utility function to retrieve buffer from input
import { closeBrowser } from "../browsers.js"

type Options = {
  /**
   * - Header of the PDF
   * @param {string} [header] - Optional header text to be included in the PDF.
   */
  header?: string
  /**
   * - Footer of the PDF
   * @param {string} [footer] - Optional footer text to be included in the PDF.
   */
  footer?: string
  /**
   * - Font Size of the Header and Footer
   * @param {number} [fontSize] - Optional font size for the header and footer text. Default is 10.
   */
  fontSize?: number
  /**
   * - If true, the browser will be closed after conversion.
   * @param {boolean} [closeBrowser] - Optional flag to close the browser after conversion. Default is false.
   */
  closeBrowser?: boolean
}

/**
 * Converts an image to PDF format.
 *
 * @param {Buffer | string | URL} input - The input image as a buffer, file path, or http url (as string or URL).
 * @param {Options} options - Optional configuration for the PDF (header, footer, font size).
 * @returns {Promise<Buffer>} The generated PDF as a buffer.
 * @throws {Error} If the file is not a valid image (JPEG/PNG).
 */
export const img2pdf = async (
  input: Buffer | string | URL, // Image input in the form of a buffer, file path, or URL
  options: Options = {} // Optional settings for header, footer, and font size
) => {
  const { fileTypeFromBuffer } = await import ( "file-type" ) // Import to detect the file type from a buffer
  return new Promise<Buffer> ( ( resolve, reject ) => {
    getBuffer ( input ).then ( async ( buf ) => {
      const type = await fileTypeFromBuffer ( buf ) // Detect the file type of the image
      if ( type?.mime !== "image/jpeg" && type?.mime !== "image/png" ) {
        throw new Error ( "Provided File is not a JPEG or a PNG." ) // Throw an error if the file is not a valid image type
      }

      const pdfBuffers: any[] = [] // Array to store PDF buffers
      const imgSize = imageSize ( buf ) // Get image dimensions
      const landscape = imgSize.width && imgSize.height ? imgSize.width > imgSize.height : false // Determine if the image is landscape

      const doc = new PDFDocument ( {
        size: "a4",
        layout: landscape ? "landscape" : "portrait", // Set the layout based on image orientation
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        }
      } )

      doc.on ( "data", ( data ) => {
        pdfBuffers.push ( data ) // Collect PDF data as it's being generated
      } )

      doc.on ( "end", () => {
        resolve ( Buffer.concat ( pdfBuffers ) ) // Return the concatenated PDF buffer when done
      } )

      doc.fontSize ( options.fontSize ?? 10 ) // Set font size for header and footer

      const topMargin = options.header ? 20 : 0 // Adjust the top margin if a header is provided
      const bottomMargin = options.footer ? 20 : 0 // Adjust the bottom margin if a footer is provided
      const sidePadding = 20 // Set the side padding for header/footer
      const imageHeight = doc.page.height - topMargin - bottomMargin // Calculate available space for the image

      if ( options.header ) { // Place the header if provided
        doc.text ( options.header, sidePadding, topMargin / 2 - 6, {
          align: "center",
          baseline: "top",
          width: doc.page.width - 2 * sidePadding,
          height: topMargin - 5,
          ellipsis: true
        } ).moveDown ( 0.5 )
      }

      doc.image ( buf, 0, topMargin, {
        width: doc.page.width,
        height: imageHeight
      } ) // Place the image on the PDF

      if ( options.footer ) { // Place the footer if provided
        doc.text ( options.footer, sidePadding, doc.page.height - bottomMargin / 2 - 6, {
          align: "center",
          width: doc.page.width - 2 * sidePadding,
          height: bottomMargin - 5,
          ellipsis: true
        } )
      }

      doc.end () // Finalize the PDF generation
    } ).catch ( ( e ) => {
      reject ( e ) // Reject if an error occurs during image processing
    } ).finally ( async ( ) => {
      if ( options.closeBrowser ) {
        await closeBrowser ( ) // Close the browser if specified in options
      }
    } )
  } )
}
