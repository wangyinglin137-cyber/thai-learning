export const localDate=(now=new Date())=>`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
export function sample(items, count, random=Math.random){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy.slice(0,Math.max(0,count));}
export function normalizeProgress(raw, words, levels){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('进度文件应为 JSON 对象');
  const result={_schema:2,_legacy_scores:{}};const learned=new Set();
  if(raw._legacy_scores&&typeof raw._legacy_scores==='object'&&!Array.isArray(raw._legacy_scores))result._legacy_scores={...raw._legacy_scores};
  for(const [key,value] of Object.entries(raw)){
    if(key.startsWith('_'))continue;
    if(!value||typeof value!=='object'||Array.isArray(value)||!Array.isArray(value.learned)||value.learned.some(x=>typeof x!=='string')||!Number.isInteger(value.best_score)||value.best_score<0||value.best_score>100)throw Error(`${key} 的进度格式不正确`);
    value.learned.forEach(t=>learned.add(t));
    if(!levels.includes(key))result._legacy_scores[key]=value.best_score;
  }
  if(Array.isArray(raw._unmapped_learned))raw._unmapped_learned.filter(x=>typeof x==='string').forEach(x=>learned.add(x));
  const known=new Set(words.map(w=>w.thai));
  for(const level of levels)result[level]={learned:words.filter(w=>w.level===level&&learned.has(w.thai)).map(w=>w.thai),best_score:raw[level]?.best_score||0};
  result._unmapped_learned=[...learned].filter(t=>!known.has(t));
  const d=raw._daily;
  if(d&&typeof d.date==='string'&&Array.isArray(d.words)&&Array.isArray(d.done)){
    const entries=[...new Set(d.words.filter(t=>typeof t==='string'&&known.has(t)))].slice(0,10);
    const studied=[...new Set([...(Array.isArray(d.studied)?d.studied:[]),...entries.filter(t=>d.done.includes(t))].filter(t=>typeof t==='string'&&known.has(t)))];
    result._daily={date:d.date,words:entries,done:entries.filter(t=>studied.includes(t)),studied,round:Number.isInteger(d.round)&&d.round>0&&d.round<=known.size?d.round:1};
  }
  if(raw._web&&typeof raw._web==='object')result._web={updated_at:Number(raw._web.updated_at)||0,muted:raw._web.muted===true,quizLevel:levels.includes(raw._web.quizLevel)?raw._web.quizLevel:levels[0]};
  result._scenes={learned:[...new Set((Array.isArray(raw._scenes?.learned)?raw._scenes.learned:[]).filter(x=>typeof x==='string'&&x.length<=200))]};
  return result;
}
export function learnedSet(progress,levels){return new Set(levels.flatMap(l=>progress[l].learned));}
export function ensureDaily(progress,words,levels,today=localDate(),random=Math.random){
  const learned=learnedSet(progress,levels);
  if(progress._daily?.date!==today)progress._daily={date:today,words:sample(words.filter(w=>!learned.has(w.thai)).map(w=>w.thai),10,random),done:[],studied:[],round:1};
  const daily=progress._daily;
  daily.done=[...new Set([...daily.done,...daily.words.filter(w=>learned.has(w)||(daily.studied||[]).includes(w))])].filter(t=>daily.words.includes(t));
  daily.studied=[...new Set([...(daily.studied||[]),...daily.done])];
  daily.round=daily.round||1;
  return daily;
}
export function dailyCandidates(progress,words,levels){
  const learned=learnedSet(progress,levels),studied=new Set(progress._daily?.studied||progress._daily?.done||[]);
  return words.filter(w=>!learned.has(w.thai)&&!studied.has(w.thai));
}
export function startDailyRound(progress,words,levels,today=localDate(),random=Math.random){
  const daily=ensureDaily(progress,words,levels,today,random);
  if(daily.done.length<daily.words.length)return daily;
  const candidates=dailyCandidates(progress,words,levels);
  if(!candidates.length)return daily;
  progress._daily={date:today,words:sample(candidates,10,random).map(w=>w.thai),done:[],studied:[...daily.studied],round:daily.words.length?daily.round+1:1};
  return progress._daily;
}
export function mergeProgress(current, incoming, words, levels){
  const result=normalizeProgress(current,words,levels), other=normalizeProgress(incoming,words,levels);
  for(const l of levels){result[l].learned=[...new Set([...result[l].learned,...other[l].learned])];result[l].best_score=Math.max(result[l].best_score,other[l].best_score);}
  result._scenes.learned=[...new Set([...result._scenes.learned,...other._scenes.learned])];
  result._legacy_scores={...other._legacy_scores,...result._legacy_scores};
  result._unmapped_learned=[...new Set([...result._unmapped_learned,...other._unmapped_learned])];
  if(other._daily&&(!result._daily||other._daily.date>result._daily.date))result._daily=other._daily;
  else if(other._daily&&result._daily&&other._daily.date===result._daily.date){
    const studied=[...new Set([...result._daily.studied,...other._daily.studied])];
    const active=other._daily.round>result._daily.round?other._daily:result._daily;
    result._daily={...active,studied,done:active.words.filter(t=>studied.includes(t))};
  }
  return result;
}
const normalizeSearch=text=>String(text??'').normalize('NFKC').trim().toLocaleLowerCase();
function withoutAnnotations(text){
  let previous;
  do{previous=text;text=text.replace(/\([^()]*\)|\[[^\[\]]*\]|【[^【】]*】/g,'');}while(text!==previous);
  return text.trim();
}
// Dictionary entries are immutable; cache their searchable meanings between keystrokes.
const searchIndexes=new WeakMap();
function searchIndex(word){
  if(searchIndexes.has(word))return searchIndexes.get(word);
  const meanings=[...new Set([word.cn,...(word.senses||[]).map(s=>s.cn),...(word.definitions||[])].filter(Boolean))].map((definition,index)=>{
    const text=withoutAnnotations(normalizeSearch(definition));
    return {definition,secondary:index!==0,text,parts:text.split(/[;，,、。\n/]+/).map(p=>p.trim().replace(/[.!?！？]+$/g,'')).filter(Boolean)};
  });
  const fields=[word.thai,word.roman,word.pron,word.cn,...(word.definitions||[])].filter(Boolean).map(normalizeSearch);
  const index={meanings,fields};searchIndexes.set(word,index);return index;
}
export function searchMatch(word,term){
  const raw=normalizeSearch(term);if(!raw)return null;
  const index=searchIndex(word);
  if(/\p{Script=Han}/u.test(raw)){
    const q=withoutAnnotations(raw);if(!q)return null;
    let best=null;
    for(const meaning of index.meanings){
      if(!meaning.text.includes(q))continue;
      const exact=meaning.text===q||meaning.parts.includes(q);
      const rank=exact?(meaning.secondary?2:meaning.text===q?0:1):(meaning.secondary?4:3);
      if(!best||rank<best.rank)best={kind:'chinese',rank,definition:meaning.definition,secondary:meaning.secondary,exact,meaningOrder:Math.max(0,meaning.parts.indexOf(q))};
    }
    return best;
  }
  let rank=Infinity;
  for(const field of index.fields){
    if(field===raw)rank=Math.min(rank,0);
    else if(field.startsWith(raw))rank=Math.min(rank,1);
    else if(field.includes(raw))rank=Math.min(rank,2);
  }
  return Number.isFinite(rank)?{kind:'text',rank}:null;
}
export function filterWords(words,progress,levels,{term='',level='全部等级',pos='全部词性',unlearned=false}={}){
  const learned=learnedSet(progress,levels);
  const pool=words.filter(w=>(level==='全部等级'||w.level===level)&&(pos==='全部词性'||(pos==='原课程'?w.original_course:(w.pos||[]).includes(pos)))&&(!unlearned||!learned.has(w.thai)));
  if(!term.trim())return pool;
  return pool.map((word,index)=>({word,index,match:searchMatch(word,term),levelOrder:levels.indexOf(word.level)})).filter(item=>item.match).sort((a,b)=>a.match.rank-b.match.rank||a.levelOrder-b.levelOrder||(a.match.meaningOrder||0)-(b.match.meaningOrder||0)||a.index-b.index).map(item=>item.word);
}
export function makeQuiz(words,progress,levels,mode,level,random=Math.random){
  const learned=learnedSet(progress,levels);
  const candidates=mode==='review'?words.filter(w=>learned.has(w.thai)):words.filter(w=>w.level===level&&w.quiz_eligible!==false);
  return sample(candidates,mode==='review'?10:20,random).map(word=>({id:word.id,options:sample([word.cn,...sample([...new Set(words.filter(w=>w.quiz_eligible!==false&&w.cn!==word.cn).map(w=>w.cn))],3,random)],4,random),answer:word.cn}));
}
