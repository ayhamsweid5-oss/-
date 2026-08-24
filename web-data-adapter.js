/* Compatibility adapter: keeps the existing renderer API independent from storage. */
(() => {
  const config = { baseUrl: window.MAKHZANI_API_URL || ((location.protocol === 'http:' || location.protocol === 'https:') ? location.origin + '/api' : 'http://localhost:3000/api'), tokenKey: 'makhzani.web.token' };
  const token = () => sessionStorage.getItem(config.tokenKey) || localStorage.getItem(config.tokenKey);
  const request = async (path, options = {}) => { const t=token(); const r = await fetch(config.baseUrl + path, { ...options, headers: { 'Content-Type':'application/json', ...(options.headers||{}), ...(t ? {Authorization:`Bearer ${t}`} : {}) } }); if(!r.ok) throw new Error((await r.json().catch(()=>({}))).error || `HTTP_${r.status}`); return r.json(); };
  window.MakhzaniWeb = {
    config,
    async login(username,password){ const data=await request('/auth/login',{method:'POST',body:JSON.stringify({username,password})}); sessionStorage.setItem(config.tokenKey,data.token); return data; },
    logout(){ sessionStorage.removeItem(config.tokenKey); },
    products: { all:()=>request('/products'), create:p=>request('/products',{method:'POST',body:JSON.stringify(p)}) },
    transactions: { all:()=>request('/transactions'), create:t=>request('/transactions',{method:'POST',body:JSON.stringify(t)}) },
    contacts: { all:()=>request('/contacts'), create:c=>request('/contacts',{method:'POST',body:JSON.stringify(c)}) },
    snapshot: ()=>request('/snapshot'),
    saveSnapshot: snapshot=>request('/snapshot',{method:'PUT',body:JSON.stringify(snapshot)}),
    connectRealtime(onChange){ let active=true; const poll=async()=>{ try { await this.snapshot(); onChange({type:'snapshot.changed'}); } catch {} if(active) window.setTimeout(poll,5000); }; poll(); return ()=>{active=false}; }
  };
})();

