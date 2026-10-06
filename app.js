'use strict';
const COUNTRIES = {AR:'Argentina',AU:'Australia',BD:'Bangladesh',BR:'Brazil',CA:'Canada',CN:'China',EG:'Egypt',FR:'France',DE:'Germany',GH:'Ghana',GR:'Greece',IN:'India',ID:'Indonesia',IR:'Iran',IL:'Israel',IT:'Italy',JP:'Japan',KE:'Kenya',KR:'South Korea',MX:'Mexico',NL:'Netherlands',NG:'Nigeria',NO:'Norway',PK:'Pakistan',PH:'Philippines',PL:'Poland',RU:'Russia',SA:'Saudi Arabia',SG:'Singapore',ZA:'South Africa',ES:'Spain',SE:'Sweden',CH:'Switzerland',TH:'Thailand',TR:'Turkey',UA:'Ukraine',AE:'United Arab Emirates',GB:'United Kingdom',US:'United States',VN:'Vietnam'};
const INDICATORS = {
  'GDP per Capita (USD)': {code:'NY.GDP.PCAP.CD', fmt:v=>'$'+Math.round(v).toLocaleString('en-US'), diff:(d)=>'$'+Math.round(d).toLocaleString('en-US')},
  'Life Expectancy (Years)': {code:'SP.DYN.LE00.IN', fmt:v=>v.toFixed(1)+' yrs', diff:d=>d.toFixed(1)+' years'},
  'Internet Usage (%)': {code:'IT.NET.USER.ZS', fmt:v=>v.toFixed(1)+'%', diff:d=>d.toFixed(1)+' percentage points'}
};
const COLORS = {p1:'#2f81ff', p2:'#ff2e6e'};
const $ = id => document.getElementById(id);
let metric = Object.keys(INDICATORS)[0], chart = null, shareText = '', reqId = 0;

// ---------- setup ----------
function init(){
  const opts = Object.entries(COUNTRIES).map(([c,n])=>`<option value="${c}">${n}</option>`).join('');
  $('c1').innerHTML = opts; $('c2').innerHTML = opts;
  const q = new URLSearchParams(location.search);
  $('c1').value = COUNTRIES[q.get('a')] ? q.get('a') : 'IN';
  $('c2').value = COUNTRIES[q.get('b')] ? q.get('b') : 'US';
  if (INDICATORS[q.get('m')]) metric = q.get('m');
  $('pills').innerHTML = Object.keys(INDICATORS).map(k=>`<button class="pill${k===metric?' active':''}" role="tab" data-m="${k}">${k}</button>`).join('');
  $('pills').addEventListener('click', e=>{
    const b = e.target.closest('.pill'); if(!b) return;
    metric = b.dataset.m;
    document.querySelectorAll('.pill').forEach(p=>p.classList.toggle('active', p===b));
    battle();
  });
  $('c1').onchange = $('c2').onchange = battle;
  document.querySelectorAll('.navbtn').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.navbtn').forEach(x=>x.classList.toggle('active', x===b));
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.id===b.dataset.tab));
    window.scrollTo(0,0);
  });
  $('shareBtn').onclick = share;
  battle();
}

// ---------- data ----------
async function fetchSeries(country, code){
  const url = `https://api.worldbank.org/v2/country/${country}/indicator/${code}?format=json&date=1990:2023&per_page=100`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('World Bank API error '+res.status);
  const json = await res.json();
  const rows = Array.isArray(json) && Array.isArray(json[1]) ? json[1] : [];
  return rows.filter(r=>r.value!==null).map(r=>({year:+r.date, value:r.value})).reverse();
}

async function battle(){
  const a = $('c1').value, b = $('c2').value, id = ++reqId;
  const st = $('status'); st.classList.remove('hide'); st.textContent = 'Loading…';
  $('verdict').hidden = true;
  try{
    const code = INDICATORS[metric].code;
    const [s1, s2] = await Promise.all([fetchSeries(a, code), fetchSeries(b, code)]);
    if(id !== reqId) return; // stale
    if(!s1.length && !s2.length){ st.textContent = 'No data found for either country on this metric.'; destroyChart(); return; }
    st.classList.add('hide');
    drawChart(a, b, s1, s2);
    verdict(a, b, s1, s2);
  }catch(err){
    if(id !== reqId) return;
    destroyChart();
    st.textContent = 'Could not load data. Check your connection and try again.';
  }
}

