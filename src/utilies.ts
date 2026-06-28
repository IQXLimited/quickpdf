// Written by IQX Limited
// Date: 2024-11-06
// File: utilies.ts

import { existsSync, readFileSync } from "fs"

/**
 * Checks if a URL hostname points to a private, loopback, or link-local address.
 * Normalizes formats and blocks unauthorized protocols like file:// to prevent SSRF.
 */
export const isSsrfSafe = ( urlString: string ): boolean => {
  try {
    const url = new URL ( urlString )

    // Only allow specific protocols
    if ( ![ "http:", "https:", "data:", "blob:", "about:" ].includes ( url.protocol ) ) {
      return false
    }

    // Pass-through for non-network protocols
    if ( [ "data:", "blob:", "about:" ].includes ( url.protocol ) ) {
      return true
    }

    const hostname = url.hostname.toLowerCase ( )

    // Block localhost names
    if ( hostname === "localhost" || hostname.endsWith ( ".localhost" ) || hostname === "[::1]" ) {
      return false
    }

    // Node.js URL normalizes dword/hex/octal to standard dotted quads
    const ipv4Regex = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.|0\.)/
    if ( ipv4Regex.test ( hostname ) ) {
      return false
    }

    // Block IPv6 mapped IPv4 and internal IPv6
    // eslint-disable-next-line max-len
    if ( hostname.startsWith ( "[fc" ) || hostname.startsWith ( "[fd" ) || hostname.startsWith ( "[fe8" ) || hostname.startsWith ( "[fe9" ) || hostname.startsWith ( "[fea" ) || hostname.startsWith ( "[feb" ) ) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Retrieves the buffer of a file from a file path or URL.
 *
 * This function will first check if the input is already a Buffer. If it's a string or URL, it will attempt
 * to fetch the file. If the file is not found through HTTP requests, it will attempt to read the file locally.        
 *
 * @param {string | URL | Buffer} input - The input can be a file path (string), URL, or a Buffer.
 * @returns {Promise<Buffer>} A promise that resolves to the file's content as a Buffer.
 * @throws {Error} If the file is not found or cannot be fetched.
 */
export async function getBuffer ( input: string | URL | Buffer ): Promise<Buffer> {
  if ( input instanceof Buffer ) {
    return input
  }

  const inputStr = input.toString ( )

  try {
    // Basic protocol check to avoid applying fetch to local paths
    if ( inputStr.startsWith ( "http://" ) || inputStr.startsWith ( "https://" ) ) {
      if ( !isSsrfSafe ( inputStr ) ) {
        throw new Error ( "Access Denied: URL is restricted due to SSRF protection" )
      }
      const res = await fetch ( inputStr )
      if ( res.ok ) {
        const array = await res.arrayBuffer ( )
        return Buffer.from ( array )
      } else {
        throw new Error ( "Failed to Fetch the File" )
      }
    } else {
      throw new Error ( "Not an HTTP URL" ) // Fallback to local file read
    }
  } catch ( err: any ) {
    if ( err.message === "Access Denied: URL is restricted due to SSRF protection" ) {
      throw err
    }
    if ( existsSync ( inputStr ) ) {
      return readFileSync ( inputStr )
    }
    throw new Error ( "Failed to Fetch the File" )
  }
}

/**
 * Fetches the HTML content from a URL.
 *
 * @param {string} url - The URL from which the HTML content is to be fetched.
 * @returns {Promise<string>} A promise that resolves to the HTML content of the URL.
 * @throws {Error} If the content cannot be fetched from the given URL.
 */
export const fetchHtmlFromUrl = async ( url: string ) => {
  if ( !isSsrfSafe ( url ) ) {
    throw new Error ( "Access Denied: URL is restricted due to SSRF protection" )
  }
  const response = await fetch ( url )
  if ( !response.ok ) {
    throw new Error ( `Failed to fetch content from URL: ${url}` )
  }
  return await response.text ( )
}

/**
 * Reads the HTML content from a file at a given path.
 *
 * @param {string} filePath - The file path from which to read the HTML content.
 * @returns {Promise<string>} A promise that resolves to the HTML content of the file.
 * @throws {Error} If the file cannot be read.
 */
export const readHtmlFromFilePath = async ( filePath: string ) => {
  return readFileSync ( filePath, "utf-8" )
}