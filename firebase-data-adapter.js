/* Firebase Web SDK adapter. No Admin credentials belong in this file. */
(() => {
  const cfg = window.MAKHZANI_FIREBASE_CONFIG || {};
  const valid = cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId;
  let auth, db;
  if (valid) { const app = firebase.initializeApp(cfg); auth = firebase.auth(app); db = firebase.firestore(app); }
  if (auth) auth.onAuthStateChanged(u => { if (!u) { sessionStorage.removeItem('makhzani.auth.v1'); sessionStorage.removeItem('makhzani.online'); document.body.classList.add('auth-locked'); } });
  if (db) db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
  const iso = v => v && typeof v.toDate === 'function' ? v.toDate().toISOString() : (v || new Date().toISOString());
  const user = () => auth && auth.currentUser;
  const map = d => ({ id:d.id, ...d.data(), createdAt:iso(d.data().createdAt), updatedAt:iso(d.data().updatedAt), date:iso(d.data().date) });
  async function snapshot(){ if(!valid) throw Error('FIREBASE_NOT_CONFIGURED'); const [p,m,c]=await Promise.all([db.collection('materials').where('isDeleted','==',false).get(),db.collection('stockMovements').orderBy('createdAt','desc').limit(500).get(),db.collection('contacts').get()]); return {products:p.docs.map(map),transactions:m.docs.map(x=>({...map(x),productId:x.data().materialId,productName:x.data().materialName})),contacts:c.docs.map(map)}; }
  async function changeStock(materialId, delta, note, type) {
    if (!valid || !user()) throw Error('UNAUTHENTICATED');
    const ref=db.collection('materials').doc(materialId), movement=db.collection('stockMovements').doc();
    await db.runTransaction(async tx => { const snap=await tx.get(ref); if(!snap.exists || snap.data().isDeleted) throw Error('المنتج غير موجود'); const before=Number(snap.data().quantity||0), after=before+delta; tx.update(ref,{quantity:after,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:user().uid}); tx.set(movement,{materialId,materialName:snap.data().name,type,quantity:Math.abs(delta),previousQuantity:before,newQuantity:after,note:note||'',createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdBy:user().uid,userName:user().email||''}); });
    return {ok:true};
  }
  async function deleteMaterial(id) { if(!valid || !user()) throw Error('UNAUTHENTICATED'); await db.collection('materials').doc(id).set({isDeleted:true,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:user().uid},{merge:true}); }
  window.MakhzaniWeb = {
    async anonymousLogin(){ if(!valid) throw Error('FIREBASE_NOT_CONFIGURED'); const r=await auth.signInAnonymously(); sessionStorage.setItem('makhzani.auth.v1','1'); sessionStorage.setItem('makhzani.online','1'); return r; },
    async login(email,password){ if(!valid) throw Error('FIREBASE_NOT_CONFIGURED'); const r=await auth.signInWithEmailAndPassword(email,password); sessionStorage.setItem('makhzani.web.token',r.user.uid); return {user:r.user}; },
    logout(){ return auth && auth.signOut(); }, snapshot, changeStock, deleteMaterial,
    saveSnapshot: async s => { if(!valid || !user()) throw Error('UNAUTHENTICATED'); const batch=db.batch(), now=firebase.firestore.FieldValue.serverTimestamp(); (s.products||[]).forEach(p=>batch.set(db.collection('materials').doc(p.id),{...p,isDeleted:false,updatedAt:now,updatedBy:user().uid},{merge:true})); (s.transactions||[]).forEach(t=>batch.set(db.collection('stockMovements').doc(t.id),{materialId:t.productId,materialName:t.productName,type:t.type,quantity:t.quantity,previousQuantity:t.previousQuantity ?? null,newQuantity:t.newQuantity ?? null,note:t.note||'',createdAt:now,createdBy:user().uid,userName:user().email||''},{merge:true})); (s.contacts||[]).forEach(c=>batch.set(db.collection('contacts').doc(c.id),{...c,updatedAt:now,updatedBy:user().uid},{merge:true})); await batch.commit(); },
    connectRealtime(onChange){ if(!valid) return ()=>{}; let p=[],m=[],c=[]; const emit=()=>onChange({type:'snapshot.changed',remote:{products:p,transactions:m,contacts:c}}); const a=db.collection('materials').where('isDeleted','==',false).onSnapshot(x=>{p=x.docs.map(map);emit();},()=>{}); const b=db.collection('stockMovements').orderBy('createdAt','desc').limit(500).onSnapshot(x=>{m=x.docs.map(y=>({...map(y),productId:y.data().materialId,productName:y.data().materialName}));emit();},()=>{}); const d=db.collection('contacts').onSnapshot(x=>{c=x.docs.map(map);emit();},()=>{}); return ()=>{a();b();d();}; }
  };
})();
