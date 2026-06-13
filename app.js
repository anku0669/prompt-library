"use strict";
/* ── Prompt Library client ──
   All writes are gated server-side by Supabase Row-Level Security.
   This file never trusts the client for authorization.            */

/* Public sections shown by default. */
const PUBLIC_CATEGORIES = ["Writing","Coding","Marketing","Image & Video","Business","Research","Productivity","Other"];
/* Hidden "gift" sections — only revealed after the secret is clicked. */
const HIDDEN_CATEGORIES = ["Prompt Engineering","System Prompts","AI Jailbreak","DANs","Crescendo","Cognitive Dissonance","Manipulation Techniques"];
let secretUnlocked = false;
let CATEGORIES = PUBLIC_CATEGORIES.slice();
function unlockSecret(){
  if(secretUnlocked) return;
  secretUnlocked = true;
  CATEGORIES = [...PUBLIC_CATEGORIES, ...HIDDEN_CATEGORIES];
  buildFilters(); buildCatSelect();
  const g = $("gift"); if(g){ g.classList.add("used"); g.textContent = "\uD83C\uDF81 unlocked \u2014 7 secret sections added below"; }
  toast("\uD83C\uDF81 Secret sections unlocked \u2014 enjoy");
}

/* Built-in starter prompts (read-only). They keep the library populated
   before/after Supabase is connected and double as usage examples. */
const EXAMPLES = [
  { category:"Writing", title:"Sharpen Any Draft", author_name:"Library",
    body:"You are a ruthless line editor. Rewrite the text below to be 30% shorter, clearer, and more confident — keep my voice, cut filler, fix weak verbs. Return only the revised version, then a 3-bullet list of what you changed.\n\nTEXT:\n\"\"\"\n{paste text}\n\"\"\"" },
  { category:"Coding", title:"Explain & Refactor Code", author_name:"Library",
    body:"Act as a senior engineer. For the code below: (1) explain what it does in 2 sentences, (2) list bugs or edge cases, (3) return a refactored version with comments and Big-O notes. Be concise.\n\n```\n{paste code}\n```" },
  { category:"Marketing", title:"5 Hooks From One Idea", author_name:"Library",
    body:"You are a direct-response copywriter. From this product idea, write 5 scroll-stopping hooks for a short-form video: 1 curiosity, 1 contrarian, 1 problem-agitate, 1 social proof, 1 bold claim. Max 12 words each.\n\nIDEA: {describe product}" },
  { category:"Image & Video", title:"Cinematic Image Prompt", author_name:"Library",
    body:"Write a single richly-detailed image-generation prompt for: {subject}. Include subject, setting, lighting, lens/camera, mood, color palette, and art style. End with quality tags. Output only the prompt." },
  { category:"Business", title:"Decision Memo", author_name:"Library",
    body:"You are a strategy advisor. Turn the situation below into a one-page decision memo: Context, Options (with pros/cons), Recommendation, Risks, Next steps. Be decisive.\n\nSITUATION: {describe}" },
  { category:"Research", title:"Steelman Both Sides", author_name:"Library",
    body:"Take the claim below. Present the strongest possible case FOR it, then the strongest case AGAINST it, each in 4 bullets with evidence types I should verify. End with the key question that decides it.\n\nCLAIM: {paste claim}" },
  { category:"Productivity", title:"Weekly Plan From a Brain Dump", author_name:"Library",
    body:"Here is an unsorted list of everything on my plate. Group it into themes, flag the 3 highest-leverage tasks, then build a realistic Mon–Fri plan with time blocks. Ask me nothing; make smart assumptions.\n\nDUMP:\n{paste tasks}" },
  { category:"Other", title:"Turn Anything Into a Checklist", author_name:"Library",
    body:"Convert the process below into a clear, numbered checklist a beginner could follow without prior knowledge. Add a short 'before you start' section and a 'common mistakes' note.\n\nPROCESS: {describe}" },
];

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
    render(); // show starter examples even before backend is connected
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

function matches(p,q){
  return (activeCat==="All" || p.category===activeCat) &&
    (!q || p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q));
}

function cardEl(p){
  const sample = !!p.sample;
  const mine = !sample && user && user.id === p.user_id;
  const card=document.createElement("div"); card.className="card";
  card.innerHTML = `
    <div class="meta"><span class="tag">${esc(p.category)}</span>${sample?'<span class="tag" style="background:#fff;color:#111;border:1px solid #cacacb">Sample</span>':''}</div>
    <h3>${esc(p.title)}</h3>
    <pre>${esc(p.body)}</pre>
    <div class="foot">
      <span>${esc(p.author_name||"Anonymous")}${p.created_at?` · ${new Date(p.created_at).toLocaleDateString()}`:""}</span>
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
  return card;
}

function render(){
  const q = ($("search").value||"").toLowerCase().trim();
  const live = allPrompts.filter(p=>matches(p,q));
  const samples = EXAMPLES.filter(p=>matches(p,q)).map(p=>({...p,sample:true}));
  const list = [...live, ...samples];
  const grid=$("grid"); grid.innerHTML="";
  $("empty").style.display = list.length ? "none" : "block";
  if(!list.length) $("empty").textContent = "No prompts match — try another section or search.";
  list.forEach(p=>grid.appendChild(cardEl(p)));
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
  if(!configured()){ const m=$("authMsg"); m.className="msg err"; m.textContent="Backend not connected yet — add Supabase keys in config.js (see README)."; return; }
  const email=$("email").value.trim(), pw=$("password").value;
  const msg=$("authMsg"); msg.className="msg"; msg.textContent="";
  if(!email||!pw){ msg.classList.add("err"); msg.textContent="Email and password required."; return; }
  $("authSubmit").disabled=true;
  try{
    if(authMode==="signup"){
      const dn=$("dispName").value.trim()||email.split("@")[0];
      const { error } = await sb.auth.signUp({ email, password:pw, options:{ data:{ display_name:dn } } });
      if(error) throw error;
      $("authModal").classList.remove("open"); toast("Account created \u2014 you're in");
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
  const gift=$("gift"); if(gift) gift.onclick=unlockSecret;
  document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest(".overlay").classList.remove("open"));
  document.querySelectorAll(".overlay").forEach(o=>o.addEventListener("click",e=>{ if(e.target===o) o.classList.remove("open"); }));
  setAuthMode("login");
}