// ---------- chart ----------
function destroyChart(){ if(chart){ chart.destroy(); chart = null; } }
function drawChart(a, b, s1, s2){
  destroyChart();
  const years = []; for(let y=1990;y<=2023;y++) years.push(y);
  const map = s => years.map(y=>{const p = s.find(x=>x.year===y); return p ? p.value : null;});
  const ds = (label, data, color) => ({label, data, borderColor:color, backgroundColor:color+'33', borderWidth:3, pointRadius:0, pointHoverRadius:5, tension:.3, spanGaps:true});
  chart = new Chart($('chart'), {
    type:'line',
    data:{labels:years, datasets:[ds(COUNTRIES[a], map(s1), COLORS.p1), ds(COUNTRIES[b], map(s2), COLORS.p2)]},
    options:{
      responsive:true, maintainAspectRatio:false,
      animation:{duration:1400, easing:'easeOutQuart'},
      interaction:{mode:'index', intersect:false},
      plugins:{
        legend:{labels:{color:'#e6edf3', font:{family:'Chakra Petch', weight:'700'}}},
        tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.parsed.y==null?'n/a':INDICATORS[metric].fmt(c.parsed.y)}`}}
      },
      scales:{
        x:{ticks:{color:'#8b949e', maxTicksLimit:8}, grid:{color:'#21262d'}},
        y:{ticks:{color:'#8b949e'}, grid:{color:'#21262d'}}
      }
    }
  });
}

// ---------- verdict ----------
function verdict(a, b, s1, s2){
  const m2 = new Map(s2.map(p=>[p.year,p.value]));
  const common = s1.filter(p=>m2.has(p.year)).map(p=>p.year);
  const box = $('verdict');
  if(!common.length){
    $('verdictText').textContent = 'No year with data for both fighters. Try another metric or pairing.';
    shareText = ''; $('shareBtn').hidden = true; box.hidden = false; return;
  }
  $('shareBtn').hidden = false;
  const y = Math.max(...common);
  const v1 = s1.find(p=>p.year===y).value, v2 = m2.get(y);
  const n1 = COUNTRIES[a], n2 = COUNTRIES[b], I = INDICATORS[metric];
  const name = metric.replace(/ \(.*\)/,'');
  let html, plain;
  if(v1 === v2){
    html = plain = `In ${y}, ${n1} and ${n2} tied in ${name}!`;
  }else{
    const w1 = v1 > v2, win = w1?n1:n2, lose = w1?n2:n1, d = I.diff(Math.abs(v1-v2));
    plain = `In ${y}, ${win} beat ${lose} by ${d} in ${name}!`;
    html = `In ${y}, <b class="${w1?'w1':'w2'}">${win}</b> beat ${lose} by ${d} in ${name}!`;
  }
  $('verdictText').innerHTML = html;
  shareText = plain; box.hidden = false;
  box.style.animation='none'; void box.offsetWidth; box.style.animation='';
}

async function share(){
  if(!shareText) return;
  const u = new URL(location.href.split('?')[0]);
  u.search = new URLSearchParams({a:$('c1').value, b:$('c2').value, m:metric}).toString();
  const data = {title:'Country Face-Off', text:shareText, url:u.toString()};
  try{
    if(navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(`${data.text} ${data.url}`); flash('Copied to clipboard'); }
  }catch(e){ /* user cancelled */ }
}
function flash(msg){ const h=$('installHint'); h.textContent=msg; setTimeout(()=>h.textContent='',2500); }

// ---------- PWA ----------
let deferred = null;
const ib = $('installBtn');
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferred = e; ib.disabled = false; $('installHint').textContent=''; });
ib.addEventListener('click', async ()=>{
  if(!deferred){
    $('installHint').textContent = /iphone|ipad/i.test(navigator.userAgent) ? 'On iOS: tap Share, then Add to Home Screen.' : 'Use your browser menu to install this app.';
    return;
  }
  deferred.prompt(); await deferred.userChoice; deferred = null;
});
window.addEventListener('appinstalled', ()=>{ ib.textContent='Installed ✓'; ib.disabled=true; });
if(window.matchMedia('(display-mode: standalone)').matches){ ib.textContent='Installed ✓'; ib.disabled=true; }
if('serviceWorker' in navigator) window.addEventListener('load', ()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

init();
