import { parseEpub } from './epubParser';
import EPub from 'epub2';

jest.mock('epub2');

describe('epubParser', () => {
    it('should parse epub metadata and chapters', async () => {
        const mockEpub = {
            metadata: {
                title: 'Test Book',
                creator: 'Test Author'
            },
            spine: {
                contents: [
                    { id: 'chapter1' },
                    { id: 'chapter2' }
                ]
            },
            toc: [
                { id: 'chapter1', title: 'Chapter 1' },
                { id: 'chapter2', title: 'Chapter 2' }
            ],
            getChapterAsync: jest.fn()
                .mockResolvedValueOnce('<html><body>Content 1</body></html>')
                .mockResolvedValueOnce('<html><body>Content 2</body></html>')
        };

        (EPub.createAsync as jest.Mock).mockResolvedValue(mockEpub);

        const book = await parseEpub('test.epub');

        expect(book.title).toBe('Test Book');
        expect(book.author).toBe('Test Author');
        expect(book.chapters).toHaveLength(2);
        expect(book.chapters[0]).toEqual({
            id: 'chapter1',
            title: 'Chapter 1',
            content: '<html><body>Content 1</body></html>'
        });
        expect(book.chapters[1]).toEqual({
            id: 'chapter2',
            title: 'Chapter 2',
            content: '<html><body>Content 2</body></html>'
        });
    });
});
