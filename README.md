# Obsidian Frontmatter Plugin

This Obsidian plugin adds the created datetime stamp if it is missing in the
frontmatter data. It also keeps the modified datetime stamp up to date.

The modified datetime stamp is updated only when the content changes. It
calculates and stores the content hash (without frontmatter data), and stores
this within the file. Everytime the file changes, the content hash is calculated
and check if it changed.

## Usage

```bash
# Install dependencies
npm install

# Update dependencies
npm update --save

# build
npm run dev
npm run build

# Update version
npm version patch
npm version minor
npm version major

git push && git push --tags
```

## Obsidian API Documentation

See https://github.com/obsidianmd/obsidian-api
