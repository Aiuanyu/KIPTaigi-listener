// 設定 PDF.js worker ê 路徑，這是 library 規定 ê (已更新連結)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// 揣著 HTML 內底 ê 元件
const fileInput = document.getElementById('file-input');
const urlInput = document.getElementById('url-input');
const loadUrlBtn = document.getElementById('load-url-btn');
const audioPlayer = document.getElementById('audio-player');
const pdfContainer = document.getElementById('pdf-container');
const loader = document.getElementById('loader');

// 監聽「載入網址」按鈕 ê 點擊事件
loadUrlBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (url) {
        loadPdf(url);
    } else {
        alert('請輸入有效 ê PDF 網址');
    }
});

// 監聽檔案選擇器 ê 變動事件
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
            const typedarray = new Uint8Array(e.target.result);
            loadPdf(typedarray);
        };
        fileReader.readAsArrayBuffer(file);
    } else if (file) {
        alert('請選擇一个 PDF 檔案');
    }
});

// 主要 ê 載入 PDF 函式
async function loadPdf(source) {
    // 清空舊內容並顯示載入中
    pdfContainer.innerHTML = '';
    loader.classList.remove('hidden');

    try {
        const pdf = await pdfjsLib.getDocument(source).promise;
        const numPages = pdf.numPages;

        // 一頁一頁處理
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            await renderPage(page, pdfContainer);
        }

    } catch (error) {
        console.error('載入 PDF 失敗:', error);
        alert(`載入 PDF 失敗：${error.message}`);
    } finally {
        // 隱藏載入中
        loader.classList.add('hidden');
    }
}

// 顯示單一頁面 ê 函式
async function renderPage(page, container) {
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    // 建立一个 div 來做每一頁 ê 容器，方便定位連結
    const pageContainer = document.createElement('div');
    pageContainer.style.position = 'relative';
    pageContainer.style.width = viewport.width + 'px';
    pageContainer.style.height = viewport.height + 'px';
    pageContainer.style.margin = '10px auto';
    container.appendChild(pageContainer);

    // 建立 canvas 來畫 PDF 內容
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    pageContainer.appendChild(canvas);
    
    const context = canvas.getContext('2d');

    // 顯示 PDF 該頁內容
    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };
    await page.render(renderContext).promise;

    // 【核心部份】揣出頁面內底所有連結 (annotations)
    const annotations = await page.getAnnotations();
    
    annotations.forEach(annot => {
        // 若連結類型是 'Link' 而且網址結尾是 .mp3
        if (annot.subtype === 'Link' && annot.url && annot.url.toLowerCase().endsWith('.mp3')) {
            // 建立一个透明 ê div 來遮佇連結頂面，用來接收點擊
            const linkOverlay = document.createElement('div');
            linkOverlay.classList.add('link-overlay');

            // 計算連結佇 canvas 頂頭 ê 位置佮大細
            const [x1, y1, x2, y2] = annot.rect;
            const left = x1 * scale;
            const width = (x2 - x1) * scale;
            const height = (y2 - y1) * scale;
            
            linkOverlay.style.left = `${left}px`;
            // 注意：PDF 座標原點佇左下角，HTML 佇左上角，所以愛轉換
            linkOverlay.style.top = `${viewport.height - y2 * scale}px`; 
            linkOverlay.style.width = `${width}px`;
            linkOverlay.style.height = `${height}px`;

            // 共這个連結對應 ê MP3 網址存起來
            linkOverlay.dataset.mp3Url = annot.url;

            // 加上點擊事件
            linkOverlay.addEventListener('click', (e) => {
                e.preventDefault(); // 防止預設行為 (開新分頁)
                const mp3Url = e.currentTarget.dataset.mp3Url;
                console.log('準備播放:', mp3Url);
                audioPlayer.src = mp3Url;
                audioPlayer.play();
                // window.scrollTo({ top: 0, behavior: 'smooth' }); // 自動捲到上頂頭看著播放器
            });
            
            // 共這个透明 ê div 加到每一頁 ê 容器內
            pageContainer.appendChild(linkOverlay);
        }
    });
}