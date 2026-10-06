'use strict';
const COUNTRIES = {AR:'Argentina',AU:'Australia',BD:'Bangladesh',BR:'Brazil',CA:'Canada',CN:'China',EG:'Egypt',FR:'France',DE:'Germany',GH:'Ghana',GR:'Greece',IN:'India',ID:'Indonesia',IR:'Iran',IL:'Israel',IT:'Italy',JP:'Japan',KE:'Kenya',KR:'South Korea',MX:'Mexico',NL:'Netherlands',NG:'Nigeria',NO:'Norway',PK:'Pakistan',PH:'Philippines',PL:'Poland',RU:'Russia',SA:'Saudi Arabia',SG:'Singapore',ZA:'South Africa',ES:'Spain',SE:'Sweden',CH:'Switzerland',TH:'Thailand',TR:'Turkey',UA:'Ukraine',AE:'United Arab Emirates',GB:'United Kingdom',US:'United States',VN:'Vietnam'};
const C1 = new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1});
const C2 = new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2});
const usd = v=>'$'+Math.round(v).toLocaleString('en-US');
// kinds: usd | usdBig | pct | years | count | num(dec, unit, diffUnit)
function ind(code, group, better, kind, dec=1, unit='', diffUnit=unit){
  const o = {code, group, better};
  switch(kind){
    case 'usd':    o.fmt = usd; o.diff = usd; o.tick = v=>'$'+C1.format(v); break;
    case 'usdBig': o.fmt = v=>'$'+C2.format(v); o.diff = o.fmt; o.tick = v=>'$'+C1.format(v); break;
    case 'pct':    o.fmt = v=>v.toFixed(1)+'%'; o.diff = d=>d.toFixed(1)+' percentage points'; o.tick = v=>C1.format(v)+'%'; break;
    case 'years':  o.fmt = v=>v.toFixed(1)+' yrs'; o.diff = d=>d.toFixed(1)+' years'; o.tick = v=>C1.format(v); break;
    case 'count':  o.fmt = v=>C2.format(v); o.diff = o.fmt; o.tick = v=>C1.format(v); break;
    default:       o.fmt = v=>v.toFixed(dec)+unit; o.diff = d=>d.toFixed(dec)+diffUnit; o.tick = v=>C1.format(v);
  }
  return o;
}
// better: 'high' = higher wins, 'low' = lower wins, 'neutral' = no "better" side (verdict says who is ahead)
const INDICATORS = {
  // Economy (first three keys are kept as-is so old share links still work)
  'GDP per Capita (USD)':            ind('NY.GDP.PCAP.CD',        'Economy','high','usd'),
  'GDP per Capita, PPP (Intl $)':    ind('NY.GDP.PCAP.PP.CD',     'Economy','high','usd'),
  'Total GDP (USD)':                 ind('NY.GDP.MKTP.CD',        'Economy','high','usdBig'),
  'GDP Growth (%)':                  ind('NY.GDP.MKTP.KD.ZG',     'Economy','high','pct'),
  'Inflation (%)':                   ind('FP.CPI.TOTL.ZG',        'Economy','low','pct'),
  'Unemployment (%)':                ind('SL.UEM.TOTL.ZS',        'Economy','low','pct'),
  'Exports (% of GDP)':              ind('NE.EXP.GNFS.ZS',        'Economy','neutral','pct'),
  'Military Spending (% of GDP)':    ind('MS.MIL.XPND.GD.ZS',     'Economy','neutral','pct'),
  // People & Health
  'Life Expectancy (Years)':         ind('SP.DYN.LE00.IN',        'People & Health','high','years'),
  'Infant Mortality (per 1,000)':    ind('SP.DYN.IMRT.IN',        'People & Health','low','num',1,'',' deaths per 1,000 births'),
  'Fertility Rate (births/woman)':   ind('SP.DYN.TFRT.IN',        'People & Health','neutral','num',2,'',' births per woman'),
  'Population':                      ind('SP.POP.TOTL',           'People & Health','neutral','count'),
  'Urban Population (%)':            ind('SP.URB.TOTL.IN.ZS',     'People & Health','neutral','pct'),
  'Health Spending (% of GDP)':      ind('SH.XPD.CHEX.GD.ZS',     'People & Health','neutral','pct'),
  'Women in Parliament (%)':         ind('SG.GEN.PARL.ZS',        'People & Health','high','pct'),
  // Technology
  'Internet Usage (%)':              ind('IT.NET.USER.ZS',        'Technology','high','pct'),
  'Mobile Subscriptions (per 100)':  ind('IT.CEL.SETS.P2',        'Technology','high','num',0,'',' per 100 people'),
  'Broadband Subscriptions (per 100)':ind('IT.NET.BBND.P2',       'Technology','high','num',1,'',' per 100 people'),
  // Environment & Energy
  'CO2 per Capita (tonnes)':         ind('EN.GHG.CO2.PC.CE.AR5',  'Environment & Energy','low','num',1,' t',' tonnes'),
  'Renewable Energy (% of use)':     ind('EG.FEC.RNEW.ZS',        'Environment & Energy','high','pct'),
  'Electricity Access (%)':          ind('EG.ELC.ACCS.ZS',        'Environment & Energy','high','pct'),
  'Forest Area (% of land)':         ind('AG.LND.FRST.ZS',        'Environment & Energy','high','pct'),
  'PM2.5 Air Pollution (µg/m³)':     ind('EN.ATM.PM25.MC.M3',     'Environment & Energy','low','num',1,' µg/m³',' µg/m³'),
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
  const groups = {};
  Object.entries(INDICATORS).forEach(([k,v])=>{ (groups[v.group] = groups[v.group] || []).push(k); });
  $('metric').innerHTML = Object.entries(groups).map(([g,ks])=>`<optgroup label="${g}">${ks.map(k=>`<option value="${k}">${k}</option>`).join('')}</optgroup>`).join('');
  $('metric').value = metric;
  $('metric').onchange = ()=>{ metric = $('metric').value; battle(); };
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
        y:{ticks:{color:'#8b949e', callback:v=>INDICATORS[metric].tick(v)}, grid:{color:'#21262d'}}
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
    const hi1 = v1 > v2;                       // is country 1 the higher value?
    const d = I.diff(Math.abs(v1-v2));
    const w1 = I.better === 'low' ? !hi1 : hi1; // is country 1 the winner/leader?
    const win = w1?n1:n2, lose = w1?n2:n1;
    const cls = w1?'w1':'w2';
    if(I.better === 'neutral'){
      plain = `In ${y}, ${win} was ahead of ${lose} by ${d} in ${name}.`;
      html = `In ${y}, <b class="${cls}">${win}</b> was ahead of ${lose} by ${d} in ${name}.`;
    }else{
      const note = I.better === 'low' ? ' (lower is better)' : '';
      plain = `In ${y}, ${win} beat ${lose} by ${d} in ${name}${note}!`;
      html = `In ${y}, <b class="${cls}">${win}</b> beat ${lose} by ${d} in ${name}${note}!`;
    }
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
