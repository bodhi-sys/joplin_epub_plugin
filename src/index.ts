import joplin from 'api';
import { ToolbarButtonLocation, FileSystemItem } from 'api/types';
import { parseEpub } from './epubParser';
import { convertToMarkdown } from './markdownConverter';

joplin.plugins.register({
    onStart: async function() {
        const panels = joplin.views.panels;
        const panel = await panels.create('epubImportPanel');

        await panels.setHtml(panel, `
            <div style="padding: 20px; font-family: sans-serif;">
                <h3>Import EPUB</h3>
                <p>Select an EPUB file to import:</p>
                <input type="file" id="epubFile" accept=".epub">
                <div id="status" style="margin-top: 10px; color: blue;"></div>
                <button onclick="webviewApi.postMessage({type: 'close'})" style="margin-top: 20px;">Close</button>
            </div>
        `);

        await panels.addScript(panel, './webview.js');
        await panels.show(panel, false);

        const commandName = 'importEpub';

        await joplin.commands.register({
            name: commandName,
            label: 'Import EPUB',
            iconName: 'fas fa-file-import',
            execute: async () => {
                await panels.show(panel, true);
            },
        });

        await joplin.views.toolbarButtons.create('importEpubButton', commandName, ToolbarButtonLocation.NoteToolbar);

        let currentNotebook: any = null;
        let bookAuthor = 'Unknown';

        panels.onMessage(panel, async (message: any) => {
            if (message.type === 'importStart') {
                bookAuthor = message.author;
                currentNotebook = await joplin.data.post(['folders'], null, {
                    title: message.title
                });
            } else if (message.type === 'chapterImport') {
                if (currentNotebook) {
                    await joplin.data.post(['notes'], null, {
                        title: message.title,
                        body: message.content,
                        parent_id: currentNotebook.id,
                        author: bookAuthor
                    });
                }
            } else if (message.type === 'importComplete') {
                await joplin.views.dialogs.showMessageBox('Import completed successfully!');
                await panels.hide(panel);
            } else if (message.type === 'importError') {
                await joplin.views.dialogs.showMessageBox('Import failed: ' + message.message);
            } else if (message.type === 'close') {
                await panels.hide(panel);
            }
        });

        // Desktop-only native import module
        await joplin.interop.registerImportModule({
            description: 'EPUB Importer',
            format: 'epub',
            sources: [FileSystemItem.File],
            fileExtensions: ['epub'],
            isNoteArchive: false,

            onExec: async (context: any) => {
                const book = await parseEpub(context.sourcePath);

                const notebook = await joplin.data.post(['folders'], null, {
                    title: book.title
                });

                for (const chapter of book.chapters) {
                    const markdown = convertToMarkdown(chapter.content);
                    await joplin.data.post(['notes'], null, {
                        title: chapter.title,
                        body: markdown,
                        parent_id: notebook.id,
                        author: book.author
                    });
                }
            },
        });
    },
});
