# Changelog

All notable changes to this project will be documented in this file.

# 1.8.2 (2025-10-29)
# 1.8.1 (2025-10-29)
- Refactor cleanup of data directory. Only create if specifically asked for.
- Destroy only old pids created by this run of quick-pdf.

# 1.8.0 (2025-10-28)
- HTML-Validate v10
- Cleanup extra pids

# 1.7.3 (2025-07-30)
# 1.7.2 (2025-07-30)
- Better cleanup of Browser Data

# 1.7.1 (2025-07-23)
- Add Optional Additional Logging in Dev Mode only

# 1.7.0 (2025-07-23)
- Cleanup Old Browser Processes on the machine

# 1.6.4 (2025-06-08)
# 1.6.3 (2025-06-08)
- Bug Fixing

# 1.6.2 (2025-06-12)
- Switch back puppeteer-core for puppeteer due to type safety failure.

# 1.6.1 (2025-06-09)
- Run Launch Pages as Part of Launch Browser
- The return type of launchBrowser updated to reflect above.

# 1.6.0 (2025-06-06)
- New Feature: Add compatability with remote browser instances.
- Exposed browser controls to the end user.
- Add chrome support for all modules except pdf2img.
- Chrome or Firefox must be either installed on machine or remote, so only puppeteer-core is required.

# 1.5.1 (2025-06-06)
- Change wait for loading icon to per page.
- Launch Browser before first call.

# 1.5.0 (2025-06-06)
- Fixed an issue with rendering multiple pages in pdf2img.

# 1.4.7 (2025-06-05)
- Patched Versions.

# 1.4.6 (2025-04-03)
- Patch image-size

# 1.4.5 (2025-04-01)
# 1.4.4 (2025-04-01)
- Bug Fix HTML2PDF Scale Size in Firefox

# 1.4.3 (2025-04-01)
- Removed Chrome Browser Dependency

# 1.4.2 (2025-03-31)
- Require Browsers on Machine

# 1.4.1 (2025-03-22)
- Make HTML Validation Optional

# 1.4.0 (2025-02-24)
- ECONNRESET Mitigation

# 1.3.7 (2025-02-14)
- Tidy Up

# 1.3.6 (2025-02-09)
# 1.3.5 (2025-02-09)
# 1.3.4 (2025-02-09)
# 1.3.3 (2025-02-09)
- Patch browser install

# 1.3.2 (2025-02-09)
- Launch Browsers Early
- Allow manually launching the browsers

# 1.3.1 (2025-02-09)
- Bug Fixes
- Export Close Browsers

# 1.3.0 (2025-02-09)
- Build process now uses ESBuild
- CJS Support
- Firefox no longer needs to be installed separately.
- Package Update
- New Vscode Tasks
- Reduced Minimum Node Version to v20

# 1.2.0 (2025-01-07)
- Updated Dependencies
- Removed agressive progress.exit in favour of promise reject.

# 1.1.12 (2024-12-05)
- Fixed an error where a buffer would fail because the file path was not a file address.

# 1.1.11 (2024-12-03)
# 1.1.10 (2024-12-03)
# 1.1.9 (2024-12-03)
# 1.1.8 (2024-12-03)
# 1.1.7 (2024-12-03)
# 1.1.6 (2024-12-02)
# 1.1.5 (2024-12-02)
# 1.1.4 (2024-12-02)
- Fixed errors from 1.1.0.

# 1.1.3 (2024-11-29)
- Rollback

# 1.1.2 (2024-11-28)
- Allow for additional HTTP Headers in the request for a PDF document.

# 1.1.1 (2024-11-28)
# 1.1.0 (2024-11-28)
- Generate a PDF to an Image has been reworked. This is to force the removal of node canvas all together which seems to be no longer supported. It does mean however we can no longer support pdf by buffer or a password encrypted pdf.

# 1.0.21 (2024-11-21)
# 1.0.20 (2024-11-20)
# 1.0.19 (2024-11-20)
# 1.0.18 (2024-11-20)
# 1.0.17 (2024-11-20)

- Bug Fixes

# 1.0.16 (2024-11-20)
# 1.0.15 (2024-11-20)
# 1.0.14 (2024-11-20)

- Fixed an error where canvas-3.0-rc.2 would resolve instead of `@napi-rs/canvas`

# 1.0.13 (2024-11-20)
# 1.0.12 (2024-11-20)
# 1.0.11 (2024-11-19)

- Update Dependencies

# 1.0.10 (2024-11-13)

- Bug Fix

# 1.0.9 (2024-11-13)

- Bug Fix

# 1.0.8 (2024-11-13)

- Pre Install Playwright Browser if Chromium Does Not Exist

# 1.0.6 (2024-11-08)

- Options added to HTML2PDF
- Allow PDF from HTML to be scaled

# 1.0.5 (2024-11-07)

- Bug Fixes

# 1.0.4 (2024-11-07)

- Bug Fixes

# 1.0.3 (2024-11-06)

- Use Sharp for Clearer PNG Quality
- Remove Canvas Warning From Logs

# 1.0.2 (2024-11-06)

- @types packages now added
- Removed tests from node_module dist

# 1.0.1 (2024-11-05)

- Moved from `skia-canvas` to `Brooooooklyn/canvas` which removes deprecated warnings on install
- Added Option to return a base64 String instead of a Buffer when generating a PDF from HTML

## 1.0.0 (2024-11-05)

- Initial release
