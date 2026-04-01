// ===== PRODUCTS PAGE =====
let allProducts = [];
let productSearch = '';
let productPage = 1;
const PRODUCTS_PER_PAGE = 20;
let editingProduct = null;
let addCartProduct = null;
let addCartQtyVal = 1;
let addCartLastPrice = null;

async function renderProductsPage() {
  const page = document.getElementById('page-products');
  if (!page) {
    // Products page is accessed from profile drawer, create it dynamically
    const main = document.getElementById('main-app');
    const existingProducts = document.getElementById('products-page-overlay');
    if (existingProducts) existingProducts.remove();

    const overlay = document.createElement('div');
    overlay.id = 'products-page-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:55;background:var(--bg);overflow-y:auto;padding-bottom:2rem';
    overlay.innerHTML = `
      <div style="max-width:32rem;margin:0 auto">
        <div style="display:flex;align-items:center;gap:.75rem;padding:1rem;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg);z-index:1">
          <button onclick="document.getElementById('products-page-overlay').remove()" style="width:2.25rem;height:2.25rem;border:1.5px solid var(--border);border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 style="font-size:1.25rem;font-weight:700">Produtos</h1>
        </div>
        <div id="products-overlay-content">Carregando...</div>
      </div>`;
    main.appendChild(overlay);
    await loadAndRenderProducts('products-overlay-content');
    return;
  }
  await loadAndRenderProducts('page-products');
}

async function loadAndRenderProducts(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const user = await getCurrentUser();
  if (!user) return;

  const { data } = await db.from('products').select('*').order('name');
  allProducts = data || [];
  renderProductsList(containerId);
}

function renderProductsList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const filtered = allProducts.filter(p => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.ean?.includes(q);
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / PRODUCTS_PER_PAGE);
  const start = (productPage - 1) * PRODUCTS_PER_PAGE;
  const paged = filtered.slice(start, start + PRODUCTS_PER_PAGE);

  const itemsHtml = paged.map(p => `
    <div class="product-item">
      ${p.image_url
        ? `<img src="${p.image_url}" class="product-item-thumb" onerror="this.style.display='none'">`
        : `<div class="product-item-placeholder"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg></div>`
      }
      <div class="product-item-info">
        <h3>${escHtml(p.name)}</h3>
        ${p.brand ? `<div class="brand">${escHtml(p.brand)}</div>` : ''}
        ${p.price ? `<div class="last-price">Último: R$ ${parseFloat(p.price).toFixed(2)}</div>` : ''}
      </div>
      <div class="product-item-actions">
        <button class="btn-icon-sm" onclick="openEditModal('${p.id}')" title="Editar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon-sm blue" onclick="openAddCartModal('${p.id}')" title="Adicionar ao carrinho">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </button>
      </div>
    </div>`).join('');

  const paginationHtml = totalPages > 1 ? `
    <div class="pagination">
      ${Array.from({ length: totalPages }, (_, i) => `
        <button class="${i+1===productPage?'active':''}" onclick="goProductPage(${i+1})">${i+1}</button>`).join('')}
    </div>` : '';

  const prefix = containerId === 'page-products' ? `<div class="page-header"><h1>Produtos</h1><p>${total} cadastrados</p></div>` : `<div style="padding:1rem 1rem .5rem;color:var(--muted-fg);font-size:.875rem">${total} produtos</div>`;

  container.innerHTML = `
    ${prefix}
    <div class="search-wrap" style="padding:0 1rem .75rem;position:relative">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;left:1.875rem;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" placeholder="Buscar por nome, marca ou EAN..." value="${productSearch}"
        style="padding-left:2.5rem"
        oninput="productSearch=this.value;productPage=1;renderProductsList('${containerId}')">
    </div>
    <div class="products-list">${itemsHtml || '<div class="empty-state" style="padding:2rem 1rem"><p>Nenhum produto encontrado</p></div>'}</div>
    ${paginationHtml}`;
}

function goProductPage(p) {
  productPage = p;
  const cid = document.getElementById('products-overlay-content') ? 'products-overlay-content' : 'page-products';
  renderProductsList(cid);
}

