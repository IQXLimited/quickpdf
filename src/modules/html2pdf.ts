// Written by IQX Limited
// Date: 2024-11-06
// File: html2pdf.ts

import { existsSync } from "fs" // Import function to check if a file exists
import { HtmlValidate } from "html-validate/node" // Import the HTML validation library
import { fetchHtmlFromUrl, readHtmlFromFilePath } from "../utilies.js" // Import custom utility functions to fetch HTML from URL or file path
import type { Report } from "html-validate"
import { closeBrowser, launchBrowser, getPage, restorePage } from "../browsers.js"

export type Options = {
  /**
   * - PDF should be returned as a base64 string
   * @param {boolean} [base64] - Optional flag to return the PDF as a base64 string.
   */
  base64?: boolean
  /**
   * - Validation rules for HTML
   * @param {object} [rules] - Optional custom validation rules for HTML content - see https://html-validate.org/rules/ for more details.
   */
  rules?: object
  /**
   * - Enable HTML validation
   * @param {boolean} [validation] - Optional flag to enable HTML validation (default is true).
   */
  validation?: boolean
  /**
   * - If true, the browser will be closed after conversion.
   * @param {boolean} [closeBrowser] - Optional flag to close the browser after conversion. Default is false.
   */
  closeBrowser?: boolean
}

/**
 * Converts an HTML string or URL to a PDF.
 *
 * @param {string | URL} input - The HTML content as a string, or a URL/File Path as a string or URL to be converted to PDF.
 * @returns {Promise<Buffer>} The generated PDF as a buffer.
 * @throws {Promise<Error>} If the HTML is invalid, an error is thrown with validation details.
 */
export const html2pdf = async (
  input: string | URL, // HTML input as a string, URL, or file path
  options: Options = { } // Optional flag to return the PDF as a base64 string
) => {
  const { browser, type } = await launchBrowser ( ) // Ensure the Firefox browser is launched

  const validator = new HtmlValidate ( options.rules ?? {
    extends: [ "html-validate:standard" ], // Use the standard HTML validation rules
    rules: {
      "no-trailing-whitespace": "off" // Disable no-trailing-whitespace rule to allow trailing whitespace
    }
  } ) // Initialize HTML validator

  let htmlContent = input.toString ( )

  // Fetch HTML content from URL if input is a URL
  if ( htmlContent.startsWith ( "http://" ) || htmlContent.startsWith ( "https://" ) ) {
    htmlContent = await fetchHtmlFromUrl ( htmlContent )
  }
  // Read HTML content from a file if input is a file path
  else if ( existsSync ( input ) ) {
    htmlContent = await readHtmlFromFilePath ( htmlContent )
  }

  if ( !browser?.connected ) {
    throw new Error ( "Browser not available" )
  }

  const page = await getPage ( type )

  const validation = ( options.validation ?? true ) // Enable HTML validation by default
  try {
    const res = validation ? await validator.validateString ( htmlContent ) : { valid: true }
    if ( res.valid ) {
      await page.setContent ( htmlContent, { waitUntil: "load" } ) // Set HTML content on the page and wait for it to load
      const pdf = await page.pdf ( {
        format: "A4",
        printBackground: true
      } ) // Generate PDF from the page content

      const pdfBuffer = Buffer.from ( pdf ) // Convert the PDF buffer to a Node.js buffer
      if ( options.base64 ?? false ) {
        return pdfBuffer.toString ( "base64" ) // Return the generated PDF as a base64 string
      }
      return pdfBuffer // Return the generated PDF as a buffer
    } else {
      // If HTML is invalid, throw a validation error with details
      throw {
        valid: false,
        count: {
          errors: ( res as Report ).errorCount,
          warnings: ( res as Report ).warningCount
        },
        validation: ( res as Report ).results.map ( res => {
          return {
            file: res.filePath,
            count: {
              errors: res.errorCount,
              warnings: res.warningCount
            },
            messages: res.messages.map ( msg => {
              return {
                message: msg.message,
                line: msg.line,
                column: msg.column,
                ruleId: msg.ruleId
              }
            } )
          }
        } )
      }
    }
  } finally {
    await restorePage ( type, page )
    if ( options.closeBrowser ) {
      await closeBrowser ( ) // Close the browser if specified in options
    }
  }
}
