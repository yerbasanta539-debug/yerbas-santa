/* ==========================================================
   admin.js — panel de administrador integrado en index.html
   Se abre con 5 clics seguidos sobre "Yerbas Santa" en el
   pie de página.
   ========================================================== */

let ADMIN_PRODUCTS = [];
let ADMIN_SALES = [];
let editingId = null;
let adminTiers = [{minQty:1, price:''}]; // escalones de precio del producto que se está cargando/editando

// ---------- Gesto secreto para abrir el panel ----------
let secretClicks = 0;
let secretTimer = null;
function handleSecretClick(){
  secretClicks++;
  clearTimeout(secretTimer);
  secretTimer = setTimeout(() => { secretClicks = 0; }, 1500);
  if (secretClicks >= 5){
    secretClicks = 0;
    document.getElementById('adminOverlayRoot').style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}
function closeAdminOverlay(){
  document.getElementById('adminOverlayRoot').style.display = 'none';
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAdminOverlay();
});

// ---------- LOGIN ----------
function doLogin(){
  const pass = document.getElementById('loginPass').value.trim();
  const errorBox = document.getElementById('loginError');
  errorBox.textContent = '';

  if (DEMO_MODE){
    const saved = localStorage.getItem('ys_admin_password') || '12345';
    if (pass === saved){
      sessionStorage.setItem('ys_admin_logged', '1');
      openAdmin();
    } else {
      errorBox.textContent = 'Contraseña incorrecta.';
    }
    return;
  }

  auth.signInWithEmailAndPassword(ADMIN_EMAIL, pass)
    .then(() => openAdmin())
    .catch(() => { errorBox.textContent = 'Contraseña incorrecta.'; });
}

function doLogout(){
  if (DEMO_MODE){
    sessionStorage.removeItem('ys_admin_logged');
  } else {
    auth.signOut();
  }
  document.getElementById('adminShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPass').value = '';
}

async function openAdmin(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminShell').style.display = 'flex';
  resetProductForm();
  await loadAll();
}

document.addEventListener('DOMContentLoaded', () => {
  if (DEMO_MODE){
    const hint = document.getElementById('demoHint');
    if (hint) hint.style.display = 'block';
  }
});

// ---------- NAVEGACIÓN ENTRE PESTAÑAS ----------
function showPanel(name){
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav [data-panel]').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.querySelector(`.admin-nav [data-panel="${name}"]`).classList.add('active');
}

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ---------- CARGA GENERAL ----------
async function loadAll(){
  const settings = await DB.getSettings();
  fillSettingsForm(settings);

  ADMIN_PRODUCTS = await DB.getProducts();
  renderProductsTable();

  ADMIN_SALES = await DB.getSales();
  renderDashboard();
}

// ---------- ESCALONES DE PRECIO (formulario) ----------
function renderTierRows(){
  const box = document.getElementById('tierList');
  box.innerHTML = adminTiers.map((t, i) => `
    <div class="tier-row">
      <input type="number" min="1" placeholder="Desde qué cantidad" value="${t.minQty}" onchange="updateTier(${i},'minQty',this.value)" ${i===0 ? 'readonly' : ''}>
      <input type="number" min="0" placeholder="Precio por unidad" value="${t.price}" onchange="updateTier(${i},'price',this.value)">
      ${i === 0 ? '' : `<button type="button" onclick="removeTierRow(${i})">✕</button>`}
    </div>
  `).join('');
}
function updateTier(i, field, value){
  adminTiers[i][field] = field === 'price' ? Number(value) : Math.max(1, Number(value));
}
function addTierRow(){
  const lastQty = adminTiers.length ? adminTiers[adminTiers.length-1].minQty : 1;
  adminTiers.push({minQty: lastQty + 1, price:''});
  renderTierRows();
}
function removeTierRow(i){
  adminTiers.splice(i,1);
  renderTierRows();
}

function updateCostCalcNote(){
  const stock = Number(document.getElementById('prodStock').value || 0);
  const cost = Number(document.getElementById('prodTotalCost').value || 0);
  const note = document.getElementById('costCalcNote');
  if (stock > 0 && cost > 0){
    note.textContent = `Costo por unidad: ${formatMoney(cost/stock)}. Esto es solo de referencia — la ganancia se calcula comparando el total invertido contra el total vendido, no producto por producto.`;
  } else {
    note.textContent = '';
  }
}

