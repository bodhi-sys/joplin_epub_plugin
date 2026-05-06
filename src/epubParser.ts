import { EPub } from 'epub2';

export interface EpubChapter {
    id: string;
    title: string;
    content: string;
}

export interface EpubBook {
    title: string;
    author: string;
    chapters: EpubChapter[];
}

export async function parseEpub(file: any): Promise<EpubBook> {
    const epub = await EPub.createAsync(file);
    const chapters: EpubChapter[] = [];
    for (const spine of epub.spine.contents) {
        const chapter = await epub.getChapterAsync(spine.id);
        const title = epub.toc.find(t => t.id === spine.id)?.title || spine.id;
        chapters.push({ id: spine.id, title: title, content: chapter });
    }
    return {
        title: epub.metadata.title || 'Untitled',
        author: epub.metadata.creator || 'Unknown',
        chapters
    };
}
