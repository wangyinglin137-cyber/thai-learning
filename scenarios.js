import {renderUsage,usageTitle,renderExampleAudio} from './usage.js?v=20261021-scene-usage-48k-1';
import {cleanGloss} from './i18n.js?v=20261020-localized-usage-46';
// Scene state stays independent of course/daily selections and survives locale changes.
export function createScenarios(ctx) {
  const {esc,locale}=ctx;
  let catalog,content,loading,error=false;
  let selected=null,mode='practice',index=null,wordHistory=[],term='',group='all',wordTerm='';
  const norm=s=>String(s??'').normalize('NFC').toLocaleLowerCase();
  const text=key=>content?.ui[key]?.[locale()]||({'zh-CN':'场景词库加载失败，请重试。',en:'Could not load scene vocabulary. Please retry.',my:'အခြေအနေဆိုင်ရာ စကားလုံးများကို ဖွင့်မရပါ။ ထပ်စမ်းပါ။'})[locale()];
  const local=value=>value?.[locale()]||'';
  const button=(key,action,attrs='',primary=false)=>`<button class="button ${primary?'primary':'ghost'}" data-scene-action="${action}" ${attrs}>${action==='previous'?ctx.icon('left'):action==='master'?ctx.icon('check'):''}${esc(text(key))}${action==='next'?ctx.icon('right'):''}</button>`;
  const sceneName=s=>locale()==='zh-CN'?s.name:local(content.scenes[s.id].name);
  const scene=()=>catalog.scenes.find(s=>s.id===selected);
  function rows(s) {
    const current=ctx.words(),byId=new Map(current.map(w=>[w.id,w])),byThai=new Map(current.map(w=>[norm(w.thai),w]));
    const supplements=new Map(catalog.supplemental_words.map(w=>[w.id,w]));
    const list=s.existing_word_ids.map(id=>{
      const w=byId.get(id);if(!w)return null;
      return contextualWord(s,w);
    }).filter(Boolean);
    for(const id of s.supplemental_word_ids){
      const extra=supplements.get(id),existing=byThai.get(norm(extra.thai));
      list.push(existing?contextualWord(s,existing):{...extra,meaning:cleanGloss(local(extra.translations)),source:'supplemental',
        senses:(extra.examples||[]).map(example=>({cn:cleanGloss(local(extra.translations)),usage:example.usage||extra.usage,
          example:example.thai,example_cn:local(example.translations),audio:example.audio,
          example_tokens:example.tokens.map(token=>[token.thai,local(token.translations)]),
          example_token_audio:Object.fromEntries(example.tokens.map(token=>[token.thai,token.audio]))}))});
    }
    return [...new Map(list.map(w=>[norm(w.thai),w])).values()];
  }
  function contextualWord(s,w){
    const rule=content.word_usage?.[s.id]?.[String(w.id)];
    const valid=rule?.thai===w.thai?rule:null;
    const selected=valid?.sense_indices?.map(i=>w.senses[i]).filter(Boolean)||w.senses||[];
    const legacyGloss=s.context_glosses_zh?.[String(w.id)];
    const meaning=cleanGloss(valid?.meaning?local(valid.meaning):legacyGloss?local(content.glosses[legacyGloss]):[...new Set(selected.map(x=>x.cn))].join(' / ')||w.cn);
    const chosenExamples=valid?.example_indices?valid.example_indices.map(i=>w.senses[i]).filter(Boolean):selected;
    const senses=chosenExamples.map(x=>({...x,usage:valid?.usage||x.usage,cn:valid?.meaning?meaning:x.cn,
      example_tokens:x.example_tokens?.map(([thai,gloss])=>[thai,norm(thai)===norm(w.thai)?meaning:gloss])
    }));
    for(const example of valid?.examples||[])senses.push({cn:meaning,usage:example.usage||valid?.usage,example:example.thai,example_cn:local(example.translations),audio:example.audio||null});
    if(!senses.length)for(const x of selected)senses.push({...x,cn:meaning,usage:valid?.usage||x.usage,example:'',example_cn:'',example_tokens:[],audio:null});
    return {...w,meaning,senses,source:'existing'};
  }
  const mastered=w=>w.source==='existing'?ctx.isLearned(w):(ctx.progress()._scenes?.learned||[]).includes(w.thai);
  const sound=w=>w.audio?`<button class="icon-button audio-mini" data-audio="${esc(w.audio)}" aria-label="${esc(text('play'))}" title="${esc(text('play'))}" ${ctx.muted()?'disabled':''}>${ctx.icon('speaker')}</button>`:`<span class="note scene-no-audio">${esc(text('noAudio'))}</span>`;
  function stats(s,list){return `<div class="scene-counts"><span>${esc(text('total'))} <b>${list.length}</b></span><span>${esc(text('mastered'))} <b>${list.filter(mastered).length} / ${list.length}</b></span></div>`;}
  async function load(){
    if(catalog)return;if(loading)return loading;
    loading=(async()=>{try{
      const responses=await Promise.all(['scenario-vocabulary.json','scene-content.json'].map(p=>fetch(p)));
      if(responses.some(r=>!r.ok))throw Error('scene data');
      const [a,b]=await Promise.all(responses.map(r=>r.json()));
      if(a.scenes.length!==50||a.scenes.some(s=>!b.scenes[s.id]))throw Error('scene catalog mismatch');
      content=b;catalog=a;error=false;
    }catch{error=true;}finally{loading=null;}})();return loading;
  }
  function render(){
    const main=document.querySelector('#main');
    if(!catalog){main.innerHTML=`<section class="word-card empty" translate="no"><p>${error?esc(text('loadError')):'…'}</p>${error?'<button class="button" data-scene-action="retry">↻</button>':''}</section>`;
      if(!error)load().then(()=>{if(location.hash.split('/')[0]==='#scenes')ctx.render();});return;}
    const id=location.hash.split('/')[1];
    const next=catalog.scenes.some(s=>s.id===id)?id:null;
    if(next!==selected){selected=next;mode='practice';wordHistory=[];wordTerm='';index=next?pick(rows(scene())):null;}
    // All text here has explicit translations; do not machine-translate Thai or localized text again.
    main.innerHTML=`<div class="scene-root" translate="no" lang="${locale()}">${selected?detail():overview()}</div>`;
  }
  function overview(){
    const all=catalog.scenes.map(s=>({s,list:rows(s)}));
    const unique=new Set(all.flatMap(({list})=>list.map(w=>norm(w.thai))));
    return `<div class="page-heading"><div><h1>${esc(text('title'))}</h1><p class="subtitle">${esc(text('intro'))}</p></div></div><div class="scene-summary"><span><b>50</b> ${esc(text('scenes'))}</span><span><b>${unique.size}</b> ${esc(text('unique'))}</span></div><p class="note">${esc(text('countNote'))}</p><div class="scene-toolbar"><input id="scene-search" type="search" aria-label="${esc(text('search'))}" placeholder="${esc(text('search'))}" value="${esc(term)}"><select id="scene-group" aria-label="${esc(text('scenes'))}">${['all','general','factory'].map(g=>`<option value="${g}" ${group===g?'selected':''}>${esc(text(g))}</option>`).join('')}</select></div><div class="scene-grid" id="scene-grid">${cards(all)}</div>`;
  }
  function cards(all=catalog.scenes.map(s=>({s,list:rows(s)}))){
    const query=norm(term).trim();
    const filtered=all.filter(({s,list})=>(group==='all'||s.group===group)&&(!query||norm(sceneName(s)).includes(query)||list.some(w=>norm(w.thai+' '+w.meaning).includes(query))));
    return filtered.map(({s,list})=>`<article class="scene-tile" data-scene-id="${s.id}"><div class="scene-tile-heading"><span class="tag">${String(s.number).padStart(2,'0')}</span></div><h2>${esc(sceneName(s))}</h2>${stats(s,list)}<div class="progress-track"><span style="width:${list.filter(mastered).length/list.length*100}%"></span></div><a class="button soft" href="#scenes/${s.id}">${esc(text('open'))} →</a></article>`).join('')||`<p>${esc(text('empty'))}</p>`;
  }
  function detail(){
    const s=scene(),list=rows(s);
    return `<a class="scene-back" href="#scenes">← ${esc(text('back'))}</a><div class="page-heading"><div><h1>${esc(sceneName(s))}</h1><p class="subtitle">${esc(text(s.group))} · ${String(s.number).padStart(2,'0')} / 50</p></div></div>${stats(s,list)}<p class="note">${esc(text('shared'))}</p><div class="scene-tabs" role="group" aria-label="${esc(text('title'))}">${['practice','list','phrases'].map(m=>`<button class="button ${mode===m?'primary':'ghost'}" data-scene-action="mode" data-mode="${m}" aria-pressed="${mode===m}">${esc(text(m))}</button>`).join('')}</div>${mode==='phrases'?phrases(s):mode==='practice'?practice(list):`<div class="scene-toolbar"><input type="search" id="scene-word-search" aria-label="${esc(text('search'))}" placeholder="${esc(text('search'))}" value="${esc(wordTerm)}"></div><div id="scene-words">${wordList(list)}</div>`}`;
  }
  function wordList(list){return list.map((w,i)=>({w,i})).filter(({w})=>norm(w.thai+' '+w.meaning).includes(norm(wordTerm).trim())).map(({w,i})=>`<article class="scene-word" data-word-id="${w.id}"><div><strong class="scene-thai" lang="th">${esc(w.thai)}</strong><span class="note">${esc(text(w.source))}${mastered(w)?' · ✓ '+esc(text('mastered')):''}</span></div><p>${esc(w.meaning)}</p><div class="scene-word-actions">${sound(w)}${button('start','word',`data-index="${i}"`)}</div></article>`).join('')||`<p>${esc(text('empty'))}</p>`;}
  function currentWord(){return catalog&&selected&&mode==='practice'&&index!==null?rows(scene())[index]||null:null;}
  function pick(list,exclude=null){
    const available=list.map((w,i)=>({w,i})).filter(({w})=>!mastered(w));
    const choices=available.filter(({i})=>i!==exclude);
    return (choices.length?choices:available)[Math.floor(Math.random()*(choices.length||available.length))]?.i??null;
  }
  function advance(mark=false){
    const list=rows(scene()),w=currentWord();if(!w)return;
    if(mark&&!mastered(w))ctx.mark(w);
    const next=pick(list,index);
    if(next!==index)wordHistory.push(index);
    index=next;
  }
  function rail(list){
    const count=list.filter(mastered).length,pct=list.length?Math.round(count/list.length*100):0;
    return `<aside class="study-rail"><section class="side-card"><h2>${esc(text('sceneProgress'))}</h2><div class="progress-ring" style="--value:${pct}%"><div class="ring-value">${count}<small>${esc(text('mastered'))}</small></div></div><div class="metric-row"><span>${esc(text('currentScene'))}</span><strong>${esc(sceneName(scene()))}</strong></div><div class="metric-row"><span>${esc(text('completion'))}</span><strong>${pct}%</strong></div><div class="metric-row"><span>${esc(text('total'))}</span><strong>${list.length}</strong></div>${button('list','mode','data-mode="list"')}</section><section class="side-card review"><h2>${esc(text('phrases'))}</h2>${button('phrases','mode','data-mode="phrases"')}</section><p class="shortcut">${esc(text('shortcuts'))}</p></aside>`;
  }
  function wordExamples(w){
    return `<div class="section-heading"><h2>${esc(text('examples'))}</h2><small>${esc(text('audioHint'))}</small></div>${(w.senses||[]).filter(s=>s.usage?.[locale()]||(s.example&&s.example_cn)).map((s,i)=>`<article class="example-card"><div class="example-head"><div class="sense-title"><span class="sense-index">${String(i+1).padStart(2,'0')}</span>${usageTitle(s,esc,locale())}</div></div>${renderUsage(s,esc,locale(),ctx.muted())}${renderExampleAudio(s.audio,esc,locale(),ctx.muted(),ctx.icon('speaker'))}${s.example_tokens?.length?`<div class="interlinear">${s.example_tokens.map(([thai,gloss])=>{
      const audio=s.example_token_audio?.[thai]||ctx.tokenAudio(thai);
      const inside=`<span class="thai" lang="th">${esc(thai)}</span><span class="gloss" lang="${locale()}">${esc(cleanGloss(gloss))}</span>`;
      return audio?`<button type="button" class="token token-audio" data-audio="${esc(audio)}" aria-label="${esc(text('play')+' '+thai)}" title="${esc(text('audioHint'))}" ${ctx.muted()?'disabled':''}>${inside}</button>`:`<span class="token">${inside}</span>`;
    }).join(' ')}</div>`:(s.example?`<p class="scene-thai" lang="th">${esc(s.example)}</p>`:'')}${s.example_cn?`<p class="translation">${esc(s.example_cn)}</p>`:''}</article>`).join('')}`;
  }
  function practice(list){
    const w=currentWord();
    if(!w)return `<div class="study-layout"><div class="learning-column"><section class="word-card empty"><span class="tag learned">${esc(text('complete'))}</span><h2>${esc(text('completeTitle'))}</h2><p>${esc(sceneName(scene()))} · ${list.length} ${esc(text('total'))}</p>${button('list','mode','data-mode="list"',true)} ${button('phrases','mode','data-mode="phrases"')}${wordHistory.length?button('previous','previous'):''}</section></div>${rail(list)}</div>`;
    return `<div class="study-layout"><div class="learning-column"><article class="word-card scene-practice" data-current-thai="${esc(w.thai)}"><div class="word-meta"><span class="tag ${mastered(w)?'learned':''}">${esc(sceneName(scene()))}${mastered(w)?' · '+esc(text('mastered')):''}</span><span>${index+1} / ${list.length}</span></div><div class="word-center"><h2 class="word-thai ${w.thai.length>18?'long':''}" lang="th">${esc(w.thai)}</h2>${w.roman?`<p class="pron">${esc(w.roman)}</p>`:''}<p class="word-cn"><span>${esc(w.meaning)}</span></p>${w.audio?`<button class="play-word" data-audio="${esc(w.audio)}" aria-label="${esc(text('play'))}" title="${esc(text('audioHint'))}" ${ctx.muted()?'disabled':''}>${ctx.icon('speaker')}${esc(text('wordAudio'))}</button>`:sound(w)}</div><div class="word-footer">${button('previous','previous',wordHistory.length?'':'disabled')}${button('mastered','master','',true)}${button('next','next')}</div></article>${wordExamples(w)}</div>${rail(list)}</div>`;
  }

  function phrases(s){
    const turns=content.scenes[s.id].dialogue||[];
    return `<div class="section-heading"><h2>${esc(text('phrases'))} <span class="tag">${turns.length} ${esc(text('dialogueCount'))}</span></h2><small>${esc(text('dialogueHint'))}</small></div><div class="scene-dialogue">${turns.map((turn,i)=>`<article class="example-card dialogue-turn" data-speaker="${turn.speaker}"><div class="example-head"><div class="sense-title"><span class="sense-index">${String(i+1).padStart(2,'0')}</span><span class="dialogue-speaker">${esc(text(turn.speaker==='a'?'speakerA':'speakerB'))}</span></div>${sound(turn)}</div><div class="interlinear">${turn.tokens.map(token=>`<button type="button" class="token token-audio" data-audio="${esc(token.audio)}" aria-label="${esc(text('play')+' '+token.thai)}" title="${esc(text('audioHint'))}" ${ctx.muted()?'disabled':''}><span class="thai" lang="th">${esc(token.thai)}</span><span class="gloss" lang="${locale()}">${esc(cleanGloss(local(token.translations)))}</span></button>`).join(' ')}</div><p class="translation">${esc(local(turn.translations))}</p></article>`).join('')}</div><p class="note">${esc(text('reviewNote'))}</p>`;
  }
  function action(b){
    ctx.cancelAudio();
    switch(b.dataset.sceneAction){
      case 'retry':error=false;break;
      case 'mode':mode=b.dataset.mode;break;
      case 'word':index=Number(b.dataset.index);mode='practice';wordHistory=[];break;
      case 'next':advance();break;
      case 'previous':if(wordHistory.length)index=wordHistory.pop();break;
      case 'master':advance(true);break;
    }
    ctx.render();
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-scene-action]');if(b&&!b.disabled&&location.hash.split('/')[0]==='#scenes')action(b);});
  document.addEventListener('input',e=>{
    if(e.target.id==='scene-search'){term=e.target.value;document.querySelector('#scene-grid').innerHTML=cards();}
    if(e.target.id==='scene-word-search'){wordTerm=e.target.value;document.querySelector('#scene-words').innerHTML=wordList(rows(scene()));}
  });
  document.addEventListener('change',e=>{if(e.target.id==='scene-group'){group=e.target.value;document.querySelector('#scene-grid').innerHTML=cards();}});
  document.addEventListener('keydown',event=>{
    if(location.hash.split('/')[0]!=='#scenes'||!selected||mode!=='practice'||document.querySelector('#modal')?.open||event.ctrlKey||event.altKey||event.metaKey||event.target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(event.key==='ArrowRight'&&currentWord()){event.preventDefault();action({dataset:{sceneAction:'next'}});}
    if(event.key==='ArrowLeft'&&wordHistory.length){event.preventDefault();action({dataset:{sceneAction:'previous'}});}
  });
  return {render,currentWord};
}
