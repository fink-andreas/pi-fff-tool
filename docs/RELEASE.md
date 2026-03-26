# Release

## Pre-release
1. `npm install`
2. `npm test`
3. `npm pack --dry-run`

## Publish
1. Update version in `package.json`
2. Update `README.md` if behavior changed
3. Publish to npm
4. Validate install with `pi install npm:@fink-andreas/pi-fff-tool`
