// Written by IQX Limited
// Date: 2024-11-06
// File: utilies.ts

import { existsSync, readFileSync } from "fs"

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

  return fetch ( input.toString ( ) )
    .then ( res => {
      if ( res.ok ) {
        return res.arrayBuffer ( )
      } else {
        console.error ( "ERROR: Failed to Fetch the File" )
        process.exit ( 1 )
      }
    } )
    .then ( array => Buffer.from ( array ) )
    .catch ( ( ) => {
      if ( existsSync ( input.toString ( ) ) ) {
        return readFileSync ( input.toString ( ) )
      } else {
        console.error ( `ERROR: '${input.toString ( )}' Not Found` )
        process.exit ( 1 )
      }
    } )
}

/**
 * Fetches the HTML content from a URL.
 *
 * @param {string} url - The URL from which the HTML content is to be fetched.
 * @returns {Promise<string>} A promise that resolves to the HTML content of the URL.
 * @throws {Error} If the content cannot be fetched from the given URL.
 */
export const fetchHtmlFromUrl = async ( url: string ) => {
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