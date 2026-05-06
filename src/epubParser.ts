import { EPub } from 'epub2';
import * as ePubJS from 'epubjs';

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

async function parseWithEpub2(file: any): Promise<EpubBook> {
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

async function parseWithEpubJS(data: Buffer): Promise<EpubBook> {
    // @ts-ignore
    const book = ePubJS.default(data.buffer as ArrayBuffer);
    await book.ready;
    const metadata = await book.loaded.metadata;
    const spine = await book.loaded.spine;
    const chapters: EpubChapter[] = [];

    // @ts-ignore
    for (const item of spine.spineItems) {
        const doc = await item.load(book.load.bind(book));
        const content = new XMLSerializer().serializeToString(doc);
        chapters.push({
            id: item.idref,
            title: item.idref,
            content: content
        });
        item.unload();
    }

    return {
        title: metadata.title || 'Untitled',
        author: metadata.creator || 'Unknown',
        chapters
    };
}

export async function parseEpub(file: any): Promise<EpubBook> {
    try {
        return await parseWithEpub2(file);
    } catch (e) {
        if (Buffer.isBuffer(file)) {
            return await parseWithEpubJS(file);
        }
        throw e;
    }
}
