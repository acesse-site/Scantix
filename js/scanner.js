// ===== SCANNER PAGE =====
let scannerProduct = null;
let scannerLastPurchase = null;
let html5QrCode = null;

function renderScanner() {
  const page = document.getElementById('page-scanner');
  page.innerHTML = `
    <div class="scanner-hero">
      <div class="scanner-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 3h5l1.5 1.5M3 3v5M3 3l3 3"/><rect x="9" y="3" width="4" height="1"/><rect x="15" y="3" width="4" height="1"/><path d="M21 3h-2"/><path d="M21 3v5"/><rect x="3" y="9" width="1" height="4"/><rect x="3" y="15" width="1" height="4"/><path d="M3 21v-2"/><path d="M3 21h5"/><rect x="9" y="21" width="4" height="1" transform="rotate(180 11 21.5)"/></svg>
      </div>
      <h1>Scantix</h1>
      <p>Escaneie o código de barras do produto</p>
    </div>
    <div class="section-padding">
      <div class="barcode-input-wrap" id="barcode-wrap">
        <svg id="barcode-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(220,80%,50%)" stroke-width="2"><path d="M3 3h5l1.5 1.5M3 3v5"/><rect x="9" y="3" width="4" height="1"/><rect x="15" y="3" width="4" height="1"/><path d="M21 3h-2"/><path d="M21 3v5"/><rect x="3" y="9" width="1" height="4"/><rect x="3" y="15" width="1" height="4"/><path d="M3 21v-2"/><path d="M3 21h5"/><rect x="9" y="21" width="4" height="1" transform="rotate(180 11 21.5)"/></svg>
        <input type="text" id="ean-input" inputmode="numeric" placeholder="Bipe ou digite o EAN..."
          autocomplete="off" oninput="this.value=this.value.replace(/\\D/g,'')"
          onkeydown="if(event.key==='Enter')triggerScan()">
        <button class="barcode-btn-camera" onclick="openCameraScanner()" title="Câmera">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </button>
      </div>
      <p class="barcode-input-hint">Bipe, digite o EAN + Enter, ou use a câmera</p>
    </div>
    <div id="scanner-result" class="section-padding"></div>
  `;
  setTimeout(() => document.getElementById('ean-input')?.focus(), 100);
}

async function triggerScan() {
  const input = document.getElementById('ean-input');
  const ean = input?.value?.trim();
  if (!ean || ean.length < 8) return;
  input.value = '';
  input.blur();
  setScannerLoading(true);
  clearScannerResult();

  try {
    const [{ product }, lastPurchase] = await Promise.all([
      lookupProduct(ean),
      getLastPurchaseForEan(ean)
    ]);

    if (!product) {
      renderNotFound();
    } else {
      scannerProduct = product;
      scannerLastPurchase = lastPurchase;
      renderProductResult(product, lastPurchase);
    }
  } catch (e) {
    console.error(e);
    showToast('Erro ao buscar produto', 'error');
  } finally {
    setScannerLoading(false);
    setTimeout(() => document.getElementById('ean-input')?.focus(), 100);
  }
}

function setScannerLoading(loading) {
  const icon = document.getElementById('barcode-icon');
  if (!icon) return;
  if (loading) {
    icon.outerHTML = `<span class="spinner" id="barcode-icon"></span>`;
  }
}

function clearScannerResult() {
  const el = document.getElementById('scanner-result');
  if (el) el.innerHTML = '';
}

function renderNotFound() {
  const el = document.getElementById('scanner-result');
  if (!el) return;
  el.innerHTML = `
    <div class="not-found-card">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p>Produto não encontrado</p>
      <small>Nenhuma base de dados possui esse código</small>
    </div>`;
}

function renderProductResult(product, lastPurchase) {
  const el = document.getElementById('scanner-result');
  if (!el) return;
  const lastPrice = lastPurchase?.price_paid;
  const suggestedPrice = product.price || '';

  el.innerHTML = `
    <div class="product-result-card">
      <div class="product-result-top">
        ${product.image_url
          ? `<img src="${product.image_url}" class="product-thumb" onerror="this.style.display='none'">`
          : `<div class="product-thumb-placeholder"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg></div>`
        }
        <div class="product-info">
          <h3>${escHtml(product.name)}</h3>
          ${product.brand ? `<p class="brand">${escHtml(product.brand)}</p>` : ''}
          <p class="ean">${product.ean}</p>
        </div>
      </div>
      ${lastPrice ? `<div class="last-price-row">Último preço: <strong>R$ ${lastPrice.toFixed(2)}</strong></div>` : ''}
      <div class="product-actions">
        <div class="product-inputs">
          <div style="flex:1">
            <label style="font-size:.8125rem;font-weight:500;display:block;margin-bottom:.375rem">Preço (R$)</label>
            <input type="number" id="result-price" step="0.01" min="0" placeholder="0,00"
              value="${suggestedPrice}" oninput="updatePriceDiff()"
              style="width:100%;font-size:1.125rem;font-weight:600;height:3rem;padding:.625rem .875rem">
          </div>
          <div style="width:7rem">
            <label style="font-size:.8125rem;font-weight:500;display:block;margin-bottom:.375rem">Qtd</label>
            <div class="qty-control">
              <button onclick="changeResultQty(-1)">−</button>
              <span id="result-qty">1</span>
              <button onclick="changeResultQty(1)">+</button>
            </div>
          </div>
        </div>
        <div id="price-diff-indicator" class="price-diff hidden"></div>
        <button class="btn-primary w-full" style="height:3rem;font-size:1rem;border-radius:.75rem" onclick="addResultToCart()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Adicionar ao Carrinho
        </button>
      </div>
    </div>`;

  if (lastPrice) setTimeout(updatePriceDiff, 50);
}