// ---------- PRODUCTOS ----------
function renderProductsTable(){
  const body = document.getElementById('productsTableBody');
  if (ADMIN_PRODUCTS.length === 0){
    body.innerHTML = '<tr><td colspan="6">Todavía no cargaste productos.</td></tr>';
    return;
  }
  body.innerHTML = ADMIN_PRODUCTS.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.subcategory ? p.category + ' · ' + p.subcategory : p.category}</td>
      <td>${p.stockQty ?? 0} / ${p.originalStock ?? 0}</td>
      <td>${formatMoney(getBasePrice(p))}</td>
      <td>${p.active === false ? 'Oculto' : 'Publicado'}</td>
      <td class="tbl-actions">
        <button onclick="editProduct('${p.id}')">Editar</button>
        <button class="solid" onclick="markSold('${p.id}')">Vendí</button>
        <button class="danger" onclick="deleteProduct('${p.id}')">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function resetProductForm(){
  editingId = null;
  adminTiers = [{minQty:1, price:''}];
  document.getElementById('productFormTitle').textContent = 'Cargar nuevo producto';
  document.getElementById('prodId').value = '';
  document.getElementById('prodName').value = '';
  document.getElementById('prodCategory').value = '';
  document.getElementById('prodSubcategory').value = '';
  document.getElementById('prodStock').value = '';
  document.getElementById('prodTotalCost').value = '';
  document.getElementById('prodImage').value = '';
  document.getElementById('prodDesc').value = '';
  document.getElementById('prodActive').value = 'true';
  renderTierRows();
  updateCostCalcNote();
}

function editProduct(id){
  const p = ADMIN_PRODUCTS.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('productFormTitle').textContent = 'Editar producto';
  document.getElementById('prodId').value = p.id;
  document.getElementById('prodName').value = p.name;
  document.getElementById('prodCategory').value = p.category;
  document.getElementById('prodSubcategory').value = p.subcategory || '';
  document.getElementById('prodStock').value = p.stockQty ?? p.originalStock ?? 0;
  document.getElementById('prodTotalCost').value = p.totalCost ?? 0;
  document.getElementById('prodImage').value = p.image || '';
  document.getElementById('prodDesc').value = p.description || '';
  document.getElementById('prodActive').value = String(p.active !== false);
  adminTiers = (p.priceTiers && p.priceTiers.length) ? JSON.parse(JSON.stringify(p.priceTiers)) : [{minQty:1, price:0}];
  renderTierRows();
  updateCostCalcNote();
  window.scrollTo({top:0, behavior:'smooth'});
}

async function saveProductForm(){
  const name = document.getElementById('prodName').value.trim();
  const category = document.getElementById('prodCategory').value.trim();
  const subcategory = document.getElementById('prodSubcategory').value.trim();
  const stockInput = Number(document.getElementById('prodStock').value || 0);
  const totalCost = Number(document.getElementById('prodTotalCost').value || 0);
  const tiers = adminTiers
    .filter(t => t.price !== '' && !isNaN(t.price))
    .map(t => ({minQty: Number(t.minQty), price: Number(t.price)}))
    .sort((a,b) => a.minQty - b.minQty);

  if (!name || !category || tiers.length === 0){
    toast('Completá al menos nombre, categoría y un precio de venta.');
    return;
  }

  const existing = editingId ? ADMIN_PRODUCTS.find(x => x.id === editingId) : null;
  // Si es un producto nuevo, el stock cargado = stock actual. Si estás editando,
  // solo reemplazamos el stock si el número cambió (para no perder ventas ya registradas).
  const product = {
    id: editingId,
    name, category, subcategory,
    totalCost,
    originalStock: existing ? Math.max(existing.originalStock || 0, stockInput) : stockInput,
    stockQty: stockInput,
    priceTiers: tiers,
    image: document.getElementById('prodImage').value.trim(),
    description: document.getElementById('prodDesc').value.trim(),
    active: document.getElementById('prodActive').value === 'true'
  };
  await DB.saveProduct(product);
  toast('Producto guardado.');
  resetProductForm();
  ADMIN_PRODUCTS = await DB.getProducts();
  renderProductsTable();
}

