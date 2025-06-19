// 設定 PDF.js worker ê 路徑，這是 library 規定 ê
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// 揣著 HTML 內底 ê 元件
const pdfSelect = document.getElementById('pdf-select'); // 新增：揣著下拉選單
const audioPlayer = document.getElementById('audio-player');
const pdfContainer = document.getElementById('pdf-container');
const loader = document.getElementById('loader');
const pdfViewer = document.getElementById('pdf-viewer'); // 【新】揣著 PDF viewer 元素

// 【新功能】監聽下拉選單 ê 變動事件
pdfSelect.addEventListener('change', (event) => {
    const selectedFile = event.target.value;
    if (selectedFile) {
        // 組合出完整 ê 檔案路徑
        const pdfPath = `res/${selectedFile}`;
        loadPdf(pdfPath);
    }
});

// 【已刪除】舊 ê fileInput 佮 urlInput 相關 ê 事件監聽攏提掉矣

// 主要 ê 載入 PDF 函式
async function loadPdf(source) {
    // 清空舊內容並顯示載入中
    pdfContainer.innerHTML = '';
    loader.classList.remove('hidden');
    audioPlayer.src = ''; // 換新檔案 ê 時陣，清掉舊 ê 音訊

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

// 顯示單一頁面 ê 函式 (這个函式內容無變)
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
                console.log('準備放送:', mp3Url);
                audioPlayer.src = mp3Url;
                audioPlayer.play();
            });
            
            // 共這个透明 ê div 加到每一頁 ê 容器內
            pageContainer.appendChild(linkOverlay);
        }
    });
}

// 【新功能】轉去頁頂 ê 撳鈕
const backToTopBtn = document.getElementById('back-to-top-btn');

if (backToTopBtn && pdfViewer) { // 加一个檢查，確保 backToTopBtn佮pdfViewer攏有揣著
    // 監聽 pdfViewer ê 捲動事件，決定敢欲顯示「轉去頁頂」撳鈕
    pdfViewer.addEventListener('scroll', () => {
        // 捲超過 200px 才顯示
        if (pdfViewer.scrollTop > 200) { // 改用 pdfViewer.scrollTop
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    // 監聽「轉去頁頂」撳鈕 ê 點擊事件，共 pdfViewer 絞去頂頭
    backToTopBtn.addEventListener('click', () => {
        pdfViewer.scrollTo({ // 改用 pdfViewer.scrollTo
            top: 0,
            behavior: 'smooth' // 平順咁捲上去
        });
    });
} else {
    if (!pdfViewer) console.error('錯誤：揣無 id="pdf-viewer" ê 元素。');
    if (!backToTopBtn) console.error('錯誤：揣無 id="back-to-top-btn" ê 元素。');
}