import { defineStore } from 'pinia'
import { uuid, now, poSeq, soSeq, skuSeq } from '@/utils/helpers'

const STORAGE_KEY = 'stockos-db'

const defaultState = () => ({
  products: [], suppliers: [], clients: [], endCustomers: [],
  movements: [], purchaseOrders: [], salesOrders: [], categories: [],
  sPayments: [], pPayments: []
})

function migrateCategories(cats) {
  if (!cats || !cats.length) return cats || []
  if (typeof cats[0] === 'string')
    return cats.map(name => ({ id: uuid(), name, abr: name.substring(0,4).toUpperCase(), ref: '' }))
  return cats
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!data) return null
    data.categories   = migrateCategories(data.categories || [])
    data.endCustomers = data.endCustomers || []
    data.sPayments    = data.sPayments    || []
    data.pPayments    = data.pPayments    || []
    return data
  } catch { return null }
}

export const useDbStore = defineStore('db', {
  state: () => load() || defaultState(),
  getters: {
    getProduct:        s => id   => s.products.find(p => p.id === id),
    getSupplier:       s => id   => s.suppliers.find(x => x.id === id),
    getClient:         s => id   => s.clients.find(x => x.id === id),
    getEndCustomer:    s => id   => s.endCustomers.find(x => x.id === id),
    getCategoryById:   s => id   => s.categories.find(c => c.id === id),
    getCategoryByName: s => name => s.categories.find(c => c.name === name),
    lowStockItems:     s => s.products.filter(p => p.stock <= p.low_stock),
    pendingPOs:        s => s.purchaseOrders.filter(p => ['draft','sent','confirmed'].includes(p.status)).length,
    activeSOs:         s => s.salesOrders.filter(o => ['confirmed','processing','shipped'].includes(o.status)).length,
    totalStockValue:   s => s.products.reduce((a,p) => a + p.stock * p.buy_price, 0),
    totalSellValue:    s => s.products.reduce((a,p) => a + p.stock * p.sell_price, 0),
    totalRevenue:      s => s.salesOrders.filter(o => ['shipped','delivered'].includes(o.status)).reduce((a,o) => a + (o.total||0), 0),
    // payments helpers
    soPaymentTotal:    s => soId => s.sPayments.filter(p => p.order_id === soId).reduce((a,p) => a + (p.amount||0), 0),
    poPaymentTotal:    s => poId => s.pPayments.filter(p => p.order_id === poId).reduce((a,p) => a + (p.amount||0), 0),
  },

  actions: {
    persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.$state)) },

    // ── Products ──────────────────────────────────────────────────────────────
    saveProduct(data, editId = null) {
      if (!data.sku) data.sku = skuSeq(data.category || 'PRD')
      const n = now()
      if (editId) { const i = this.products.findIndex(p => p.id === editId); if (i > -1) this.products[i] = { ...this.products[i], ...data, updated_at: n } }
      else {
        const rec = { id: uuid(), ...data, stock: data.initial_stock || 0, created_at: n, updated_at: n }
        if (rec.initial_stock > 0) this.recordMovement({ product_id: rec.id, type: 'in', qty: rec.initial_stock, before: 0, after: rec.initial_stock, reason: 'Initial stock', ref: '' })
        this.products.push(rec)
      }
      this.persist()
    },
    deleteProduct(id) { this.products = this.products.filter(p => p.id !== id); this.persist() },

    // ── Categories ────────────────────────────────────────────────────────────
    saveCategory(data, editId = null) {
      if (editId) { const i = this.categories.findIndex(c => c.id === editId); if (i > -1) this.categories[i] = { ...this.categories[i], ...data } }
      else { if (!this.categories.find(c => c.name === data.name)) this.categories.push({ id: uuid(), name: data.name, abr: data.abr || data.name.substring(0,4).toUpperCase(), ref: data.ref || '' }) }
      this.persist()
    },
    deleteCategory(id) {
      const cat = this.categories.find(c => c.id === id); if (!cat) return
      this.categories = this.categories.filter(c => c.id !== id)
      this.products.forEach(p => { if (p.category === cat.name) p.category = '' })
      this.persist()
    },

    // ── Suppliers ─────────────────────────────────────────────────────────────
    saveSupplier(data, editId = null) {
      if (editId) { const i = this.suppliers.findIndex(s => s.id === editId); if (i > -1) this.suppliers[i] = { ...this.suppliers[i], ...data, updated_at: now() } }
      else this.suppliers.push({ id: uuid(), ...data, created_at: now() })
      this.persist()
    },
    deleteSupplier(id) {
      const linked = this.purchaseOrders.some(p => p.supplier_id === id)
      if (linked) throw new Error('Supplier has existing purchase orders and cannot be deleted.')
      this.suppliers = this.suppliers.filter(s => s.id !== id); this.persist()
    },

    // ── Clients ───────────────────────────────────────────────────────────────
    saveClient(data, editId = null) {
      if (editId) { const i = this.clients.findIndex(c => c.id === editId); if (i > -1) this.clients[i] = { ...this.clients[i], ...data, updated_at: now() } }
      else this.clients.push({ id: uuid(), ...data, created_at: now() })
      this.persist()
    },
    deleteClient(id) {
      const linked = this.salesOrders.some(o => o.client_id === id)
      if (linked) throw new Error('Client has existing sales orders and cannot be deleted.')
      this.clients = this.clients.filter(c => c.id !== id); this.persist()
    },

    // ── End Customers ─────────────────────────────────────────────────────────
    saveEndCustomer(data, editId = null) {
      if (editId) { const i = this.endCustomers.findIndex(c => c.id === editId); if (i > -1) this.endCustomers[i] = { ...this.endCustomers[i], ...data, updated_at: now() } }
      else this.endCustomers.push({ id: uuid(), ...data, created_at: now() })
      this.persist()
    },
    deleteEndCustomer(id) {
      const linked = this.salesOrders.some(o => o.end_customer_id === id)
      if (linked) throw new Error('End customer is linked to existing orders.')
      this.endCustomers = this.endCustomers.filter(c => c.id !== id); this.persist()
    },

    // ── Stock movements ───────────────────────────────────────────────────────
    recordMovement({ product_id, type, qty, before, after, reason, ref }) {
      this.movements.push({ id: uuid(), product_id, type, qty, before, after, reason, ref, created_at: now() })
    },
    adjustStock({ product_id, type, qty, reason, ref }) {
      const p = this.products.find(x => x.id === product_id); if (!p) return
      const before = p.stock
      const after = type === 'in' ? before + qty : type === 'out' ? Math.max(0, before - qty) : qty
      p.stock = after; p.updated_at = now()
      this.recordMovement({ product_id, type, qty, before, after, reason, ref })
      this.persist()
    },

    // ── Purchase Orders ───────────────────────────────────────────────────────
    upsertPO(data) {
      const i = this.purchaseOrders.findIndex(o => o.id === data.id)
      if (i > -1) this.purchaseOrders[i] = { ...this.purchaseOrders[i], ...data, updated_at: now() }
      else         this.purchaseOrders.push({ ...data, created_at: now() })
      this.persist()
    },
    receivePO(id) {
      const po = this.purchaseOrders.find(p => p.id === id); if (!po) return
      ;(po.lines || []).forEach(line => {
        if (!line.product_id || !line.qty) return
        const p = this.products.find(x => x.id === line.product_id); if (!p) return
        const before = p.stock; p.stock += line.qty; p.updated_at = now()
        if (line.price) p.buy_price = line.price
        this.recordMovement({ product_id: p.id, type: 'in', qty: line.qty, before, after: p.stock, reason: 'Purchase', ref: po.po_number })
      })
      po.status = 'received'; po.received_at = now(); this.persist()
    },
    deletePO(id) {
      const po = this.purchaseOrders.find(p => p.id === id); if (!po) return
      const hasLines = (po.lines || []).length > 0
      if (hasLines) throw new Error('Remove all lines before deleting this purchase order.')
      const hasPayments = this.pPayments.some(p => p.order_id === id)
      if (hasPayments) throw new Error('Confirm deletion of all payments first before deleting this order.')
      this.purchaseOrders = this.purchaseOrders.filter(p => p.id !== id); this.persist()
    },

    // ── Sales Orders ──────────────────────────────────────────────────────────
    upsertSO(data) {
      const i = this.salesOrders.findIndex(o => o.id === data.id)
      if (i > -1) this.salesOrders[i] = { ...this.salesOrders[i], ...data, updated_at: now() }
      else         this.salesOrders.push({ ...data, created_at: now() })
      this.persist()
    },
    fulfillSO(id) {
      const so = this.salesOrders.find(o => o.id === id); if (!so) return
      ;(so.lines || []).forEach(line => {
        if (!line.product_id || !line.qty) return
        const p = this.products.find(x => x.id === line.product_id); if (!p) return
        const before = p.stock; p.stock = Math.max(0, p.stock - line.qty); p.updated_at = now()
        this.recordMovement({ product_id: p.id, type: 'out', qty: line.qty, before, after: p.stock, reason: 'Sale', ref: so.so_number })
      })
      so.status = 'shipped'; so.shipped_at = now(); this.persist()
    },
    deliverSO(id) { const so = this.salesOrders.find(o => o.id === id); if (so) { so.status = 'delivered'; so.delivered_at = now(); this.persist() } },
    deleteSO(id) {
      const so = this.salesOrders.find(o => o.id === id); if (!so) return
      const hasLines = (so.lines || []).length > 0
      if (hasLines) throw new Error('Remove all lines before deleting this sales order.')
      const hasPayments = this.sPayments.some(p => p.order_id === id)
      if (hasPayments) throw new Error('Confirm deletion of all payments first before deleting this order.')
      this.salesOrders = this.salesOrders.filter(o => o.id !== id); this.persist()
    },

    // ── Sales Payments ────────────────────────────────────────────────────────
    saveSPayment(data, editId = null) {
      const n = now()
      if (editId) { const i = this.sPayments.findIndex(p => p.id === editId); if (i > -1) this.sPayments[i] = { ...this.sPayments[i], ...data } }
      else this.sPayments.push({ id: uuid(), date_created: n, ...data })
      this.persist()
    },
    deleteSPayment(id) { this.sPayments = this.sPayments.filter(p => p.id !== id); this.persist() },

    // ── Purchase Payments ─────────────────────────────────────────────────────
    savePPayment(data, editId = null) {
      const n = now()
      if (editId) { const i = this.pPayments.findIndex(p => p.id === editId); if (i > -1) this.pPayments[i] = { ...this.pPayments[i], ...data } }
      else this.pPayments.push({ id: uuid(), date_created: n, ...data })
      this.persist()
    },
    deletePPayment(id) { this.pPayments = this.pPayments.filter(p => p.id !== id); this.persist() },

    // ── Export helpers ────────────────────────────────────────────────────────
    exportJSON() {
      const blob = new Blob([JSON.stringify(this.$state,null,2)],{type:'application/json'})
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='stockos.json'; a.click()
    },

    // ── Seed ─────────────────────────────────────────────────────────────────
    seed() {
      const n = now()
      const CATS = [
        { id:uuid(), name:'Electronics',    abr:'ELEC', ref:'CAT-001' },
        { id:uuid(), name:'Office Supplies', abr:'OFFC', ref:'CAT-002' },
        { id:uuid(), name:'Peripherals',     abr:'PRPH', ref:'CAT-003' },
        { id:uuid(), name:'Networking',      abr:'NET',  ref:'CAT-004' },
        { id:uuid(), name:'Storage',         abr:'STOR', ref:'CAT-005' },
      ]
      CATS.forEach(c => { if (!this.categories.find(x => x.name===c.name)) this.categories.push(c) })

      const sups = [
        { id:uuid(), name:'TechDist Algérie',  contact:'Karim Hadj',     phone:'+213-21-234567', email:'contact@techdist.dz', address:'Alger Centre',  notes:'', created_at:n },
        { id:uuid(), name:'Office Pro SARL',   contact:'Amira Benali',   phone:'+213-31-345678', email:'amira@officepro.dz',  address:'Oran',          notes:'', created_at:n },
        { id:uuid(), name:'NetSolutions DZ',   contact:'Riad Boukhalfa', phone:'+213-41-456789', email:'riad@netsol.dz',      address:'Constantine',   notes:'', created_at:n },
      ]
      sups.forEach(s => this.suppliers.push(s))

      const cls = [
        { id:uuid(), full_name:'Entreprise Sarl Meziane', phone:'+213-550-111222', email:'youcef@meziane.dz', city:'Alger',       tax_id:'NIF-12345', address:'Rue Didouche Mourad', notes:'Long-term', is_active:true, created_at:n },
        { id:uuid(), full_name:'Nadia Touati & Associés', phone:'+213-661-333444', email:'nadia@touati.dz',   city:'Oran',        tax_id:'NIF-67890', address:'Boulevard Millénium', notes:'',          is_active:true, created_at:n },
        { id:uuid(), full_name:'Riad Systems EURL',       phone:'+213-770-555666', email:'riad@riadsys.dz',   city:'Constantine', tax_id:'',          address:'Zone Industrielle',   notes:'',          is_active:true, created_at:n },
        { id:uuid(), full_name:'Houria Benhamida',        phone:'+213-559-777888', email:'houria.b@gmail.com',city:'Annaba',      tax_id:'',          address:'',                    notes:'',          is_active:true, created_at:n },
      ]
      cls.forEach(c => this.clients.push(c))

      const ecs = [
        { id:uuid(), full_name:'Direction EPSP Alger',  phone:'+213-21-999000', email:'epsp@epsp.dz',     city:'Alger',  tax_id:'', address:'', notes:'', is_active:true, created_at:n },
        { id:uuid(), full_name:'Université Oran 1',     phone:'+213-41-888000', email:'uo1@univ-oran.dz', city:'Oran',   tax_id:'', address:'', notes:'', is_active:true, created_at:n },
      ]
      ecs.forEach(e => this.endCustomers.push(e))

      const prods = [
        {id:uuid(),name:'Laptop HP ProBook 450',sku:'ELC-0001',category:'Electronics',    unit:'pcs',supplier_id:sups[0].id,buy_price:85000, sell_price:98000, low_stock:3, stock:12,location:'A-01-1',description:'15.6" business laptop',active:true,created_at:n,updated_at:n},
        {id:uuid(),name:'Dell Monitor 24"',      sku:'ELC-0002',category:'Electronics',    unit:'pcs',supplier_id:sups[0].id,buy_price:42000, sell_price:52000, low_stock:4, stock:8, location:'A-01-2',description:'Full HD IPS',           active:true,created_at:n,updated_at:n},
        {id:uuid(),name:'Wireless Keyboard',     sku:'PER-0001',category:'Peripherals',    unit:'pcs',supplier_id:sups[0].id,buy_price:3500,  sell_price:4500,  low_stock:10,stock:3, location:'B-02-1',description:'Logitech MK270',          active:true,created_at:n,updated_at:n},
        {id:uuid(),name:'USB-C Hub 7-Port',      sku:'PER-0002',category:'Peripherals',    unit:'pcs',supplier_id:sups[0].id,buy_price:5200,  sell_price:6800,  low_stock:5, stock:0, location:'B-02-3',description:'Powered USB 3.0',          active:true,created_at:n,updated_at:n},
        {id:uuid(),name:'Cat6 Ethernet Cable',   sku:'NET-0001',category:'Networking',     unit:'pcs',supplier_id:sups[2].id,buy_price:800,   sell_price:1200,  low_stock:20,stock:45,location:'C-03-1',description:'Shielded patch cable',     active:true,created_at:n,updated_at:n},
        {id:uuid(),name:'TP-Link Switch 8P',     sku:'NET-0002',category:'Networking',     unit:'pcs',supplier_id:sups[2].id,buy_price:18000, sell_price:23000, low_stock:2, stock:6, location:'C-03-2',description:'TL-SG108E',               active:true,created_at:n,updated_at:n},
        {id:uuid(),name:'A4 Paper Box',          sku:'OFF-0001',category:'Office Supplies',unit:'box',supplier_id:sups[1].id,buy_price:2400,  sell_price:3000,  low_stock:10,stock:2, location:'D-04-1',description:'80g/m²',                  active:true,created_at:n,updated_at:n},
        {id:uuid(),name:'SSD 1TB Samsung 870',   sku:'STO-0001',category:'Storage',        unit:'pcs',supplier_id:sups[0].id,buy_price:22000, sell_price:28000, low_stock:5, stock:14,location:'A-02-1',description:'SATA III 2.5"',            active:true,created_at:n,updated_at:n},
      ]
      prods.forEach(p => { this.products.push(p); this.recordMovement({product_id:p.id,type:'in',qty:p.stock,before:0,after:p.stock,reason:'Initial stock',ref:'SEED'}) })

      this.salesOrders.push({id:uuid(),so_number:'SO-0001',client_id:cls[0].id,end_customer_id:ecs[0].id,status:'delivered',delivery_date:'2025-03-20',notes:'Urgent',lines:[{_id:uuid(),product_id:prods[0].id,qty:2,unit_price:98000,line_total:196000,confirmed:true},{_id:uuid(),product_id:prods[1].id,qty:2,unit_price:52000,line_total:104000,confirmed:true}],subtotal:300000,tax_pct:19,tax_amount:57000,total:357000,created_at:n})
      this.salesOrders.push({id:uuid(),so_number:'SO-0002',client_id:cls[1].id,end_customer_id:ecs[1].id,status:'confirmed',delivery_date:'2025-04-10',notes:'',      lines:[{_id:uuid(),product_id:prods[2].id,qty:5,unit_price:4500,line_total:22500,confirmed:true}],subtotal:22500,tax_pct:19,tax_amount:4275,total:26775,created_at:n})

      const so1id = this.salesOrders[this.salesOrders.length-2].id
      this.sPayments.push({id:uuid(),date_created:n,amount:200000,client_id:cls[0].id,order_id:so1id,notes:'Partial payment'})
      this.purchaseOrders.push({id:uuid(),po_number:'PO-0001',supplier_id:sups[0].id,expected_date:'2025-04-15',status:'confirmed',por:'',notes:'Urgent restock',lines:[{_id:uuid(),product_id:prods[2].id,qty:20,price:3400,confirmed:true},{_id:uuid(),product_id:prods[3].id,qty:10,price:5000,confirmed:true}],created_at:n})
      this.persist()
    }
  }
})
