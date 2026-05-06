import joplin from 'api';
import { FileSystemItem, ImportContext } from 'api/types';
import { parseEpub } from './epubParser';
import { convertToMarkdown } from './markdownConverter';

joplin.plugins.register({
    onStart: async function() {
        await joplin.interop.registerImportModule({
            description: 'EPUB Importer',
            format: 'epub',
            sources: [FileSystemItem.File],
            fileExtensions: ['epub'],
            isNoteArchive: false,

            onExec: async (context: ImportContext) => {
                const book = await parseEpub(context.sourcePath);

                // Create a new notebook
                const notebook = await joplin.data.post(['folders'], null, {
                    title: book.title
                });

                // Create notes for each chapter
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