let resultQty = 1;
function changeResultQty(delta) {
  resultQty = Math.max(1, resultQty + delta);
  const el = document.getElementById('result-qty');
  if (el) el.textContent = resultQty;
}

function updatePriceDiff() {
  const priceInput = document.getElementById('result-price');
  const indicator = document.getElementById('price-diff-indicator');
  if (!priceInput || !indicator || !scannerLastPurchase) return;
  const price = parseFloat(priceInput.value);
  const last = scannerLastPurchase.price_paid;
  if (!price || !last) { indicator.classList.add('hidden'); return; }
  const diff = ((price - last) / last) * 100;
  indicator.classList.remove('hidden', 'up', 'down', 'same');
  if (diff > 0.1) {
    indicator.classList.add('up');
    indicator.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> ${diff.toFixed(1)}% mais caro`;
  } else if (diff < -0.1) {
    indicator.classList.add('down');
    indicator.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg> ${Math.abs(diff).toFixed(1)}% mais barato`;
  } else {
    indicator.classList.add('same');
    indicator.textContent = 'Mesmo preço';
  }
}

function addResultToCart() {
  if (!scannerProduct) return;
  const priceInput = document.getElementById('result-price');
  const price = parseFloat(priceInput?.value);
  if (!price || price <= 0) { showToast('Informe o preço do produto', 'error'); return; }
  addToCart({
    product_id: scannerProduct.id || '',
    product_ean: scannerProduct.ean,
    product_name: scannerProduct.name,
    product_brand: scannerProduct.brand || '',
    product_image_url: scannerProduct.image_url || '',
    price_paid: price,
    quantity: resultQty,
    last_price: scannerLastPurchase?.price_paid || null
  });
  showToast('Adicionado ao carrinho!', 'success');
  scannerProduct = null; scannerLastPurchase = null; resultQty = 1;
  clearScannerResult();
  setTimeout(() => document.getElementById('ean-input')?.focus(), 100);
}

// Camera scanner
let cameraScanLocked = false;
let cameraScanTimeout = null;

function openCameraScanner() {
  document.getElementById('camera-modal').classList.remove('hidden');
  cameraScanLocked = false;
  startCameraScanner();
}

function closeCameraScanner() {
  document.getElementById('camera-modal').classList.add('hidden');
  stopCameraScanner();
  if (cameraScanTimeout) { clearTimeout(cameraScanTimeout); cameraScanTimeout = null; }
  cameraScanLocked = false;
}

async function startCameraScanner() {
  const readerEl = document.getElementById('camera-reader');
  readerEl.innerHTML = '<p style="color:rgba(255,255,255,.5);text-align:center;padding:3rem 1rem">Abrindo câmera...</p>';

  try {
    // Tenta abrir direto pela câmera traseira sem listar dispositivos (mais rápido)
    html5QrCode = new Html5Qrcode('camera-reader');

    await html5QrCode.start(
      { facingMode: 'environment' },   // câmera traseira direto, sem listar
      {
        fps: 15,                        // aumentado de 8 → 15 para leitura mais rápida
        qrbox: { width: 280, height: 120 },
        aspectRatio: 1.7,
        videoConstraints: {
          facingMode: { ideal: 'environment' },
          focusMode: 'continuous',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      (code) => {
        // Ignora leituras duplicadas em menos de 2 segundos
        if (cameraScanLocked) return;
        cameraScanLocked = true;

        // Feedback visual antes de fechar
        const feedbackEl = document.createElement('div');
        feedbackEl.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,200,100,.25);z-index:10;pointer-events:none';
        feedbackEl.innerHTML = '<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
        readerEl.style.position = 'relative';
        readerEl.appendChild(feedbackEl);

        // Espera 500ms para mostrar o feedback e depois processa
        cameraScanTimeout = setTimeout(() => {
          closeCameraScanner();
          handleCameraScan(code);
        }, 500);
      },
      () => {} // erro de frame, ignorar
    );

    // Aplica autofoco contínuo após câmera iniciar
    setTimeout(() => {
      const vid = document.querySelector('#camera-reader video');
      if (vid?.srcObject) {
        vid.srcObject.getVideoTracks().forEach(t => {
          const cap = t.getCapabilities?.() || {};
          if (cap.focusMode?.includes('continuous')) {
            t.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
          }
        });
      }
    }, 800);

  } catch (e) {
    // Fallback: tenta listar câmeras e pegar a traseira
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) throw new Error('Sem câmera');
      const backCamera = devices[devices.length - 1];
      if (html5QrCode?.isScanning) await html5QrCode.stop();
      html5QrCode = new Html5Qrcode('camera-reader');
      await html5QrCode.start(
        backCamera.id,
        { fps: 15, qrbox: { width: 280, height: 120 }, aspectRatio: 1.7 },
        (code) => {
          if (cameraScanLocked) return;
          cameraScanLocked = true;
          cameraScanTimeout = setTimeout(() => { closeCameraScanner(); handleCameraScan(code); }, 500);
        },
        () => {}
      );
    } catch (e2) {
      readerEl.innerHTML = '<p style="color:#f88;text-align:center;padding:2rem">Não foi possível acessar a câmera.<br>Verifique as permissões do navegador.</p>';
    }
  }
}

function stopCameraScanner() {
  if (html5QrCode?.isScanning) html5QrCode.stop().catch(() => {});
  html5QrCode = null;
}

function handleCameraScan(code) {
  const cleaned = code.trim();
  if (cleaned.length >= 8) {
    const input = document.getElementById('ean-input');
    if (input) { input.value = cleaned; triggerScan(); }
  }
}
