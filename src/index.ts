import joplin from 'api';
import { ToolbarButtonLocation, MenuItemLocation } from 'api/types';

joplin.plugins.register({
    onStart: async function() {
        const panels = joplin.views.panels;
        const panel = await panels.create('epubImportPanel');

        await panels.setHtml(panel, `
            <div style="padding: 20px; font-family: sans-serif; background-color: white; color: black;">
                <h3 style="margin-top: 0;">Import EPUB</h3>
                <p>Select an EPUB file to begin the import process.</p>
                <div style="margin-bottom: 15px;">
                    <input type="file" id="epubFile" accept=".epub" style="width: 100%;">
                </div>
                <div id="status" style="padding: 10px; border-radius: 4px; background-color: #f0f0f0; min-height: 20px;">
                    Ready to import.
                </div>
                <div style="margin-top: 20px; text-align: right;">
                    <button onclick="webviewApi.postMessage({type: 'close'})" style="padding: 5px 15px;">Close</button>
                </div>
            </div>
        `);

        await panels.addScript(panel, './webview.js');
        await panels.show(panel, false);

        const commandName = 'importEpub';

        await joplin.commands.register({
            name: commandName,
            label: 'Import EPUB File',
            iconName: 'fas fa-file-import',
            execute: async () => {
                await panels.show(panel, true);
            },
        });

        // Register UI elements
        try {
            await joplin.views.menuItems.create('toolsImportEpub', commandName, MenuItemLocation.Tools);
            await joplin.views.menuItems.create('fileImportEpub', commandName, MenuItemLocation.File);
            await joplin.views.toolbarButtons.create('importEpubButton', commandName, ToolbarButtonLocation.EditorToolbar);
        } catch (e) {
            console.error('Failed to create some UI elements:', e);
        }

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
                await joplin.views.dialogs.showMessageBox('EPUB import completed successfully!');
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
                // @ts-ignore
                const desktop = joplin.require('./desktopEntryPoint');
                await desktop.setupDesktopImport();
            } catch (e) {
                console.warn('Native desktop import module could not be initialized:', e);
            }
        }
    },
});
