# QuickPDF

Handling PDFs in NodeJS (📃 to 🖼️)

This project provides a set of utilities for converting various file formats without the need for additional dependencies. It supports multiple file types and leverages technologies like `Puppeteer` and `PDFKit` for file processing.

## Features

- **HTML to PDF**: Converts HTML content (from a URL or file path) into a PDF.
- **Image to PDF**: Converts images (JPEG, PNG) into a PDF, with optional headers and footers.
- **PDF to Image**: Converts PDF files to image formats (JPEG or PNG) using `Puppeteer` and `Firefox`.
- **Utilities**: Includes helper functions to fetch and read HTML files and read files from local directories.

## Requirements

- **Node.js**: This project is built with Node.js and uses ES modules. NodeJS > v20 required.
- Firefox or Chrome (Module Dependant) either remotely or on your machine.

# Operations Available in the Package

## 1. `html2pdf`

### Function Signature:
```typescript
html2pdf(input: string | URL)
```

Validation occurs on the html string passed. The Error Object returned is:
```typescript
  {
    valid: boolean,
    count: {
      errors: number,
      warnings: number
    },
    validation: [ {
      file: string,
      count: {
        errors: number,
        warnings: number
      },
      messages: [ {
        message: string,
        line: number,
        column: number,
        ruleId: string
      } ]
    } ]
  }
```

### Parameters:

| Parameter | Type          | Description                                      | Data that can be passed                    |
|-----------|---------------|--------------------------------------------------|--------------------------------------------|
| `input`   | `string \| URL` | The HTML content to convert to PDF.              | A file path or a URL pointing to HTML content, as either a Node URL object or a Node string. Alternativly pass an html string directly. |
| `options` | `Options`                 | Optional configuration for the PDF conversion.   | An object with optional to configure PDF |

### Options Type:

| Property  | Type     | Description                                      | Default |
|-----------|----------|--------------------------------------------------|---------|
| `base64`  | `boolean` | PDF should be returned as a base64 encoded string.      |false|
| `rules`  | `object` | Optional custom validation rules for HTML content - see https://html-validate.org/rules/ for more details. Default is all standard rules enabled.      |''|
| `closeBrowser` | `boolean` | Optional flag to close the browser after conversion. | false |

## 2. `img2pdf`

### Function Signature:
```typescript
img2pdf(input: Buffer | string | URL, options: Options = {})
```

### Parameters:

| Parameter | Type                      | Description                                      | Data that can be passed                    |
|-----------|---------------------------|--------------------------------------------------|--------------------------------------------|
| `input`   | `Buffer \| string \| URL` | The image content to convert to PDF.             | A Buffer, file path, or URL pointing to an image. String or URL object can be passed for an HTTP or Local Path. |
| `options` | `Options`                 | Optional configuration for the PDF conversion.   | An object with optional configurations. |

### Options Type:

| Property  | Type     | Description                                      | Default |
|-----------|----------|--------------------------------------------------|---------|
| `header`  | `string` | Optional header text to include in the PDF.      |undefined|
| `footer`  | `string` | Optional footer text to include in the PDF.      |undefined|
| `fontSize` | `number` | Font Size of the header or footer | 10 |
| `closeBrowser` | `boolean` | Optional flag to close the browser after conversion. | false |

## 3. `pdf2img`

FIREFOX is a hard requirement. Chrome will not work with this module.

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
| `quality`   | `number`                                                             | Quality for rendering the PDF pages, not applicable for PNG. Default is 100. |
| `password`| `string`                                                             | Optional password for decrypting password-protected PDFs. |
| `type`    | `string`                                                             | The mime type to output - "png" | "jpeg" | "webp". Default is "png". |
| `page`    | `number`                                                             | Optional page number to return. If not specified, all pages are returned. |
| `closeBrowser` | `boolean`                                                       | Optional flag to close the browser after conversion. Default is false. |

## 3. `browsers`

### Function Signature:
```typescript
launchBrowser(browserType?: "firefox" | "chrome", wsURL?: string)
closeBrowser()
```

If no browserType is specified, the first existing instance of a browser will be returned - starting with firefox. If no browser is found, it will try and retrieve the first instance of a browser locally. Where this results in no browser an error will be thrown.
If a browserType is specified and no cached browser of that type is found, the browser will attempt to launch from your local machine. Include a wsURL to connect to a remote browser instance. An error will be thrown if not found.

`closeBrowser()` will close all running browsers, if remote the browser will disconnect.
On calling a module without a running instance, the browser will be created automatically - starting with firefox. Pass the closeBrowser parameter to your given module to call `closeBrowser()` on completion.