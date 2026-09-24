(() => {
  const D = window.YOSOMI_DATA;
  const $ = s => document.querySelector(s);
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];
  const pick = (arr, n) => [...arr].sort(() => Math.random() - .5).slice(0, n);
  const store = {get(k, fallback=[]){try{return JSON.parse(localStorage.getItem('yosomi-'+k)) ?? fallback}catch{return fallback}}, set(k,v){localStorage.setItem('yosomi-'+k,JSON.stringify(v))}};
  let mode = 'photo', destination = 'image', lang = 'ja', words = [], locks = [], favorites = store.get('favorites'), history = store.get('history');
  const custom = store.get('custom', {place:[],subject:[],mood:[],time:[]});
  let customKind = 'place';
  const labels = {photo:'PHOTO / IMAGE', music:'MUSIC / WEB', place:'PLACE / IMAGE', chaos:'CHAOS / IMAGE'};
  const simple = D.simple;
  const mix = (legacy, basic, kind) => Math.random() < .72 ? basic.concat(custom[kind]||[]) : legacy.concat(custom[kind]||[]);
  const banned = ['誰もいない','知らない家族','ホテルのロビー','海沿いの廃校','来週の火曜日','誰が撮ったかわからない'];
  const query = $('#query');
  function makeQuery(){
    if(lang==='en'){const E=D.english;const count=Math.random()<.5?2:Math.random()<.8?3:4;const pools=mode==='music'?[E.time,E.place,E.music]:mode==='place'?[E.mood,E.place,E.subject]:[E.time,E.place,E.subject,'photograph'];words=pick(pools.flat(),count);if(mode==='music'&&!words.includes('ambient'))words[words.length-1]=rand(E.music);locks=words.map((_,i)=>locks[i]||false);return}
    if(Math.random() < .018){ words = [rand(D.easter), '写真']; return; }
    if(mode === 'chaos'){ words = pick(D.chaos.concat(simple.subject,simple.place), Math.random()<.72?3:4); if(Math.random()<.55) words.push(rand(simple.time)); return; }
    const count = Math.random()<.44?2:Math.random()<.78?3:4;
    const T=mix(D.time.filter(x=>!banned.includes(x)),simple.time,'time'), P=mix(D.place.filter(x=>!banned.includes(x)),simple.place,'place'), S=mix(D.subject.filter(x=>!banned.includes(x)),simple.subject,'subject'), M=mix(D.mood.filter(x=>!banned.includes(x)),simple.mood,'mood');
    const templates = mode==='music' ? [[T,P, D.music],[M,P,D.music],[P,M,D.music]] : mode==='place' ? [[M,P],[T,P],[M,S,P]] : [[T,P,'写真'],[M,P,'写真'],[T,P,S,'写真'],[M,S,P,'写真']];
    const t = rand(templates); words = t.map(x => Array.isArray(x)?rand(x):x).filter(Boolean);
    while(words.length > count && words.length > 2) words.splice(Math.floor(Math.random()*words.length),1);
    words=words.filter(w=>!banned.includes(w));
    if(mode==='music' && !words.some(w=>D.music.includes(w))) words.push(rand(D.music));
    locks = words.map((_,i)=>locks[i]||false);
  }
  function render(animate=true){ query.classList.toggle('regenerate',animate); query.innerHTML=''; words.forEach((word,i)=>{ const b=document.createElement('button'); b.className='word'+(locks[i]?' locked':''); b.textContent=word; b.dataset.index=i; b.title='クリックで再抽選 / 長押しで固定 / ダブルクリックで削除'; b.addEventListener('click',()=>reroll(i)); b.addEventListener('dblclick',()=>removeWord(i)); let timer; b.addEventListener('pointerdown',()=>timer=setTimeout(()=>toggleLock(i),520)); ['pointerup','pointerleave','pointercancel'].forEach(e=>b.addEventListener(e,()=>clearTimeout(timer))); query.appendChild(b); }); $('#modeReadout').textContent=labels[mode]; $('#lockReadout').textContent=locks.filter(Boolean).length+' LOCKED'; setTimeout(()=>query.classList.remove('regenerate'),220); }
  function removeWord(i){if(words.length<=1){toast('ONE WORD MINIMUM');return}const removed=words[i];words.splice(i,1);locks.splice(i,1);render(false);saveHistory();toast('REMOVED: '+removed)}
  function reroll(i){if(locks[i]){toast('LOCKED');return} const source=(mode==='chaos'?D.chaos.concat(simple.subject,simple.place,custom.subject,custom.place):mode==='music'?D.music.concat(simple.time,simple.place,custom.time,custom.place):i===0?D.time.concat(simple.time,D.mood,simple.mood,custom.time,custom.mood):i===1?D.place.concat(simple.place,custom.place):D.subject.concat(simple.subject,custom.subject)).filter(x=>!banned.includes(x)); let next=rand(source); while(words.includes(next)) next=rand(source); words[i]=next; render(); saveHistory();}
  function toggleLock(i){locks[i]=!locks[i];render(false);toast(locks[i]?'LOCKED':'UNLOCKED');}
  function newQuery(){const old=words; makeQuery(); words=words.map((w,i)=>locks[i]?old[i]:w); render(); saveHistory();}
  function currentText(){return words.join(' ')}
  function saveHistory(){history=[currentText(),...history.filter(x=>x!==currentText())].slice(0,40);store.set('history',history)}
  function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),900)}
  function openDrawer(kind){$('#drawerTitle').textContent=kind==='favorites'?'FAVORITES':'HISTORY'; $('#clearLocal').style.display='block'; const list=kind==='favorites'?favorites:history; const el=$('#drawerList');el.innerHTML=list.length?list.map((x,i)=>`<div class="saved"><button data-load="${encodeURIComponent(x)}">${x}</button>${kind==='favorites'?`<button class="remove-saved" data-remove="${encodeURIComponent(x)}" aria-label="お気に入りから削除">×</button>`:`<small>0${i+1}</small>`}</div>`).join(''):'<div class="empty">まだ何もありません。</div>';el.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{words=decodeURIComponent(b.dataset.load).split(' ');locks=words.map(()=>false);render(false);closeDrawer()});el.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const value=decodeURIComponent(b.dataset.remove);favorites=favorites.filter(x=>x!==value);store.set('favorites',favorites);updateCount();openDrawer('favorites');toast('REMOVED')});$('#clearLocal').onclick=()=>{if(kind==='favorites'){favorites=[];store.set('favorites',favorites)}else{history=[];store.set('history',history)}openDrawer(kind);updateCount()};$('#drawer').classList.add('open');$('#drawer').setAttribute('aria-hidden','false')}
  function closeDrawer(){$('#drawer').classList.remove('open');$('#drawer').setAttribute('aria-hidden','true')}
  function updateCount(){$('#favoriteCount').textContent=favorites.length}
  $('#newButton').onclick=newQuery; $('#searchButton').onclick=()=>{saveHistory();const q=encodeURIComponent(currentText());const urls={image:`https://www.google.com/search?tbm=isch&q=${q}`,web:`https://www.google.com/search?q=${q}`,youtube:`https://www.youtube.com/results?search_query=${q}`};window.open(urls[destination],'_blank','noopener');};
  $('#saveButton').onclick=()=>{favorites=[currentText(),...favorites.filter(x=>x!==currentText())].slice(0,40);store.set('favorites',favorites);updateCount();toast('SAVED ♡')};
  $('#languageToggle').onclick=()=>{lang=lang==='ja'?'en':'ja';$('#languageToggle').textContent=lang.toUpperCase();newQuery();toast(lang==='en'?'ENGLISH':'日本語')};
  function renderCustomWords(){const el=$('#customWordList');const all=Object.entries(custom).flatMap(([kind,items])=>items.map(word=>({kind,word})));el.innerHTML=all.length?all.map(({kind,word})=>`<span class="custom-chip">${word}<i>${kind}</i></span>`).join(''):'<span class="custom-empty">まだ追加されていません</span>'}
  $('#addWordToggle').onclick=()=>{const p=$('#addWordPanel');p.hidden=!p.hidden;if(!p.hidden){renderCustomWords();$('#customWord').focus()}};
  document.querySelectorAll('.kind').forEach(b=>b.onclick=()=>{customKind=b.dataset.kind;document.querySelectorAll('.kind').forEach(x=>x.classList.toggle('active',x===b))});
  $('#addWordButton').onclick=()=>{const input=$('#customWord'), value=input.value.trim();if(!value)return toast('TYPE A WORD');if(!custom[customKind].includes(value)){custom[customKind].push(value);store.set('custom',custom);input.value='';renderCustomWords();toast('ADDED: '+value);newQuery()}else toast('ALREADY ADDED')};
  $('#customWord').addEventListener('keydown',e=>{if(e.key==='Enter')$('#addWordButton').click()});
  document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('.mode').forEach(x=>x.classList.toggle('active',x===b));destination=mode==='music'?'web':'image';document.querySelectorAll('.dest').forEach(x=>x.classList.toggle('active',x.dataset.dest===destination));newQuery()});
  document.querySelectorAll('.dest').forEach(b=>b.onclick=()=>{destination=b.dataset.dest;document.querySelectorAll('.dest').forEach(x=>x.classList.toggle('active',x===b))});
  $('#favoritesToggle').onclick=()=>openDrawer('favorites');$('#historyToggle').onclick=()=>openDrawer('history');$('#drawerClose').onclick=closeDrawer;
  makeQuery(); render(false); saveHistory(); updateCount();
})();
