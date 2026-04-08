# Browser Extensions

## inbox-clipper (Chrome/Chromium)

Saves the current tab's URL to the Teable Inbox with one click.

**Install:** Chrome → `chrome://extensions` → Load unpacked → select `inbox-clipper/`

Note: Chrome loads unpacked extensions by absolute path. If you move this folder, reload the extension from the new location.

## inbox-clipper-firefox (Firefox)

Firefox version of the same extension. Manual save button instead of auto-save on open.

**Install:** Firefox → `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → select `manifest.json`

Note: Temporary add-ons are removed on Firefox restart. For a permanent install, use Firefox Developer Edition with `xpinstall.signatures.required` set to `false` in `about:config`.
