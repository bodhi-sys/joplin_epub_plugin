import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

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
                <div style="margin-top: 20px;">
                    <button onclick="webviewApi.postMessage({type: 'close'})">Close</button>
                </div>
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

        const version = await joplin.versionInfo() as any;
        if (version.platform !== 'mobile') {
            try {
                // Use joplin.require to load the desktop entry point
                const desktop = joplin.require('./desktopEntryPoint');
                await desktop.setupDesktopImport();
            } catch (e) {
                console.error('Failed to load desktop import module:', e);
            }
        }
    },
});
