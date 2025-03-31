// Written by IQX Limited
// Date: 2024-11-06
// File: pdf2img.ts

import { pathToFileURL } from "url"
import { resolve } from "path"
import { Browser, Page, ScreenshotOptions } from "puppeteer"
import { writeFile, unlink } from "fs/promises"
import { launchBrowser } from "../browsers"

const pagePoolSize = 5
const RESOURCE_LIMIT = 100 // Maximum allowed resources
let resourceCount = 0
let pagePool: Page [ ] = [ ]
let browser: Browser | null = null

async function launchPages ( ) {
  if ( pagePool.length > 0 ) {
    return pagePool
  }

  pagePool = await Promise.all ( Array.from ( { length: pagePoolSize }, async ( ) => {
    if ( browser ) {
      const page = await browser.newPage ( )
      await page.setRequestInterception ( true )
      await page.setDefaultNavigationTimeout ( 10000 ) // 10 seconds
      await page.goto ( "about:blank" ) // Load a blank page
      page.on ( "request", request => {
        resourceCount++
        if ( resourceCount > RESOURCE_LIMIT ) {
          page.reload ( ) // Reload the page when limit is exceeded
          resourceCount = 0 // Reset the counter
        } else {
          request.continue ( )
        }
      } )
      return page
    } else {
      throw new Error ( "Browser not available" )
    }
  } ) )
  return pagePool
}

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
  browser = await launchBrowser ( "firefox" )

  if ( !browser?.connected ) {
    throw new Error ( "Browser not available" )
  }

  const pagePool = await launchPages ( )

  let page = pagePool.pop ( )
  let tempPage = false
  if ( !page ) {
    tempPage = true
    page = await browser.newPage ( )
  }

  let path: string = ""
  let address: string = ""
  let tempFile: boolean = false

  if ( Buffer.isBuffer ( input ) ) {
    path = resolve ( process.cwd ( ), "temp.pdf" )
    address = pathToFileURL ( path ).toString ( )
    tempFile = true
    await writeFile ( path, input )
  } else {
    if ( typeof input === "string" && input.startsWith ( "http" ) ) {
      path = input
      address = path
    } else {
      path = resolve ( input.toString ( ) )
      address = pathToFileURL ( path ).toString ( )
    }
  }

  try {
    await page.goto ( address )

    if ( options.password ) {
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
      } catch { }
    }

    await page.waitForSelector ( "canvas", { timeout: 5000 } )
    await page.waitForSelector ( ".loadingIcon", {
      timeout: 5000,
      hidden: true
    } )

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
      height: pdfDimensions.height,
      deviceScaleFactor: 1
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
        const pageElement: any = document.querySelector ( "canvas" )
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

      const uint8array = await page.screenshot ( screenshotOptions )

      // Take a screenshot of the current page
      imageBuffers.push ( Buffer.from ( uint8array ) )
    }

    if ( tempFile ) {
      await unlink ( path )
    }

    if ( tempPage ) {
      page.close ( )
    } else {
      await page.setViewport ( {
        width: 800,
        height: 600,
        deviceScaleFactor: 1
      } )
      pagePool.push ( page )
    }

    // Return the rendered pages and metadata
    return {
      length: pageCount, // Total number of pages in the PDF
      metadata: metadata.info, // PDF metadata
      pages: imageBuffers // Array of rendered page buffers
    }
  } catch ( error ) {
    if ( tempFile ) {
      await unlink ( path )
    }

    if ( tempPage ) {
      page.close ( )
    } else {
      await page.setViewport ( {
        width: 800,
        height: 600,
        deviceScaleFactor: 1
      } )
      pagePool.push ( page )
    }

    throw error
  }
}
