import joplin from 'api';
import { FileSystemItem } from 'api/types';
import { parseEpub } from './epubParser';
import { convertToMarkdown } from './markdownConverter';

export async function setupDesktopImport() {
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
}
