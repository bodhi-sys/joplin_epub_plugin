document.getElementById('epubFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1];
        webviewApi.postMessage({
            type: 'epubSelected',
            data: base64Data,
            name: file.name
        });
    };
    reader.readAsDataURL(file);
});
