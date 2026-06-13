"use strict";
/* ── Prompt Library client ────────────────────────────────────────
   All writes are gated server-side by Supabase Row-Level Security.
   This file never trusts the client for authorization.            */

const CATEGORIES = ["Writing","Coding","Marketing","Image & Video","Business","Research","Productivity","Other"];

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => (
  {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

let sb = null, user = null, allPrompts = [], activeCat = "All", authMode = "login";

function toast(t){ const el=$("toast"); el.textContent=t; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2200); }
function configured(){ return window.SUPABASE_URL && !window.SUPABASE_URL.includes("YOUR_") && window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes("YOUR_"); }

/* ── Boot ── */
window.addEventListener("DOMContentLoaded", async () => {
  buildFilters(); buildCatSelect(); wireUI();
  if(!configured()){
    $("grid").innerHTML = "";
    $("empty").style.display="block";
    $("empty").innerHTML = "⚙ Not connected yet — add your Supabase URL + anon key in <b>config.js</b> (see README).";
    return;
  }
  sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  const { data:{ session } } = await sb.auth.getSession();
  setUser(session?.user || null);
  sb.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
  await loadPrompts();
});

function setUser(u){
  user = u;
  const name = u?.user_metadata?.display_name || u?.email || "";
  $("who").textContent = u ? `● ${name}` : "";
  $("newBtn").style.display = u ? "inline-flex" : "none";
  $("authBtn").textContent = u ? "Log Out" : "Log In";
  render();
}

/* ── Filters & selects ── */
function buildFilters(){
  const f = $("filters"); f.innerHTML="";
  ["All",...CATEGORIES].forEach(c=>{
    const b=document.createElement("button");
    b.className="chip"+(c===activeCat?" active":""); b.textContent=c;
    b.onclick=()=>{activeCat=c; buildFilters(); render();};
    f.appendChild(b);
  });
}
function buildCatSelect(){
  $("pCat").innerHTML = CATEGORIES.map(c=>`<option>${c}</option>`).join("");
}

/* ── Data ── */
async function loadPrompts(){
  const { data, error } = await sb.from("prompts").select("*").order("created_at",{ascending:false});
  if(error){ toast("Load failed"); console.error(error); return; }
  allPrompts = data || []; render();
}

function render(){
  const q = ($("search").value||"").toLowerCase().trim();
  let list = allPrompts.filter(p =>
    (activeCat==="All" || p.category===activeCat) &&
    (!q || p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q)));
  const grid=$("grid"); grid.innerHTML="";
  $("empty").style.display = list.length ? "none" : "block";
  if(!list.length && configured()) $("empty").textContent = "No prompts match — try another section or search.";
  for(const p of list){
    const mine = user && user.id === p.user_id;
    const card=document.createElement("div"); card.className="card";
    card.innerHTML = `
      <div class="meta"><span class="tag">${esc(p.category)}</span></div>
      <h3>${esc(p.title)}</h3>
      <pre>${esc(p.body)}</pre>
      <div class="foot">
        <span>${esc(p.author_name||"Anonymous")} · ${new Date(p.created_at).toLocaleDateString()}</span>
        <span class="actions">
          <button class="btn sm ghostline" data-copy>Copy</button>
          ${mine?`<button class="btn sm ghostline" data-edit>Edit</button><button class="btn sm ghostline" data-del>Delete</button>`:""}
        </span>
      </div>`;
    card.querySelector("[data-copy]").onclick=()=>{navigator.clipboard.writeText(p.body);toast("Copied");};
    if(mine){
      card.querySelector("[data-edit]").onclick=()=>openPrompt(p);
      card.querySelector("[data-del]").onclick=()=>delPrompt(p);
    }
    grid.appendChild(card);
  }
}

