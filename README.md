# QuickPDF
Handling PDFs in NodeJS (📃 to 🖼️)

This project provides a set of utilities for converting various file formats without the need for additional dependencies. It supports multiple file types and leverages technologies like `Playwright`, `PDFKit`, and `pdfjs-dist` for file processing.

## Features

- **HTML to PDF**: Converts HTML content (from a URL or file path) into a PDF.
- **Image to PDF**: Converts images (JPEG, PNG) into a PDF, with optional headers and footers.
- **PDF to Image**: Converts PDF files to image formats (JPEG or PNG) using `pdfjs-dist` and `canvas`.
- **Utilities**: Includes helper functions to fetch and read HTML files and read files from local directories.

## Requirements

- **Node.js**: This project is built with Node.js and uses ES modules. NodeJS > v22 required.

# Operations Available in the Package

## 1. `html2pdf`

### Function Signature:
```typescript
html2pdf(input: string | URL)
```

### Parameters:

| Parameter | Type          | Description                                      | Data that can be passed                    |
|-----------|---------------|--------------------------------------------------|--------------------------------------------|
| `input`   | `string \| URL` | The HTML content to convert to PDF.              | A file path or a URL pointing to HTML content, as either a Node URL object or a Node string. Alternativly pass an html string directly. |

## 2. `img2pdf`

### Function Signature:
```typescript
img2pdf(input: Buffer | string | URL, options: Options = {})
```

### Parameters:

| Parameter | Type                      | Description                                      | Data that can be passed                    |
|-----------|---------------------------|--------------------------------------------------|--------------------------------------------|
| `input`   | `Buffer \| string \| URL` | The image content to convert to PDF.             | A Buffer, file path, or URL pointing to an image. String or URL object can be passed for an HTTP or Local Path. |
| `options` | `Options`                 | Optional configuration for the PDF conversion.   | An object with optional headers and footers |

### Options Type:

| Property  | Type     | Description                                      |
|-----------|----------|--------------------------------------------------|
| `header`  | `string` | Optional header text to include in the PDF.      |
| `footer`  | `string` | Optional footer text to include in the PDF.      |

## 3. `pdf2img`

### Function Signature:
```typescript
pdf2img(input: Buffer | string | URL, options: Options = {})
```

### Parameters:

| Parameter | Type                      | Description                                      | Data that can be passed                    |
|-----------|---------------------------|--------------------------------------------------|--------------------------------------------|
| `input`   | `Buffer \| string \| URL` | The PDF content to convert to images.            | A Buffer, file path, or URL pointing to a PDF. String or URL object can be passed for an HTTP or Local Path. |
| `options` | `Options`                 | Optional configuration for the image conversion. | An object with optional scale, password, and buffer configuration |

### Options Type:

| Property  | Type                                                                 | Description                                      |
|-----------|----------------------------------------------------------------------|--------------------------------------------------|
| `scale`   | `number`                                                             | Scaling factor for rendering the PDF pages. Default is 1. |
| `password`| `string`                                                             | Optional password for decrypting password-protected PDFs. |
| `buffer`  | `{ mime: "image/png"; options: PngConfig } \| { mime: "image/jpeg"; options: JpegConfig }` | Optional configuration for output image format and quality (PNG or JPEG). These types can be found in [pdfjs-dist](https://github.com/mozilla/pdf.js) |
