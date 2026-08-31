/* ==========================================================
   store.js — lógica de la página principal (index.html)
   ========================================================== */

let PRODUCTS = [];
let SETTINGS = {};
let activeCat = "Todos";
let activeSub = "Todas";
let cart = JSON.parse(sessionStorage.getItem('ys_cart') || '[]');

function saveCartSession(){
  sessionStorage.setItem('ys_cart', JSON.stringify(cart));
}

function toggleMobileMenu(){
  document.getElementById('mobileMenu').classList.toggle('open');
}

function applySettingsToPage(){
  document.getElementById('brandName').textContent = SETTINGS.storeName;
  document.getElementById('heroTitle').textContent = SETTINGS.heroTitle;
  document.getElementById('heroSubtitle').textContent = SETTINGS.heroSubtitle;
  document.getElementById('infoShipping').textContent = SETTINGS.shippingInfo;
  document.getElementById('infoSchedule').textContent = SETTINGS.schedule;
  document.getElementById('infoInstagram').textContent = '@' + (SETTINGS.instagram || '').replace('@','');
  document.title = SETTINGS.storeName;

  if (SETTINGS.logoUrl){ document.getElementById('brandLogo').src = SETTINGS.logoUrl; }
  if (SETTINGS.heroImage){ document.getElementById('heroImage').src = SETTINGS.heroImage; }

  const waLink = `https://wa.me/${SETTINGS.whatsappNumber}?text=${encodeURIComponent('Hola! Tengo una consulta sobre sus productos.')}`;
  document.getElementById('contactWa').href = waLink;

  const root = document.documentElement.style;
  root.setProperty('--bg', SETTINGS.colorBg);
  root.setProperty('--bg-soft', SETTINGS.colorBgSoft);
  root.setProperty('--brown', SETTINGS.colorBrown);
  root.setProperty('--brown-deep', SETTINGS.colorBrownDeep);
  root.setProperty('--olive', SETTINGS.colorOlive);
}

// ---------- Pestañas (con subpestañas anidadas) ----------
function renderTabs(){
  const cats = ["Todos", ...new Set(PRODUCTS.map(p => p.category).filter(Boolean))];
  document.getElementById('tabs').innerHTML = cats.map(c =>
    `<button class="tab ${c===activeCat?'active':''}" onclick="setCat('${c.replace(/'/g,"\\'")}')">${c}</button>`
  ).join('');
  renderSubtabs();
}

function renderSubtabs(){
  const box = document.getElementById('subtabs');
  if (activeCat === "Todos"){
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  const subs = [...new Set(
    PRODUCTS.filter(p => p.category === activeCat && p.subcategory)
            .map(p => p.subcategory)
  )];
  if (subs.length === 0){
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  box.style.display = 'flex';
  const options = ["Todas", ...subs];
  box.innerHTML = options.map(s =>
    `<button class="subtab ${s===activeSub?'active':''}" onclick="setSub('${s.replace(/'/g,"\\'")}')">${s}</button>`
  ).join('');
}

function setCat(c){
  activeCat = c;
  activeSub = "Todas";
  renderTabs();
  renderGrid();
}
function setSub(s){
  activeSub = s;
  renderSubtabs();
  renderGrid();
}

function renderGrid(){
  const items = PRODUCTS.filter(p => {
    if (p.active === false) return false;
    if (activeCat !== "Todos" && p.category !== activeCat) return false;
    if (activeCat !== "Todos" && activeSub !== "Todas" && (p.subcategory || '') !== activeSub) return false;
    return true;
  });
  const grid = document.getElementById('grid');
  if (items.length === 0){
    grid.innerHTML = '<p class="empty-msg">Todavía no hay productos cargados acá.</p>';
    return;
  }
  grid.innerHTML = items.map(p => {
    const base = getBasePrice(p);
    const hasMoreTiers = (p.priceTiers || []).length > 1;
    return `
    <div class="card">
      <div class="card-img">${p.image ? `<img src="${p.image}" alt="${p.name}">` : ''}</div>
      <div class="card-body">
        <span class="card-cat">${p.subcategory ? p.category + ' · ' + p.subcategory : p.category}</span>
        <span class="card-name">${p.name}</span>
        <span class="card-price">${hasMoreTiers ? '<span class="from">Desde</span>' : ''}${formatMoney(base)}</span>
        <button class="card-add" onclick="addToCart('${p.id}')">Agregar al pedido</button>
      </div>
    </div>
  `;
  }).join('');
}

// ---------- Carrito (recalcula precio según cantidad = escalones cargados por el vendedor) ----------
function addToCart(id){
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(x => x.id === id);
  if (existing) existing.qty++;
  else cart.push({id:p.id, name:p.name, image:p.image, qty:1});
  saveCartSession();
  renderCart();
  toggleCart(true);
}
function changeQty(id, delta){
  const it = cart.find(x => x.id === id);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) cart = cart.filter(x => x.id !== id);
  saveCartSession();
  renderCart();
}
function removeItem(id){
  cart = cart.filter(x => x.id !== id);
  saveCartSession();
  renderCart();
}

function renderCart(){
  const count = cart.reduce((a,c) => a + c.qty, 0);
  document.getElementById('cartBadge').textContent = count;
  const box = document.getElementById('drawerItems');
  if (cart.length === 0){
    box.innerHTML = '<div class="drawer-empty">Todavía no agregaste productos.</div>';
  } else {
    box.innerHTML = cart.map(it => {
      const product = PRODUCTS.find(p => p.id === it.id);
      const unitPrice = product ? getUnitPrice(product, it.qty) : 0;
      return `
      <div class="ci">
        <div class="ci-icon">${it.image ? `<img src="${it.image}" alt="">` : ''}</div>
        <div class="ci-info">
          <div class="ci-name">${it.name}</div>
          <div class="ci-price">${formatMoney(unitPrice)} c/u</div>
          <div class="ci-qty">
            <button onclick="changeQty('${it.id}',-1)">−</button>
            <span>${it.qty}</span>
            <button onclick="changeQty('${it.id}',1)">+</button>
          </div>
        </div>
        <button class="ci-remove" onclick="removeItem('${it.id}')">✕</button>
      </div>
    `;
    }).join('');
  }
  const total = cartTotal();
  document.getElementById('drawerTotal').textContent = formatMoney(total);
}

function cartTotal(){
  return cart.reduce((sum, it) => {
    const product = PRODUCTS.find(p => p.id === it.id);
    const unitPrice = product ? getUnitPrice(product, it.qty) : 0;
    return sum + unitPrice * it.qty;
  }, 0);
}

function toggleCart(open){
  document.getElementById('drawer').classList.toggle('open', open);
  document.getElementById('overlay').classList.toggle('open', open);
}

function checkout(){
  if (cart.length === 0){ alert('Agregá al menos un producto antes de finalizar el pedido.'); return; }
  let msg = `Hola! Quiero hacer este pedido en ${SETTINGS.storeName}:\n\n`;
  cart.forEach(it => {
    const product = PRODUCTS.find(p => p.id === it.id);
    const unitPrice = product ? getUnitPrice(product, it.qty) : 0;
    msg += `• ${it.name} x${it.qty} - ${formatMoney(unitPrice * it.qty)}\n`;
  });
  msg += `\nTotal: ${formatMoney(cartTotal())}`;
  const url = `https://wa.me/${SETTINGS.whatsappNumber}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

async function init(){
  document.getElementById('year').textContent = new Date().getFullYear();
  SETTINGS = await DB.getSettings();
  applySettingsToPage();
  PRODUCTS = await DB.getProducts();
  renderTabs();
  renderGrid();
  renderCart();
}
init();
