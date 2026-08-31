/* ==========================================================
   DB — capa de datos compartida por store.js y admin.js
   Si Firebase está configurado (js/firebase-config.js), usa
   Firestore: los datos se ven en cualquier dispositivo.
   Si no, cae en "modo demo" con datos de ejemplo en localStorage.

   MODELO DE PRODUCTO (nuevo):
   {
     id, name, category, subcategory,
     originalStock,   // unidades que compraste en esta carga
     stockQty,        // unidades que te quedan sin vender
     totalCost,       // plata total que gastaste en esa compra
     priceTiers: [ {minQty:1, price:18500}, {minQty:3, price:17000}, ... ],
     image, description, active, dateAdded
   }

   MODELO DE VENTA:
   { productId, productName, category, qty, unitPrice, revenue, date }
   ========================================================== */

const DEFAULT_SETTINGS = {
  storeName: "Yerbas Santa",
  heroTitle: "Yerba, mates y ritual, como siempre fue.",
  heroSubtitle: "Mates artesanales, bombillas y yerbas seleccionadas para tu ronda de todos los días. Hecho a mano, pensado para durar.",
  heroImage: "assets/logo.png",
  logoUrl: "assets/logo.png",
  whatsappNumber: "5491100000000",
  instagram: "yerbas.santa",
  address: "Retiro en punto a coordinar",
  schedule: "Lunes a sábados de 9 a 19 hs.",
  shippingInfo: "Coordinamos envío a todo el país por correo o cadetería local.",
  colorBg: "#E7D2A6",
  colorBgSoft: "#F1E3C3",
  colorBrown: "#5B3822",
  colorBrownDeep: "#3A2213",
  colorOlive: "#4B5320"
};

const DEFAULT_PRODUCTS = [
  {id:"demo1", name:"Mate Imperial Torpedo", category:"Mates", subcategory:"Torpedo", originalStock:5, stockQty:5, totalCost:45000, priceTiers:[{minQty:1,price:18500}], image:"", description:"Mate de calabaza torpedo, terminación en alpaca.", active:true, dateAdded:new Date().toISOString()},
  {id:"demo2", name:"Mate Camionero Alpaca", category:"Mates", subcategory:"Camionero", originalStock:4, stockQty:4, totalCost:44000, priceTiers:[{minQty:1,price:22000}], image:"", description:"Mate camionero forrado en cuero con virola de alpaca.", active:true, dateAdded:new Date().toISOString()},
  {id:"demo3", name:"Bombilla Acero Recta", category:"Bombillas", subcategory:"", originalStock:10, stockQty:10, totalCost:28000, priceTiers:[{minQty:1,price:6800},{minQty:3,price:6200},{minQty:6,price:5800}], image:"", description:"Bombilla de acero inoxidable con filtro cesta.", active:true, dateAdded:new Date().toISOString()},
  {id:"demo4", name:"Yerba Suave 1kg", category:"Yerbas", subcategory:"", originalStock:20, stockQty:20, totalCost:42000, priceTiers:[{minQty:1,price:4200},{minQty:5,price:3900}], image:"", description:"Yerba suave con palo, ideal para empezar el día.", active:true, dateAdded:new Date().toISOString()}
];

const DB = {

  // ---------- SETTINGS ----------
  async getSettings(){
    if (DEMO_MODE){
      const saved = localStorage.getItem('ys_settings');
      return saved ? {...DEFAULT_SETTINGS, ...JSON.parse(saved)} : DEFAULT_SETTINGS;
    }
    const doc = await db.collection('settings').doc('main').get();
    return doc.exists ? {...DEFAULT_SETTINGS, ...doc.data()} : DEFAULT_SETTINGS;
  },

  async saveSettings(data){
    if (DEMO_MODE){
      localStorage.setItem('ys_settings', JSON.stringify(data));
      return;
    }
    await db.collection('settings').doc('main').set(data, {merge:true});
  },

  // ---------- PRODUCTS ----------
  async getProducts(){
    if (DEMO_MODE){
      const saved = localStorage.getItem('ys_products');
      return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
    }
    const snap = await db.collection('products').orderBy('name').get();
    return snap.docs.map(d => ({id:d.id, ...d.data()}));
  },

  async saveProduct(product){
    if (!product.dateAdded) product.dateAdded = new Date().toISOString();
    if (DEMO_MODE){
      let list = JSON.parse(localStorage.getItem('ys_products') || JSON.stringify(DEFAULT_PRODUCTS));
      if (product.id){
        list = list.map(p => p.id === product.id ? {...p, ...product} : p);
      } else {
        product.id = 'p' + Date.now();
        list.push(product);
      }
      localStorage.setItem('ys_products', JSON.stringify(list));
      return product.id;
    }
    if (product.id){
      const id = product.id;
      const data = {...product}; delete data.id;
      await db.collection('products').doc(id).set(data, {merge:true});
      return id;
    } else {
      const data = {...product}; delete data.id;
      const ref = await db.collection('products').add(data);
      return ref.id;
    }
  },

  async deleteProduct(id){
    if (DEMO_MODE){
      let list = JSON.parse(localStorage.getItem('ys_products') || JSON.stringify(DEFAULT_PRODUCTS));
      list = list.filter(p => p.id !== id);
      localStorage.setItem('ys_products', JSON.stringify(list));
      return;
    }
    await db.collection('products').doc(id).delete();
  },

  // ---------- SALES ----------
  async getSales(){
    if (DEMO_MODE){
      const saved = localStorage.getItem('ys_sales');
      return saved ? JSON.parse(saved) : [];
    }
    const snap = await db.collection('sales').orderBy('date','desc').limit(500).get();
    return snap.docs.map(d => ({id:d.id, ...d.data()}));
  },

  async addSale(sale){
    sale.date = new Date().toISOString();
    if (DEMO_MODE){
      const list = JSON.parse(localStorage.getItem('ys_sales') || '[]');
      sale.id = 's' + Date.now();
      list.unshift(sale);
      localStorage.setItem('ys_sales', JSON.stringify(list));
      return;
    }
    await db.collection('sales').add(sale);
  },

  // Borra TODO el historial de ventas (no toca productos ni stock).
  async clearSales(){
    if (DEMO_MODE){
      localStorage.removeItem('ys_sales');
      return;
    }
    const snap = await db.collection('sales').get();
    // Firestore permite hasta 500 borrados por lote; para una tienda
    // chica alcanza de sobra, pero lo dividimos igual por las dudas.
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 450){
      const batch = db.batch();
      docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }
};

// ---------- Helpers de fecha ----------
function startOfWeek(d = new Date()){
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // lunes = 0
  date.setHours(0,0,0,0);
  date.setDate(date.getDate() - day);
  return date;
}
function startOfMonth(d = new Date()){
  const date = new Date(d.getFullYear(), d.getMonth(), 1);
  date.setHours(0,0,0,0);
  return date;
}
function formatMoney(n){
  return '$' + Number(n || 0).toLocaleString('es-AR');
}

// ---------- Precio según cantidad (escalones cargados por el vendedor) ----------
// Devuelve el precio por unidad que corresponde para una cantidad dada.
function getUnitPrice(product, qty){
  const tiers = (product.priceTiers && product.priceTiers.length)
    ? [...product.priceTiers].sort((a,b) => a.minQty - b.minQty)
    : [{minQty:1, price:0}];
  let price = tiers[0].price;
  for (const t of tiers){
    if (qty >= t.minQty) price = t.price;
  }
  return price;
}
// Precio "base" a mostrar en la vidriera (cantidad = 1).
function getBasePrice(product){
  return getUnitPrice(product, 1);
}