async function deleteProduct(id){
  if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
  await DB.deleteProduct(id);
  ADMIN_PRODUCTS = await DB.getProducts();
  renderProductsTable();
  toast('Producto eliminado.');
}

// Registra una venta real: pide cuántas unidades vendiste, calcula el precio
// según el escalón correspondiente a esa cantidad, y descuenta del stock.
async function markSold(id){
  const p = ADMIN_PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const available = p.stockQty ?? 0;
  const input = prompt(`¿Cuántas unidades de "${p.name}" vendiste? (Stock disponible: ${available})`, '1');
  if (input === null) return;
  const qty = Number(input);
  if (!qty || qty <= 0){ toast('Cantidad inválida.'); return; }
  if (qty > available){ toast(`Solo tenés ${available} unidades en stock.`); return; }

  const unitPrice = getUnitPrice(p, qty);
  const revenue = unitPrice * qty;

  await DB.addSale({
    productId: p.id,
    productName: p.name,
    category: p.category,
    qty,
    unitPrice,
    revenue
  });

  await DB.saveProduct({...p, id: p.id, stockQty: available - qty});

  toast(`Venta registrada: ${qty} x ${p.name} = ${formatMoney(revenue)}`);
  ADMIN_PRODUCTS = await DB.getProducts();
  renderProductsTable();
  ADMIN_SALES = await DB.getSales();
  renderDashboard();
}

// Borra todo el historial de ventas (ej: para sacar datos de prueba/ejemplo).
// No modifica el stock ni los productos — si alguna venta de prueba había
// descontado stock, corregilo a mano en Productos después de borrar.
async function clearSalesHistory(){
  if (ADMIN_SALES.length === 0){ toast('No hay ventas registradas.'); return; }
  const ok1 = confirm(`Esto va a borrar las ${ADMIN_SALES.length} ventas registradas (no se puede deshacer). ¿Continuar?`);
  if (!ok1) return;
  const ok2 = confirm('Confirmá de nuevo: se va a vaciar todo el historial de ventas y ganancias. ¿Seguro?');
  if (!ok2) return;

  await DB.clearSales();
  ADMIN_SALES = [];
  renderDashboard();
  toast('Historial de ventas borrado.');
}

// ---------- VENTAS Y GANANCIAS (ganancia real: vendido - invertido) ----------
function renderDashboard(){
  const wStart = startOfWeek();
  const mStart = startOfMonth();

  const weekSales = ADMIN_SALES.filter(s => new Date(s.date) >= wStart);
  const monthSales = ADMIN_SALES.filter(s => new Date(s.date) >= mStart);
  const weekInvested = ADMIN_PRODUCTS.filter(p => p.dateAdded && new Date(p.dateAdded) >= wStart);
  const monthInvested = ADMIN_PRODUCTS.filter(p => p.dateAdded && new Date(p.dateAdded) >= mStart);

  const sumRevenue = arr => arr.reduce((a,s) => a + Number(s.revenue || 0), 0);
  const sumCost = arr => arr.reduce((a,p) => a + Number(p.totalCost || 0), 0);

  setStat('statWeekSales', sumRevenue(weekSales));
  setStat('statWeekCost', sumCost(weekInvested));
  setStatProfit('statWeekProfit', sumRevenue(weekSales) - sumCost(weekInvested));

  setStat('statMonthSales', sumRevenue(monthSales));
  setStat('statMonthCost', sumCost(monthInvested));
  setStatProfit('statMonthProfit', sumRevenue(monthSales) - sumCost(monthInvested));

  const totalRevenue = sumRevenue(ADMIN_SALES);
  const totalCost = sumCost(ADMIN_PRODUCTS);
  setStat('statTotalSales', totalRevenue);
  setStat('statTotalCost', totalCost);
  setStatProfit('statTotalProfit', totalRevenue - totalCost);

  const body = document.getElementById('salesTableBody');
  if (ADMIN_SALES.length === 0){
    body.innerHTML = '<tr><td colspan="5">Todavía no registraste ventas.</td></tr>';
    return;
  }
  body.innerHTML = ADMIN_SALES.slice(0,150).map(s => `
    <tr>
      <td>${new Date(s.date).toLocaleDateString('es-AR')}</td>
      <td>${s.productName}</td>
      <td>${s.qty}</td>
      <td>${formatMoney(s.unitPrice)}</td>
      <td>${formatMoney(s.revenue)}</td>
    </tr>
  `).join('');
}
function setStat(id, value){
  document.getElementById(id).textContent = formatMoney(value);
}
function setStatProfit(id, value){
  const el = document.getElementById(id);
  el.textContent = formatMoney(value);
  el.closest('.stat-card').classList.toggle('negative', value < 0);
}

