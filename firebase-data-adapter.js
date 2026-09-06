/* Firebase Web SDK adapter. No Admin credentials belong in this file. */
(() => {
  const cfg = window.MAKHZANI_FIREBASE_CONFIG || {};
  const valid = cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId;
  let auth, db;
  if (valid) { const app = firebase.initializeApp(cfg); auth = firebase.auth(app); db = firebase.firestore(app); }
  let profile = null;
  let profilePromise = Promise.resolve(null);
  if (auth) auth.onAuthStateChanged(u => { profilePromise = u ? db.collection('users').doc(u.uid).get().then(s => { profile = s.exists ? s.data() : null; if (profile?.branchId) sessionStorage.setItem('makhzani.branchId', profile.branchId); return profile; }) : Promise.resolve(null); if (!u) { profile = null; sessionStorage.removeItem('makhzani.auth.v1'); sessionStorage.removeItem('makhzani.online'); sessionStorage.removeItem('makhzani.branchId'); document.body.classList.add('auth-locked'); } });
  if (db) db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
  const iso = v => v && typeof v.toDate === 'function' ? v.toDate().toISOString() : (v || new Date().toISOString());
  const textValue = (v, keys=[]) => { if(v==null) return ''; if(typeof v==='string' || typeof v==='number') return String(v).trim(); if(typeof v==='object'){ for(const k of keys) { const x=textValue(v[k]); if(x)return x; } } return ''; };
  const user = () => auth && auth.currentUser;
  const branch = async () => { const p = await profilePromise; const id = p?.branchId || sessionStorage.getItem('makhzani.branchId'); if (!id) throw Error('لا يوجد فرع مرتبط بهذا المستخدم'); return id; };
  const map = d => { const v=d.data(); const created=iso(v.createdAt || v.date); return { id:d.id, ...v, createdAt:created, updatedAt:iso(v.updatedAt), date:iso(v.date || v.createdAt) }; };
  async function snapshot(){ if(!valid) throw Error('FIREBASE_NOT_CONFIGURED'); const branchId=await branch(); const [p,m,c]=await Promise.all([db.collection('materials').where('branchId','==',branchId).where('isDeleted','==',false).get(),db.collection('stockMovements').where('branchId','==',branchId).limit(500).get(),db.collection('contacts').where('branchId','==',branchId).get()]); const transactions=m.docs.map(x=>({...map(x),productId:x.data().materialId,productName:x.data().materialName})).sort((a,b)=>new Date(b.date)-new Date(a.date)); return {products:p.docs.map(map),transactions,contacts:c.docs.map(map)}; }
  async function changeStock(materialId, delta, note, type) {
    if (!valid || !user()) throw Error('UNAUTHENTICATED');
    const branchId=await branch(), ref=db.collection('materials').doc(materialId), movement=db.collection('stockMovements').doc();
    await db.runTransaction(async tx => { const snap=await tx.get(ref); if(!snap.exists || snap.data().isDeleted || snap.data().branchId!==branchId) throw Error('المنتج غير موجود في فرعك'); const before=Number(snap.data().quantity||0), after=before+delta; tx.update(ref,{quantity:after,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:user().uid}); tx.set(movement,{branchId,materialId,materialName:snap.data().name,type,quantity:Math.abs(delta),previousQuantity:before,newQuantity:after,note:note||'',createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdBy:user().uid,userName:user().email||''}); });
    return {ok:true};
  }
  async function deleteMaterial(id) { if(!valid || !user()) throw Error('UNAUTHENTICATED'); const branchId=await branch(); await db.collection('materials').doc(id).set({isDeleted:true,branchId,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:user().uid},{merge:true}); }
  async function saveMonthlyCount(month, rows) {
    if (!valid || !db || !user()) throw Error('UNAUTHENTICATED');
    if (!month) throw Error('يرجى اختيار الشهر');
    if (!Array.isArray(rows)) throw Error('بيانات الجرد غير صالحة');
    const uid = user().uid;
    const branchId = await branch();
    const ref = db.collection('monthlyInventories').doc(month);
    const now = firebase.firestore.FieldValue.serverTimestamp();
    await ref.set({ month, branchId, updatedAt: now, approvedAt: now, updatedBy: uid, approvedBy: uid, itemCount: rows.length }, { merge: true });
    const batch = db.batch();
    rows.forEach(r => {
      if (!r.productId) return;
      batch.set(ref.collection('items').doc(String(r.productId)), {
        productId: String(r.productId), sku: r.sku || '', name: r.name || '', unit: r.unit || '',
        branchId,
        openingQuantity: Number(r.openingQuantity ?? r.opening ?? 0), inbound: Number(r.inbound ?? r.ins ?? 0),
        outbound: Number(r.outbound ?? r.outs ?? 0), systemQuantity: Number(r.systemQuantity ?? r.expectedQuantity ?? 0),
        expectedQuantity: Number(r.expectedQuantity ?? r.systemQuantity ?? 0), actualQuantity: r.actualQuantity === '' || r.actualQuantity == null ? null : Number(r.actualQuantity),
        difference: r.difference == null ? null : Number(r.difference), status: r.status || '', notes: r.notes || r.note || '',
        savedAt: now, savedBy: uid
      }, { merge: true });
    });
    await batch.commit();
    return { ok: true, month, count: rows.length };
  }
  async function listBranchesUsers() {
    if (!valid || !user()) throw Error('UNAUTHENTICATED');
    const [b, u] = await Promise.all([db.collection('branches').get(), db.collection('users').get()]);
    return { branches: b.docs.map(map), users: u.docs.map(map) };
  }
  async function createBranch(id, name) {
    if (!valid || !user()) throw Error('UNAUTHENTICATED');
    if (!id || !name) throw Error('بيانات الفرع ناقصة');
    await db.collection('branches').doc(id).set({ name, active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: user().uid }, { merge: false });
  }
  async function migrateLegacyData(targetBranch='branch-main') {
    if (!valid || !user()) throw Error('UNAUTHENTICATED');
    const [p,m,c] = await Promise.all([db.collection('materials').get(), db.collection('stockMovements').get(), db.collection('contacts').get()]);
    const batch=db.batch(); let count=0;
    [p,m,c].forEach(col=>col.docs.forEach(d=>{ if (!d.data().branchId) { batch.set(d.ref,{branchId:targetBranch},{merge:true}); count++; } }));
    if (count) await batch.commit();
    return count;
  }
  async function deleteBranchMovements(password) { if (!valid || !user() || !user().email) throw Error('يجب استخدام حساب المدير ببريد وكلمة مرور'); const p=await profilePromise; if(p?.role!=='admin') throw Error('هذه العملية متاحة للمدير فقط'); const cred=firebase.auth.EmailAuthProvider.credential(user().email,password||''); await user().reauthenticateWithCredential(cred); const branchId=await branch(), snap=await db.collection('stockMovements').where('branchId','==',branchId).get(); let batch=db.batch(), pending=0; for (const d of snap.docs) { batch.delete(d.ref); pending++; if(pending===400){await batch.commit(); batch=db.batch(); pending=0;} } if(pending) await batch.commit(); return snap.size; }
  async function deleteContact(id) { if(!valid || !user()) throw Error('UNAUTHENTICATED'); const branchId=await branch(), ref=db.collection('contacts').doc(id), snap=await ref.get(), p=await profilePromise; if(!snap.exists || (snap.data().branchId!==branchId && !(p?.role==='admin' && !snap.data().branchId))) throw Error('جهة الاتصال غير موجودة في فرعك'); await ref.delete(); return {ok:true}; }
  async function allocateProductCode(categoryName, requestedCode) {
    if(!valid || !user()) throw Error('UNAUTHENTICATED'); const branchId=await branch(); const code=String(requestedCode||'').trim(); const name=String(categoryName||'').trim(); if(!name) throw Error('اسم التصنيف مطلوب');
    const key=encodeURIComponent(`${branchId}__${name}`), ref=db.collection('categories').doc(key), result={};
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref); const d=snap.exists?snap.data():null;
      let codePrefix=textValue(d?.codePrefix,['codePrefix','categoryCode','code','prefix']) || textValue(d?.categoryCode,['codePrefix','categoryCode','code','prefix']) || textValue(code,['codePrefix','categoryCode','code','prefix']);
      if(!codePrefix) throw Error('CATEGORY_PREFIX_REQUIRED');
      let last=Number(d?.lastSequence||d?.nextSequence-1||0);
      const old=await tx.get(db.collection('materials').where('branchId','==',branchId));
      const escaped=codePrefix.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&');
      const pattern=new RegExp(`^${escaped}-([0-9]+)$`);
      const categoryId=textValue(d?.categoryId,['id','categoryId']) || key;
      old.docs.forEach(x=>{ const p=x.data(), linked=String(p.categoryId||'')===categoryId || String(p.category||p.categoryName||'').trim()===name; if(!linked) return; const m=String(p.sku||p.productCode||p.code||'').trim().match(pattern); if(m) last=Math.max(last,Number(m[1])); });
      const next=last+1; result.categoryId=categoryId; result.categoryName=textValue(d?.categoryName,['name','categoryName'])||name; result.codePrefix=codePrefix; result.categoryCode=codePrefix; result.lastSequence=next; result.sku=`${codePrefix}-${String(next).padStart(3,'0')}`;
      tx.set(ref,{branchId,categoryId,categoryName:result.categoryName,codePrefix,categoryCode:codePrefix,lastSequence:next,nextSequence:next+1,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    });
    return result;
  }
  async function previewProductCode(categoryName) {
    if(!valid || !user()) throw Error('UNAUTHENTICATED'); const branchId=await branch(), name=String(categoryName||'').trim(); if(!name) return null;
    const key=encodeURIComponent(`${branchId}__${name}`), snap=await db.collection('categories').doc(key).get(), d=snap.exists?snap.data():null;
    let prefix=textValue(d?.codePrefix,['codePrefix','categoryCode','code','prefix']) || textValue(d?.categoryCode,['codePrefix','categoryCode','code','prefix']), last=Number(d?.lastSequence||d?.nextSequence-1||0);
    const old=await db.collection('materials').where('branchId','==',branchId).get();
    const categoryId=textValue(d?.categoryId,['id','categoryId']) || key;
    const linked=p=>textValue(p.categoryId,['id','categoryId'])===categoryId || textValue(p.category,['name','categoryName'])===name || textValue(p.categoryName,['name','categoryName'])===name;
    if(!prefix){ old.docs.forEach(x=>{const p=x.data(); if(!linked(p))return; const s=String(p.sku||p.productCode||p.code||'').trim(); const i=s.lastIndexOf('-'); if(i>0 && /^\d+$/.test(s.slice(i+1))) prefix=s.slice(0,i); }); }
    if(prefix){ const escaped=prefix.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&'), pattern=new RegExp(`^${escaped}-([0-9]+)$`); old.docs.forEach(x=>{const p=x.data(); if(!linked(p))return; const m=String(p.sku||p.productCode||p.code||'').trim().match(pattern); if(m) last=Math.max(last,Number(m[1])); }); }
    console.debug('[Makhzani] product-code preview', {categoryId, categoryName:name, prefix, productCount:old.size, codes:old.docs.map(x=>x.data()).filter(linked).map(p=>p.sku||p.productCode||p.code).filter(Boolean), maxSequence:last, nextSku:prefix?`${prefix}-${String(last+1).padStart(3,'0')}`:null});
    if(!prefix) return null; const next=last+1; return {categoryId,categoryName:textValue(d?.categoryName,['name','categoryName'])||name,codePrefix:prefix,sku:`${prefix}-${String(next).padStart(3,'0')}`};
  }
  window.MakhzaniWeb = {
    async anonymousLogin(){ if(!valid) throw Error('FIREBASE_NOT_CONFIGURED'); const r=await auth.signInAnonymously(); sessionStorage.setItem('makhzani.auth.v1','1'); sessionStorage.setItem('makhzani.online','1'); return r; },
    async login(email,password){ if(!valid) throw Error('FIREBASE_NOT_CONFIGURED'); const r=await auth.signInWithEmailAndPassword(email,password); sessionStorage.setItem('makhzani.web.token',r.user.uid); profile=await db.collection('users').doc(r.user.uid).get().then(s=>s.exists?s.data():null); if(!profile?.branchId) { await auth.signOut(); throw Error('لا يوجد فرع مرتبط بهذا المستخدم'); } profilePromise=Promise.resolve(profile); sessionStorage.setItem('makhzani.branchId',profile.branchId); return {user:r.user,profile}; },
    logout(){ return auth && auth.signOut(); }, snapshot, changeStock, deleteMaterial, saveMonthlyCount, listBranchesUsers, createBranch, migrateLegacyData, deleteBranchMovements, deleteContact, allocateProductCode, previewProductCode,
    saveSnapshot: async s => { if(!valid || !user()) throw Error('UNAUTHENTICATED'); const branchId=await branch(), batch=db.batch(), now=firebase.firestore.FieldValue.serverTimestamp(); (s.products||[]).forEach(p=>{ const safe={...p,category:textValue(p.category,['name','categoryName']),categoryId:textValue(p.categoryId,['id','categoryId']),categoryName:textValue(p.categoryName,['name','categoryName']),categoryCode:textValue(p.categoryCode,['code','categoryCode','codePrefix']),codePrefix:textValue(p.codePrefix,['codePrefix','categoryCode','code']),sku:textValue(p.sku,['sku','productCode','code']),branchId,isDeleted:false,updatedAt:now,updatedBy:user().uid}; batch.set(db.collection('materials').doc(p.id),safe,{merge:true}); }); (s.transactions||[]).forEach(t=>{ const ref=db.collection('stockMovements').doc(t.id); const data={branchId,materialId:textValue(t.productId,['id','materialId']),materialName:textValue(t.productName,['name','materialName']),type:textValue(t.type,['type']),quantity:Number(t.quantity||0),previousQuantity:t.previousQuantity ?? null,newQuantity:t.newQuantity ?? null,note:textValue(t.note,['text','note']),createdBy:user().uid,userName:user().email||''}; if(t.createdAt || t.date) data.createdAt=firebase.firestore.Timestamp.fromDate(new Date(t.createdAt || t.date)); batch.set(ref,data,{merge:true}); }); (s.contacts||[]).forEach(c=>batch.set(db.collection('contacts').doc(c.id),{...c,branchId,updatedAt:now,updatedBy:user().uid},{merge:true})); await batch.commit(); },
    connectRealtime(onChange){ if(!valid) return ()=>{}; let p=[],m=[],c=[]; const emit=()=>onChange({type:'snapshot.changed',remote:{products:p,transactions:m,contacts:c}}); let stops=[]; branch().then(branchId=>{ const fail=e=>console.error('Firebase realtime:',e); stops=[db.collection('materials').where('branchId','==',branchId).where('isDeleted','==',false).onSnapshot(x=>{p=x.docs.map(map);emit();},fail),db.collection('stockMovements').where('branchId','==',branchId).limit(500).onSnapshot(x=>{m=x.docs.map(y=>({...map(y),productId:y.data().materialId,productName:y.data().materialName})).sort((a,b)=>new Date(b.date)-new Date(a.date));emit();},fail),db.collection('contacts').where('branchId','==',branchId).onSnapshot(x=>{c=x.docs.map(map);emit();},fail)]; }).catch(e=>console.error('Firebase branch:',e)); return ()=>stops.forEach(stop=>stop()); }
  };
  // تصدير صريح لضمان توفر الدالة حتى مع النسخ القديمة المخزنة مؤقتًا.
  window.MakhzaniWeb.saveMonthlyCount = saveMonthlyCount;
})();
