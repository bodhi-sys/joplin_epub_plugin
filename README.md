# Joplin EPUB Importer

A Joplin plugin that imports EPUB files, converts their contents to Markdown, and creates a dedicated notebook with one note per chapter.

## Features
- Import EPUB files (`.epub`)
- Convert XHTML/HTML content to Markdown using `turndown`
- Create a new notebook named after the EPUB title
- Create one note per chapter with chapter titles preserved
- Basic formatting preservation: headings, paragraphs, lists, links

## Installation (Development)

To build the plugin for development:

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the plugin: `npm run dist`
4. The generated `.jpl` file will be in the `publish/` directory.

To use it in Joplin:
- Open Joplin
- Go to `Tools` > `Options` > `Plugins`
- Click the gear icon and select `Install from file`
- Choose the `.jpl` file from the `publish/` directory.

## Development

### Build
To compile the plugin:
```bash
npm run dist
```

### Test
To run unit tests:
```bash
npm test
```

## Known Limitations
- Image handling is currently not implemented (images in EPUBs will result in broken links).
- Complex EPUB structures might not be perfectly preserved.