// ---------- AJUSTES DEL SITIO ----------
function fillSettingsForm(s){
  document.getElementById('setStoreName').value = s.storeName;
  document.getElementById('setWhatsapp').value = s.whatsappNumber;
  document.getElementById('setHeroTitle').value = s.heroTitle;
  document.getElementById('setHeroSubtitle').value = s.heroSubtitle;
  document.getElementById('setLogoUrl').value = s.logoUrl;
  document.getElementById('setHeroImage').value = s.heroImage;
  document.getElementById('setInstagram').value = s.instagram;
  document.getElementById('setSchedule').value = s.schedule;
  document.getElementById('setShipping').value = s.shippingInfo;
  document.getElementById('setColorBg').value = s.colorBg;
  document.getElementById('setColorBgSoft').value = s.colorBgSoft;
  document.getElementById('setColorBrown').value = s.colorBrown;
  document.getElementById('setColorBrownDeep').value = s.colorBrownDeep;
  document.getElementById('setColorOlive').value = s.colorOlive;
}

async function saveSettingsForm(){
  const data = {
    storeName: document.getElementById('setStoreName').value.trim(),
    whatsappNumber: document.getElementById('setWhatsapp').value.trim(),
    heroTitle: document.getElementById('setHeroTitle').value.trim(),
    heroSubtitle: document.getElementById('setHeroSubtitle').value.trim(),
    logoUrl: document.getElementById('setLogoUrl').value.trim(),
    heroImage: document.getElementById('setHeroImage').value.trim(),
    instagram: document.getElementById('setInstagram').value.trim(),
    schedule: document.getElementById('setSchedule').value.trim(),
    shippingInfo: document.getElementById('setShipping').value.trim(),
    colorBg: document.getElementById('setColorBg').value,
    colorBgSoft: document.getElementById('setColorBgSoft').value,
    colorBrown: document.getElementById('setColorBrown').value,
    colorBrownDeep: document.getElementById('setColorBrownDeep').value,
    colorOlive: document.getElementById('setColorOlive').value
  };
  await DB.saveSettings(data);
  SETTINGS = {...SETTINGS, ...data};
  applySettingsToPage();
  toast('Cambios guardados. Ya se ven reflejados en la tienda.');
}

// ---------- CAMBIO DE CONTRASEÑA ----------
async function changePassword(){
  const current = document.getElementById('passCurrent').value;
  const next = document.getElementById('passNew').value;
  const errorBox = document.getElementById('passError');
  errorBox.textContent = '';

  if (!next || next.length < 4){
    errorBox.textContent = 'La nueva contraseña debe tener al menos 4 caracteres.';
    return;
  }

  if (DEMO_MODE){
    const saved = localStorage.getItem('ys_admin_password') || '12345';
    if (current !== saved){
      errorBox.textContent = 'La contraseña actual no es correcta.';
      return;
    }
    localStorage.setItem('ys_admin_password', next);
    toast('Contraseña actualizada.');
    document.getElementById('passCurrent').value = '';
    document.getElementById('passNew').value = '';
    return;
  }

  try {
    const user = auth.currentUser;
    const cred = firebase.auth.EmailAuthProvider.credential(ADMIN_EMAIL, current);
    await user.reauthenticateWithCredential(cred);
    await user.updatePassword(next);
    toast('Contraseña actualizada.');
    document.getElementById('passCurrent').value = '';
    document.getElementById('passNew').value = '';
  } catch (e) {
    errorBox.textContent = 'La contraseña actual no es correcta.';
  }
}

// Recalcula la nota de costo por unidad cada vez que cambian esos campos.
document.addEventListener('input', e => {
  if (e.target && (e.target.id === 'prodStock' || e.target.id === 'prodTotalCost')){
    updateCostCalcNote();
  }
});
