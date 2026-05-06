import ePub from 'epubjs';
import TurndownService from 'turndown';

declare const webviewApi: any;

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
});

document.getElementById('epubFile').addEventListener('change', async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('status').innerText = 'Reading file...';

    const reader = new FileReader();
    reader.onload = async (e: any) => {
        try {
            const data = e.target.result;
            const book = ePub(data);
            await book.ready;

            const metadata = await book.loaded.metadata;
            const spine = await book.loaded.spine;

            webviewApi.postMessage({
                type: 'importStart',
                title: metadata.title || file.name,
                author: metadata.creator || 'Unknown'
            });

            document.getElementById('status').innerText = 'Processing chapters...';

            // @ts-ignore
            for (const item of spine.spineItems) {
                const doc = await item.load(book.load.bind(book));
                const body = doc.body;

                // Basic cleanup of the document
                const scripts = body.querySelectorAll('script');
                scripts.forEach((s: any) => s.remove());
                const styles = body.querySelectorAll('style');
                styles.forEach((s: any) => s.remove());

                const markdown = turndownService.turndown(body.innerHTML);

                webviewApi.postMessage({
                    type: 'chapterImport',
                    title: item.idref,
                    content: markdown
                });

                item.unload();
            }

            document.getElementById('status').innerText = 'Import complete!';
            webviewApi.postMessage({ type: 'importComplete' });

        } catch (error) {
            console.error('Import failed in webview:', error);
            document.getElementById('status').innerText = 'Error: ' + error.message;
            webviewApi.postMessage({ type: 'importError', message: error.message });
        }
    };
    reader.readAsArrayBuffer(file);
});
