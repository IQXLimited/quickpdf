// Written by IQX Limited
// Date: 2024-11-06
// File: canvas.ts

import { Canvas, CanvasRenderingContext2D } from "canvas"

type Factory = {
  canvas: Canvas | null
  context: CanvasRenderingContext2D | null
}

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

  public reset ( factory: Factory, width: number, height: number ) {
    if ( !factory.canvas ) {
      throw new Error ( "Canvas is not specified" )
    }

    if ( width <= 0 || height <= 0 ) {
      throw new Error ( "Invalid canvas size" )
    }

    factory.canvas.width = width
    factory.canvas.height = height
  }

  public destroy ( factory: Factory ) {
    if ( !factory.canvas ) {
      throw new Error ( "Canvas is not specified" )
    }

    factory.canvas.width = 0
    factory.canvas.height = 0
    factory.canvas = null
    factory.context = null
  }
}
