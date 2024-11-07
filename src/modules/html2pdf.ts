// Written by IQX Limited
// Date: 2024-11-06
// File: html2pdf.ts

import { existsSync } from "fs" // Import function to check if a file exists
import { HtmlValidate } from "html-validate/node" // Import the HTML validation library
import { chromium } from "playwright" // Import Playwright for rendering HTML in a headless browser
import { fetchHtmlFromUrl, readHtmlFromFilePath } from "../utilies.js" // Import custom utility functions to fetch HTML from URL or file path

/**
 * Converts an HTML string or URL to a PDF.
 *
 * @param {string | URL} input - The HTML content as a string, or a URL/File Path as a string or URL to be converted to PDF.
 * @returns {Promise<Buffer>} The generated PDF as a buffer.
 * @throws {Promise<Error>} If the HTML is invalid, an error is thrown with validation details.
 */
export const html2pdf = async (
  input: string | URL, // HTML input as a string, URL, or file path
  base64?: boolean // Optional flag to return the PDF as a base64 string
) => {
  const validator = new HtmlValidate () // Initialize HTML validator

  let htmlContent = input.toString ()

  // Fetch HTML content from URL if input is a URL
  if ( htmlContent.startsWith ( "http://" ) || htmlContent.startsWith ( "https://" ) ) {
    htmlContent = await fetchHtmlFromUrl ( htmlContent )
  } 
  // Read HTML content from a file if input is a file path
  else if ( existsSync ( input ) ) {
    htmlContent = await readHtmlFromFilePath ( htmlContent )
  }

  return validator.validateString ( htmlContent ).then ( async ( res ) => {
    if ( res.valid ) {
      const browser = await chromium.launch () // Launch a browser instance using Playwright
      const page = await browser.newPage () // Create a new browser page
      await page.setContent ( htmlContent, { waitUntil: "load" } ) // Set HTML content on the page and wait for it to load
      const pdfBuffer = await page.pdf ( { format: "A4", printBackground: true } ) // Generate PDF from the page content
      await browser.close () // Close the browser instance
      if ( base64 ) {
        return pdfBuffer.toString ( "base64" ) // Return the generated PDF as a base64 string
      }
      return pdfBuffer // Return the generated PDF as a buffer
    } else {
      // If HTML is invalid, throw a validation error with details
      return Promise.reject (
        `Validation Error\n` +
          res.results
            .map ( ( result ) => {
              return (
                `File Path: ${result.filePath}\n` +
                result.messages
                  .map ( ( message ) => {
                    return `Message: ${message.message}\nLine: ${message.line}\nColumn: ${message.column}\nSource: ${result.source}`
                  } )
                  .join ( "\n" )
              )
            } )
            .join ( "\n" )
      )
    }
  } )
}