/* ── Auth ── */
function openAuth(){ $("authModal").classList.add("open"); $("authMsg").textContent=""; }
function setAuthMode(m){
  authMode=m;
  $("tabLogin").classList.toggle("active",m==="login");
  $("tabSignup").classList.toggle("active",m==="signup");
  $("authTitle").textContent = m==="login"?"Log In":"Sign Up";
  $("authSubmit").textContent = m==="login"?"Log In":"Create Account";
  $("nameField").style.display = m==="signup"?"block":"none";
}
async function submitAuth(){
  const email=$("email").value.trim(), pw=$("password").value;
  const msg=$("authMsg"); msg.className="msg"; msg.textContent="";
  if(!email||!pw){ msg.classList.add("err"); msg.textContent="Email and password required."; return; }
  $("authSubmit").disabled=true;
  try{
    if(authMode==="signup"){
      const dn=$("dispName").value.trim()||email.split("@")[0];
      const { error } = await sb.auth.signUp({ email, password:pw, options:{ data:{ display_name:dn } } });
      if(error) throw error;
      msg.classList.add("ok"); msg.textContent="Account created. Check your email if confirmation is required, then log in.";
      setAuthMode("login");
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password:pw });
      if(error) throw error;
      $("authModal").classList.remove("open"); toast("Welcome aboard");
    }
  }catch(e){ msg.classList.add("err"); msg.textContent=e.message||"Auth failed."; }
  finally{ $("authSubmit").disabled=false; }
}

/* ── Prompt CRUD (server enforces ownership) ── */
let editing=null;
function openPrompt(p){
  if(!user){ openAuth(); return; }
  editing=p||null;
  $("pmTitle").textContent = p?"Edit Prompt":"New Prompt";
  $("pTitle").value = p?p.title:"";
  $("pCat").value = p?p.category:CATEGORIES[0];
  $("pBody").value = p?p.body:"";
  $("pMsg").textContent="";
  $("promptModal").classList.add("open");
}
async function submitPrompt(){
  const title=$("pTitle").value.trim(), body=$("pBody").value.trim(), category=$("pCat").value;
  const msg=$("pMsg"); msg.className="msg";
  if(!title||!body){ msg.classList.add("err"); msg.textContent="Title and prompt are required."; return; }
  $("pSubmit").disabled=true;
  try{
    if(editing){
      const { error } = await sb.from("prompts").update({title,body,category}).eq("id",editing.id);
      if(error) throw error;
    } else {
      const dn=user.user_metadata?.display_name || user.email.split("@")[0];
      const { error } = await sb.from("prompts").insert({title,body,category,author_name:dn,user_id:user.id});
      if(error) throw error;
    }
    $("promptModal").classList.remove("open"); toast(editing?"Updated":"Published"); editing=null;
    await loadPrompts();
  }catch(e){ msg.classList.add("err"); msg.textContent=e.message||"Save failed."; }
  finally{ $("pSubmit").disabled=false; }
}
async function delPrompt(p){
  if(!confirm("Delete this prompt? This cannot be undone.")) return;
  const { error } = await sb.from("prompts").delete().eq("id",p.id);
  if(error){ toast("Delete failed"); return; }
  toast("Deleted"); await loadPrompts();
}

/* ── Wiring ── */
function wireUI(){
  $("search").addEventListener("input", render);
  $("authBtn").onclick = async ()=>{ if(user){ await sb.auth.signOut(); toast("Logged out"); } else openAuth(); };
  $("heroBtn").onclick = ()=> user?openPrompt(null):openAuth();
  $("newBtn").onclick = ()=> openPrompt(null);
  $("tabLogin").onclick=()=>setAuthMode("login");
  $("tabSignup").onclick=()=>setAuthMode("signup");
  $("authSubmit").onclick=submitAuth;
  $("pSubmit").onclick=submitPrompt;
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest(".overlay").classList.remove("open"));
  document.querySelectorAll(".overlay").forEach(o=>o.addEventListener("click",e=>{ if(e.target===o) o.classList.remove("open"); }));
  setAuthMode("login");
}