// Edit modal
function openEditModal(id) {
  editingProduct = allProducts.find(p => p.id === id);
  if (!editingProduct) return;
  document.getElementById('edit-name').value = editingProduct.name || '';
  document.getElementById('edit-brand').value = editingProduct.brand || '';
  document.getElementById('edit-ean').value = editingProduct.ean || '';
  document.getElementById('edit-image').value = editingProduct.image_url || '';
  document.getElementById('edit-overlay').classList.remove('hidden');
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-overlay').classList.add('hidden');
  document.getElementById('edit-modal').classList.add('hidden');
  editingProduct = null;
}

async function saveProductEdit() {
  if (!editingProduct) return;
  const updates = {
    name: document.getElementById('edit-name').value.trim(),
    brand: document.getElementById('edit-brand').value.trim(),
    ean: document.getElementById('edit-ean').value.trim(),
    image_url: document.getElementById('edit-image').value.trim(),
  };
  const { error } = await db.from('products').update(updates).eq('id', editingProduct.id);
  if (error) { showToast('Erro ao salvar', 'error'); return; }
  showToast('Produto salvo!', 'success');
  closeEditModal();
  const cid = document.getElementById('products-overlay-content') ? 'products-overlay-content' : 'page-products';
  await loadAndRenderProducts(cid);
}

// Add to cart from products
async function openAddCartModal(id) {
  addCartProduct = allProducts.find(p => p.id === id);
  if (!addCartProduct) return;
  addCartQtyVal = 1;
  addCartLastPrice = null;
  document.getElementById('add-cart-product-name').textContent = addCartProduct.name;
  document.getElementById('add-cart-qty').textContent = 1;
  document.getElementById('add-cart-price').value = addCartProduct.price ? parseFloat(addCartProduct.price).toFixed(2) : '';
  document.getElementById('add-cart-diff').classList.add('hidden');

  const last = await getLastPurchaseForEan(addCartProduct.ean);
  addCartLastPrice = last?.price_paid || null;
  if (addCartLastPrice && !addCartProduct.price) {
    document.getElementById('add-cart-price').value = addCartLastPrice.toFixed(2);
  }
  updateAddCartDiff();

  document.getElementById('add-cart-overlay').classList.remove('hidden');
  document.getElementById('add-cart-modal').classList.remove('hidden');
}

function closeAddCartModal() {
  document.getElementById('add-cart-overlay').classList.add('hidden');
  document.getElementById('add-cart-modal').classList.add('hidden');
  addCartProduct = null;
}

function changeAddCartQty(delta) {
  addCartQtyVal = Math.max(1, addCartQtyVal + delta);
  document.getElementById('add-cart-qty').textContent = addCartQtyVal;
}

function updateAddCartDiff() {
  const price = parseFloat(document.getElementById('add-cart-price').value);
  const diffEl = document.getElementById('add-cart-diff');
  if (!price || !addCartLastPrice) { diffEl.classList.add('hidden'); return; }
  const diff = ((price - addCartLastPrice) / addCartLastPrice * 100);
  diffEl.classList.remove('hidden', 'up', 'down', 'same');
  if (diff > 0.1) { diffEl.classList.add('up'); diffEl.textContent = `↑ ${diff.toFixed(1)}% mais caro`; }
  else if (diff < -0.1) { diffEl.classList.add('down'); diffEl.textContent = `↓ ${Math.abs(diff).toFixed(1)}% mais barato`; }
  else { diffEl.classList.add('same'); diffEl.textContent = 'Mesmo preço'; }
}

function confirmAddCart() {
  if (!addCartProduct) return;
  const price = parseFloat(document.getElementById('add-cart-price').value);
  if (!price || price <= 0) { showToast('Informe o preço', 'error'); return; }
  addToCart({
    product_id: addCartProduct.id,
    product_ean: addCartProduct.ean,
    product_name: addCartProduct.name,
    product_brand: addCartProduct.brand || '',
    product_image_url: addCartProduct.image_url || '',
    price_paid: price,
    quantity: addCartQtyVal,
    last_price: addCartLastPrice
  });
  showToast('Adicionado ao carrinho!', 'success');
  closeAddCartModal();
}
