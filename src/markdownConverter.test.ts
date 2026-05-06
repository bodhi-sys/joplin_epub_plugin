import { convertToMarkdown } from './markdownConverter';

describe('markdownConverter', () => {
    it('should convert HTML to Markdown', () => {
        const html = '<h1>Title</h1><p>This is a <strong>bold</strong> paragraph with a <a href="https://example.com">link</a>.</p><ul><li>Item 1</li><li>Item 2</li></ul>';
        const expectedMarkdown = '# Title\n\nThis is a **bold** paragraph with a [link](https://example.com).\n\n*   Item 1\n*   Item 2';

        const markdown = convertToMarkdown(html);

        expect(markdown).toBe(expectedMarkdown);
    });
});
