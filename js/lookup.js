// ===== PRODUCT LOOKUP =====

async function searchLocalDB(ean) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await db.from('products').select('*').eq('ean', ean).limit(1);
  return data && data.length > 0 ? data[0] : null;
}

async function searchOpenFoodFacts(ean) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${ean}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    return {
      ean,
      name: p.product_name || p.generic_name || 'Produto sem nome',
      brand: p.brands || '',
      image_url: p.image_url || p.image_front_url || '',
      price: null,
      source: 'openfoodfacts'
    };
  } catch { return null; }
}

async function searchBluesoft(ean) {
  try {
    const res = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${ean}`, {
      headers: { 'X-Cosmos-Token': BLUESOFT_TOKEN }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.description) return null;
    return {
      ean,
      name: data.description || 'Produto sem nome',
      brand: data.brand?.name || '',
      image_url: data.thumbnail || '',
      price: data.avg_price || null,
      source: 'bluesoft'
    };
  } catch { return null; }
}

async function saveProductToDB(product) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await db.from('products').insert({
    ...product,
    user_id: user.id
  }).select().single();
  if (error) { console.error('Save product error:', error); return null; }
  return data;
}

async function lookupProduct(ean) {
  const local = await searchLocalDB(ean);
  if (local) return { product: local, isNew: false };

  const off = await searchOpenFoodFacts(ean);
  if (off) {
    const saved = await saveProductToDB(off);
    return { product: saved || off, isNew: true };
  }

  const blue = await searchBluesoft(ean);
  if (blue) {
    const saved = await saveProductToDB(blue);
    return { product: saved || blue, isNew: true };
  }

  return { product: null, isNew: false };
}

async function getLastPurchaseForEan(ean) {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await db.from('purchases')
    .select('*')
    .eq('product_ean', ean)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);
  return data && data.length > 0 ? data[0] : null;
}
