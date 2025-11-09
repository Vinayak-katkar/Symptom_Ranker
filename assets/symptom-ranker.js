// Symptom Ranker — extracted JS with small accessibility & persistence improvements
(function(){
  /* -------------------------
     Data & Utilities
     ------------------------- */
  const SYNS = {
    "high temperature":"fever","throat pain":"sore throat",
    "blocked nose":"nasal congestion","stuffy nose":"nasal congestion",
    "running nose":"runny nose","body pain":"muscle pain",
    "tummy pain":"abdominal pain","stomach pain":"abdominal pain",
    "breathlessness":"shortness of breath"
  };

  function norm(s){
    if(!s) return "";
    const t = String(s).toLowerCase().trim().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ");
    return SYNS[t] || t;
  }

  const SYMPTOM_LIST = [
    "fever","fever with chills","cough","sore throat","headache","runny nose","nasal congestion",
    "muscle pain","tiredness","abdominal pain","vomiting","diarrhea","sneezing","itchy eyes","watery eyes",
    "nausea","rash","joint pain","sweating","light sensitivity","sound sensitivity","mild fever","chills"
  ];

  const DISEASES = [
    { name:"Common Cold", symptoms:["runny nose","sore throat","sneezing","cough","mild fever","tiredness"],
      onset:{ "runny nose":1,"sore throat":0,"sneezing":1,"cough":2,"mild fever":1,"tiredness":2 } },
    { name:"Influenza (Flu)", symptoms:["fever","chills","headache","muscle pain","tiredness","cough","sore throat"],
      onset:{ fever:1,chills:1,headache:1,"muscle pain":1,tiredness:2,cough:2,"sore throat":1 } },
    { name:"Allergic Rhinitis", symptoms:["sneezing","runny nose","itchy eyes","watery eyes","nasal congestion"],
      onset:{ sneezing:0,"runny nose":0,"itchy eyes":0,"watery eyes":0,"nasal congestion":0 } },
    { name:"Migraine", symptoms:["headache","nausea","vomiting","light sensitivity","sound sensitivity"],
      onset:{ headache:0,nausea:0,vomiting:0 } },
    { name:"Gastroenteritis", symptoms:["diarrhea","vomiting","abdominal pain","fever","tiredness"],
      onset:{ diarrhea:0,vomiting:0,"abdominal pain":0,fever:1 } },
    { name:"Dengue (demo)", symptoms:["fever","headache","muscle pain","joint pain","rash","nausea"],
      onset:{ fever:3,headache:3,"muscle pain":3 } },
    { name:"Malaria (demo)", symptoms:["fever","chills","sweating","headache","nausea","vomiting"],
      onset:{ fever:7,chills:7,sweating:7 } }
  ];

  const PRECAUTIONS = {
    fever:["Drink plenty of water","Take rest","Use paracetamol if needed"],
    cough:["Drink warm water","Avoid cold drinks","Steam inhalation"],
    "sore throat":["Gargle warm salt water","Avoid spicy foods","Drink warm tea"],
    "runny nose":["Use soft tissues","Avoid dust and cold air"],
    "nasal congestion":["Steam inhalation","Use saline drops"],
    headache:["Rest in a quiet room","Drink water"],
    "muscle pain":["Light stretching","Rest","Hydrate"],
    diarrhea:["Drink ORS","Avoid oily food"],
    vomiting:["Sip water slowly","Eat bland food"],
    "abdominal pain":["Avoid junk food","Rest"],
    "shortness of breath":["Sit upright","Seek medical help if severe"],
    tiredness:["Sleep well","Eat nutritious food"]
  };

  /* -------------------------
     UI state (with persistence)
     ------------------------- */
  let selected = [];         // normalized symptom strings
  let timeline = {};         // symptom -> days ago (number)

  const STORAGE_KEY = "symptom-ranker-state-v1";
  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const {selected: s, timeline: t} = JSON.parse(raw);
      if(Array.isArray(s)) selected = s;
      if(t && typeof t === 'object') timeline = t;
    }catch(e){ /* ignore corrupt state */ }
  }
  function saveState(){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({selected, timeline})); }catch(e){ /* storage may be unavailable */ }
  }

  /* -------------------------
     DOM refs
     ------------------------- */
  const tagcloud = document.getElementById('tagcloud');
  const search = document.getElementById('search');
  const suggest = document.getElementById('suggest');
  const selectedArea = document.getElementById('selectedArea');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resultsWrap = document.getElementById('resultsWrap');
  const precArea = document.getElementById('precArea');
  const topSelect = document.getElementById('topSelect');
  const clearBtn = document.getElementById('clearBtn');

  /* -------------------------
     Render helpers
     ------------------------- */
  // Emojis removed per request; keep placeholder for potential future icons
  function iconFor(_s){ return ''; }

  function renderTagCloud(){
    tagcloud.innerHTML = '';
    SYMPTOM_LIST.slice(0,12).forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'tag';
      btn.type='button';
      btn.setAttribute('aria-label', `Add ${s}`);
  btn.innerText = `${s}`;
      btn.onclick = () => addSymptom(s);
      tagcloud.appendChild(btn);
    });
  }

  function renderSelected(){
    selectedArea.innerHTML = '';
    if(selected.length === 0){
      selectedArea.innerHTML = '<div class="muted">No symptoms selected yet.</div>';
      precArea.innerHTML = '<div class="muted">Select symptoms to see precautions.</div>';
      saveState();
      return;
    }
    // rows
    selected.forEach(s => {
      const row = document.createElement('div');
      row.className = 'sym-row';
      const left = document.createElement('div');
  left.style.display='flex'; left.style.alignItems='center'; left.style.gap='10px';
  left.innerHTML = `<div style=\"font-weight:600\">${s}</div>`;
      const right = document.createElement('div');
      right.style.display='flex'; right.style.alignItems='center'; right.style.gap='8px';
      const inp = document.createElement('input');
      inp.type = 'number'; inp.min=0; inp.value = timeline[s] ?? 0; inp.setAttribute('aria-label', `${s} days ago`);
      inp.onchange = ()=> { timeline[s] = Number(inp.value||0); saveState(); };
      const days = document.createElement('span'); days.className='muted'; days.innerText='days ago';
      const rem = document.createElement('button'); rem.className='btn secondary'; rem.style.padding='6px 8px'; rem.innerText='Remove'; rem.type='button'; rem.setAttribute('aria-label', `Remove ${s}`);
      rem.onclick = ()=> removeSymptom(s);
      right.appendChild(inp); right.appendChild(days); right.appendChild(rem);
      row.appendChild(left); row.appendChild(right);
      selectedArea.appendChild(row);
    });

    // precautions
    precArea.innerHTML = '';
    selected.forEach(s=> {
      const card = document.createElement('div'); card.className='card'; card.style.marginBottom='8px';
  const title = document.createElement('div'); title.style.fontWeight = 600; title.innerText = `${s}`;
      const pres = document.createElement('div'); pres.className='prec';
      const list = PRECAUTIONS[s] || ["No specific precaution available — consult a physician if concerned."];
      pres.innerText = list.join(' • ');
      card.appendChild(title); card.appendChild(pres);
      precArea.appendChild(card);
    });

    saveState();
  }

  /* -------------------------
     Add / remove symptoms
     ------------------------- */
  function addSymptom(raw){
    const s = norm(raw);
    if(!s) return;
    if(selected.includes(s)) return;
    selected.push(s);
    timeline[s] = timeline[s] ?? 0;
    renderSelected();
    resultsWrap.innerHTML = '';
  }

  function removeSymptom(s){
    selected = selected.filter(x=>x!==s);
    delete timeline[s];
    renderSelected();
    resultsWrap.innerHTML = '';
  }

  function clearAll(){
    selected = [];
    timeline = {};
    renderSelected();
    resultsWrap.innerHTML = '';
    saveState();
  }

  /* -------------------------
     Autocomplete with keyboard support
     ------------------------- */
  let activeIndex = -1;
  function closeSuggest(){ suggest.style.display='none'; suggest.innerHTML=''; activeIndex=-1; search.setAttribute('aria-expanded','false'); }
  function openSuggest(){ suggest.style.display='block'; search.setAttribute('aria-expanded','true'); }
  function renderSuggestions(matches){
    suggest.innerHTML='';
    matches.forEach((m,i)=>{
      const li = document.createElement('li'); li.innerText = m; li.setAttribute('role','option'); li.id = `opt-${i}`;
      li.onclick = ()=>{ addSymptom(m); search.value=''; closeSuggest(); search.focus(); };
      suggest.appendChild(li);
    });
    if(matches.length) openSuggest(); else closeSuggest();
  }

  search.addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    if(q.length<1){ closeSuggest(); return; }
    const matches = SYMPTOM_LIST.filter(x=>x.toLowerCase().includes(q)).slice(0,8);
    renderSuggestions(matches);
  });

  search.addEventListener('keydown', (e)=>{
    const items = Array.from(suggest.querySelectorAll('li'));
    const max = items.length-1;
    if(e.key === 'ArrowDown'){
      if(!items.length) return;
      e.preventDefault(); activeIndex = Math.min(max, activeIndex+1);
      items.forEach((el,i)=> el.setAttribute('aria-selected', i===activeIndex ? 'true':'false'));
      if(activeIndex>=0) items[activeIndex].scrollIntoView({block:'nearest'});
    } else if(e.key === 'ArrowUp'){
      if(!items.length) return;
      e.preventDefault(); activeIndex = Math.max(0, activeIndex-1);
      items.forEach((el,i)=> el.setAttribute('aria-selected', i===activeIndex ? 'true':'false'));
      if(activeIndex>=0) items[activeIndex].scrollIntoView({block:'nearest'});
    } else if(e.key === 'Enter'){
      const q = search.value.trim();
      if(activeIndex>=0 && items[activeIndex]){ items[activeIndex].click(); }
      else if(q){ addSymptom(q); search.value=''; closeSuggest(); }
      e.preventDefault();
    } else if(e.key === 'Escape'){
      closeSuggest();
    }
  });

  document.addEventListener('click', (e)=>{
    if(!suggest.contains(e.target) && e.target !== search) closeSuggest();
  });

  /* -------------------------
     Ranking & Analysis
     ------------------------- */
  function analyze(){
    resultsWrap.innerHTML = '';
    if(selected.length===0){ resultsWrap.innerHTML='<div class="card"><div class="muted">Add symptoms to analyze.</div></div>'; return; }
    const top = Number(topSelect.value) || 5;

    // compute entries
    const entries = DISEASES.map(d=>{
      const dSymptoms = d.symptoms.map(norm);
      const diseaseSet = new Set(dSymptoms);
      const matches = selected.filter(s => diseaseSet.has(s));
      const matchCount = matches.length;
      const missing = dSymptoms.filter(s => !selected.includes(s));
      const confidence = (matchCount / dSymptoms.length) * 100;
      // timeline scoring
      let timelineMatches=0, timelinePossible=0;
      matches.forEach(s=>{
        const expected = (d.onset && d.onset[s]) !== undefined ? d.onset[s] : undefined;
        if(expected !== undefined){
          timelinePossible++;
          const actual = (timeline[s] !== undefined ? Number(timeline[s]) : expected);
          if(Math.abs(actual - expected) <= 1) timelineMatches++;
        }
      });
      const timelineScore = timelinePossible>0 ? (timelineMatches / timelinePossible) * 100 : 0;
      const finalScore = (confidence * 0.8) + (timelineScore * 0.2);
      return { disease: d.name, matchCount, totalSymptoms: dSymptoms.length, confidence: Math.round(confidence*10)/10, timelineScore: Math.round(timelineScore*10)/10, missing, finalScore: Math.round(finalScore*10)/10 };
    });

    const filtered = entries.filter(e=>e.matchCount>0).sort((a,b)=>b.finalScore-a.finalScore).slice(0,top);

    if(filtered.length===0){ resultsWrap.innerHTML='<div class="card"><div class="muted">No likely diseases found for the entered symptoms.</div></div>'; return; }

    filtered.forEach(r=>{
      const wrap = document.createElement('div'); wrap.className='card';
      const header = document.createElement('div'); header.style.display='flex'; header.style.justifyContent='space-between'; header.style.alignItems='center';
      const left = document.createElement('div'); left.innerHTML = `<div style="font-weight:700">${r.disease}</div><div class="small muted">Matches: ${r.matchCount}/${r.totalSymptoms} • Timeline match: ${r.timelineScore}%</div>`;
      const right = document.createElement('div'); right.style.width='180px';
      right.innerHTML = `<div class=\"small muted\" style=\"text-align:right\">Confidence</div><div class=\"bar\" style=\"margin-top:6px\"><i style=\"width:${r.finalScore}%\"></i></div><div class=\"muted\" style=\"text-align:right;margin-top:6px\">${r.finalScore}%</div>`;
      header.appendChild(left); header.appendChild(right);
      wrap.appendChild(header);

      const body = document.createElement('div'); body.style.marginTop='12px'; body.setAttribute('role','region'); body.setAttribute('aria-label',`Missing symptoms for ${r.disease}`);
      const missColTitle = document.createElement('div'); missColTitle.className='small'; missColTitle.style.fontWeight='600'; missColTitle.innerText='Missing symptoms';
      body.appendChild(missColTitle);
      if(r.missing.length===0){
        const none = document.createElement('div'); none.style.color='#10b981'; none.style.fontWeight='600'; none.style.marginTop='8px'; none.innerText='None';
        body.appendChild(none);
      } else {
        const mwrap = document.createElement('div'); mwrap.style.marginTop='8px';
        r.missing.forEach(m=>{
          const span = document.createElement('span'); span.className='missing'; span.innerText = m;
          mwrap.appendChild(span);
        });
        body.appendChild(mwrap);
      }

      wrap.appendChild(body);
      resultsWrap.appendChild(wrap);
    });
  }

  /* -------------------------
     Precautions area helper
     ------------------------- */
  function renderPrecautions(){
    precArea.innerHTML = '';
    if(selected.length===0) return;
    selected.forEach(s=>{
      const card = document.createElement('div'); card.className='card';
  const t = document.createElement('div'); t.style.fontWeight=600; t.innerText = `${s}`;
      const p = document.createElement('div'); p.className='prec'; p.style.marginTop='6px';
      p.innerText = (PRECAUTIONS[s] || ["No specific precaution available."]).join(' • ');
      card.appendChild(t); card.appendChild(p);
      precArea.appendChild(card);
    });
  }

  /* -------------------------
     Wire events & init
     ------------------------- */
  function init(){
    loadState();
    renderTagCloud();
    renderSelected();

    analyzeBtn.onclick = () => { analyze(); renderPrecautions(); };
    topSelect.onchange = () => { /* no auto analyze */ };
    clearBtn && (clearBtn.onclick = clearAll);

    // Add first suggestion on Enter (handled in keydown above), plus click-outside closes list
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
