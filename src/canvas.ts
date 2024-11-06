/**
 * File: canvas.ts
 * Author: IQX Limited
 * Date: 2024-11-05
 */

import { Canvas } from "canvas"

export class CanvasFactory {
  /**
   * Creates a new canvas and 2D rendering context with specified dimensions.
   * Optionally clears the canvas if transparency is required.
   *
   * @param width - The width of the canvas in pixels.
   * @param height - The height of the canvas in pixels.
   * @param transparent - Whether the canvas background should be transparent.
   * @returns An object containing the created canvas and its 2D rendering context.
   * @throws Will throw an error if width or height is non-positive.
   */
  public create ( width: number, height: number, transparent: boolean ) {
    if ( width <= 0 || height <= 0 ) {
      throw new Error ( "Invalid canvas size" )
    }

    const canvas = new Canvas ( width, height )
    const context = canvas.getContext ( "2d" )

    if ( transparent ) {
      context.clearRect ( 0, 0, width, height )
    }

    return {
      canvas,
      context
    }
  }

  /**
   * Resets the dimensions of an existing canvas.
   *
   * @param canvas - The canvas to reset.
   * @param width - The new width of the canvas in pixels.
   * @param height - The new height of the canvas in pixels.
   * @throws Will throw an error if width or height is non-positive.
   */
  public reset ( canvas: Canvas, width: number, height: number ) {
    if ( width <= 0 || height <= 0 ) {
      throw new Error ( "Invalid canvas size" )
    }

    canvas.width = width
    canvas.height = height
  }
}
