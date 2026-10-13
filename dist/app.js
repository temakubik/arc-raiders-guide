(() => {
 'use strict';
 const {quests,items}=window.ARC_DATA;
 const maps={dam:{ru:'Поле битвы у дамбы',en:'Dam Battlegrounds'},spaceport:{ru:'Космопорт',en:'The Spaceport'},buried:{ru:'Погребённый город',en:'Buried City'},blue:{ru:'Синие ворота',en:'The Blue Gate'},stella:{ru:'Стелла Монтис',en:'Stella Montis'},riven:{ru:'Бурные потоки',en:'Riven Tides'},any:{ru:'Без привязки к карте',en:'Any suitable map'}};
 const traders={Shani:'Шани',Celeste:'Селеста','Tian Wen':'Тянь Вэнь',Lance:'Лэнс',Apollo:'Аполло'};
 const byId=new Map(quests.map(q=>[q.id,q]));
 const $=id=>document.getElementById(id);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normalize=s=>String(s??'').toLowerCase().replace(/ё/g,'е');
 const key='arc-raiders-quest-progress-v1';
 let state={},status='all',selected='picking_up_the_pieces',toastTimer;
 function validateState(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Некорректный файл прогресса');
  const out={};for(const q of quests){const val=raw[q.id];if(Array.isArray(val))out[q.id]=[...new Set(val.filter(i=>Number.isInteger(i)&&i>=0&&i<q.steps.length))];}return out;
 }
 try{state=validateState(JSON.parse(localStorage.getItem(key)||'{}'));}catch{state={};}
 const completed=q=>(state[q.id]||[]).length;
 const isDone=q=>q.steps.length>0&&completed(q)===q.steps.length;
 const itemName=id=>items[id]||{ru:id.replace(/_/g,' '),en:id.replace(/_/g,' ')};
 function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').hidden=true},3500);}
 function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{notify('Браузер не разрешил сохранить прогресс. Скачайте резервную копию.');}updateProgress();renderRows();}
 function updateProgress(){const n=quests.filter(isDone).length;$('progressCount').textContent=`${n} / ${quests.length}`;$('progressBar').max=quests.length;$('progressBar').value=n;$('totalCount').textContent=quests.length;}
 // Resolve prerequisite order, retaining every source entry even if an upstream quest is missing.
 function ordered(){const done=new Set(),visiting=new Set(),result=[];function visit(q){if(done.has(q.id)||visiting.has(q.id))return;visiting.add(q.id);q.previous.forEach(id=>{if(byId.has(id))visit(byId.get(id))});visiting.delete(q.id);done.add(q.id);result.push(q);}const first=byId.get('picking_up_the_pieces');if(first)visit(first);quests.forEach(visit);return result;}
 const route=ordered();
 function visible(){
  const term=normalize($('search').value.trim()),map=$('mapFilter').value,trader=$('traderFilter').value;
  return ($('sort').value==='name'?[...quests].sort((a,b)=>a.name.ru.localeCompare(b.name.ru,'ru')):route).filter(q=>{
   if(map&&!q.maps.includes(map))return false;if(trader&&q.trader!==trader)return false;
   const n=completed(q);if(status==='done'&&!isDone(q)||status==='started'&&(!n||isDone(q))||status==='todo'&&n)return false;
   const rewardText=q.rewards.map(r=>{const i=itemName(r.itemId);return i.ru+' '+i.en}).join(' ');
   return !term||normalize([q.name.ru,q.name.en,q.description.ru,q.description.en,q.trader,traders[q.trader],...q.steps,rewardText,...q.maps.map(m=>maps[m].ru+' '+maps[m].en)].join(' ')).includes(term);
  });
 }
 function renderRows(){
  const rows=visible();$('resultCount').textContent=`Найдено: ${rows.length}`;
  $('questRows').innerHTML=rows.length?rows.map(q=>`<button class="quest-row ${selected===q.id?'active':''}" data-quest="${escape(q.id)}" aria-pressed="${selected===q.id}"><div class="row-top"><span class="trader">${escape(traders[q.trader]||q.trader)}</span><span>${q.steps.length} этапов</span></div><h3>${escape(q.name.ru)}</h3><p class="english" lang="en">${escape(q.name.en)}</p><div class="row-bottom"><span>${escape(q.maps.length>1?q.maps.length+' карты':maps[q.maps[0]].ru)}</span><span class="row-state">${isDone(q)?'Пройден':completed(q)?completed(q)+' / '+q.steps.length:'—'}</span></div></button>`).join(''):'<div class="empty">Квесты не найдены. Измените запрос или сбросьте фильтры.</div>';
 }
 function sourceDate(s){if(!s)return'не указана';const p=s.split('/');return p.length===3?`${p[1]}.${p[0]}.${p[2]}`:s;}
 function renderDetail(){
  const q=byId.get(selected);if(!q){$('detail').innerHTML='<p>Выберите квест из списка.</p>';return;}
  const n=completed(q);
  $('detail').innerHTML=`<div class="detail-top"><span class="trader">${escape(traders[q.trader]||q.trader)} <span class="muted">/ ${escape(q.trader)}</span></span><span>Запись обновлена: ${escape(sourceDate(q.updated))}</span></div><h2>${escape(q.name.ru)}</h2><p class="english-title" lang="en">${escape(q.name.en)}</p><div class="meta">${q.maps.map(m=>`<span class="map-tag" title="${escape(maps[m].en)}">${escape(maps[m].ru)} <span class="muted">/ ${escape(maps[m].en)}</span></span>`).join('')}</div><div class="description"><div><h3>ОПИСАНИЕ · RU</h3><p>${escape(q.description.ru||'Описание отсутствует в источнике.')}</p></div><div lang="en"><h3>DESCRIPTION · EN</h3><p>${escape(q.description.en||'Description unavailable in source.')}</p></div></div><div class="subheading"><h3>Этапы прохождения</h3><span id="stepCount">${n} / ${q.steps.length}</span></div><ol class="steps">${q.steps.map((s,i)=>`<li class="step"><input id="step-${i}" type="checkbox" data-step="${i}" ${(state[q.id]||[]).includes(i)?'checked':''}><label for="step-${i}"><small>${String(i+1).padStart(2,'0')}</small>${escape(s)}</label></li>`).join('')}</ol><div class="subheading"><h3>Награды</h3><span>${q.rewards.length} позиций</span></div><div class="rewards">${q.rewards.length?q.rewards.map(r=>{const item=itemName(r.itemId);return`<div class="reward"><strong>×${r.quantity}</strong><span>${escape(item.ru)}<small lang="en">${escape(item.en)}</small></span></div>`}).join(''):'<p class="muted">Награда не указана в источнике.</p>'}</div>${q.previous.length?`<div class="dependencies">Условия открытия: ${q.previous.map(id=>byId.has(id)?`<button data-open="${escape(id)}">${escape(byId.get(id).name.ru)}</button>`:escape(id)).join(' · ')}</div>`:'<p class="dependencies">Предыдущие квесты в источнике не указаны.</p>'}<div class="detail-bottom"><button class="primary" id="toggleDone">${isDone(q)?'Снять все отметки':'Отметить квест пройденным'}</button><a class="source-link" href="${escape(q.source)}" target="_blank" rel="noopener noreferrer">Исходная запись ↗</a></div>`;
 }
 function select(id,focus=false){if(!byId.has(id))return;selected=id;history.replaceState(null,'','#quest='+encodeURIComponent(id));renderRows();renderDetail();if(focus&&window.innerWidth<=680){$('detail').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});$('detail').focus({preventScroll:true});}}
 function filtersChanged(){const rows=visible();if(rows.length&&!rows.some(q=>q.id===selected))selected=rows[0].id;renderRows();if(rows.length)renderDetail();else $('detail').innerHTML='<div class="empty"><h2>Нет совпадений</h2><p>Попробуйте другой запрос, карту или торговца.</p></div>';}
 function reset(){['search','mapFilter','traderFilter'].forEach(id=>{$(id).value=''});status='all';document.querySelectorAll('[data-status]').forEach(b=>b.classList.toggle('selected',b.dataset.status==='all'));filtersChanged();}
 Object.entries(maps).forEach(([id,m])=>{const o=document.createElement('option');o.value=id;o.textContent=m.ru;$('mapFilter').append(o);});
 Object.entries(traders).forEach(([id,n])=>{const o=document.createElement('option');o.value=id;o.textContent=n+' / '+id;$('traderFilter').append(o);});
 $('search').addEventListener('input',filtersChanged);['mapFilter','traderFilter','sort'].forEach(id=>$(id).addEventListener('change',filtersChanged));$('resetFilters').addEventListener('click',reset);
 document.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',()=>{status=b.dataset.status;document.querySelectorAll('[data-status]').forEach(x=>x.classList.toggle('selected',x===b));filtersChanged();}));
 $('questRows').addEventListener('click',event=>{const b=event.target.closest('[data-quest]');if(b)select(b.dataset.quest,true);});
 $('detail').addEventListener('change',event=>{if(!event.target.matches('[data-step]'))return;const i=Number(event.target.dataset.step);const checked=new Set(state[selected]||[]);event.target.checked?checked.add(i):checked.delete(i);state[selected]=[...checked];save();$('stepCount').textContent=completed(byId.get(selected))+' / '+byId.get(selected).steps.length;$('toggleDone').textContent=isDone(byId.get(selected))?'Снять все отметки':'Отметить квест пройденным';});
 $('detail').addEventListener('click',event=>{const b=event.target.closest('[data-open]');if(b){reset();select(b.dataset.open,true);}if(event.target.closest('#toggleDone')){const q=byId.get(selected);const finished=isDone(q);state[q.id]=finished?[]:q.steps.map((_,i)=>i);save();renderDetail();notify(finished?'Отметки квеста сняты':'Квест отмечен пройденным');}});
 function showAbout(yes){$('about').hidden=!yes;$('catalog').hidden=yes;$('sourcesNav').classList.toggle('active',yes);$('questsNav').classList.toggle('active',!yes);}
 $('sourcesNav').addEventListener('click',()=>showAbout(true));$('questsNav').addEventListener('click',()=>showAbout(false));$('backToQuests').addEventListener('click',()=>showAbout(false));
 $('exportProgress').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),progress:state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='arc-raiders-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 $('importProgress').addEventListener('change',async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>1000000)throw new Error('Файл слишком большой');const raw=JSON.parse(await file.text());if(raw.version!==1||!raw.progress)throw new Error('Неверный формат резервной копии');state=validateState(raw.progress);save();renderDetail();notify('Прогресс загружен');}catch(error){notify(error.message||'Не удалось загрузить прогресс');}event.target.value='';});
 document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();showAbout(false);$('search').focus();}});
 window.addEventListener('hashchange',()=>{const id=new URLSearchParams(location.hash.slice(1)).get('quest');if(byId.has(id)){reset();select(id);}});
 const deepLink=new URLSearchParams(location.hash.slice(1)).get('quest');if(byId.has(deepLink))selected=deepLink;
 updateProgress();renderRows();renderDetail();
})();
