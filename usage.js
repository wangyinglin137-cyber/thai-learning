import {usageAudio} from './usage-audio.js?v=20261021-scene-usage-48k-1';
const labels={
  'zh-CN':{context:'适用场景',tip:'用法提示',patterns:'常用搭配'},
  en:{context:'When to use it',tip:'Usage tip',patterns:'Common patterns'},
  my:{context:'အသုံးပြုသည့်အခြေအနေ',tip:'အသုံးပြုရန်မှတ်ချက်',patterns:'တွဲဖက်အသုံးများ'}
};
const audioLabels={'zh-CN':'点击发音',en:'Play pronunciation',my:'အသံထွက် နားထောင်ရန်'};
function spokenText(text,esc,language,muted){
  const pattern=/[\u0e00-\u0e7f]+(?:[ \t]+[\u0e00-\u0e7f]+)*/g;
  let html='',offset=0;
  for(const match of text.matchAll(pattern)){
    html+=esc(text.slice(offset,match.index));
    const thai=match[0],audio=usageAudio[thai];
    html+=audio?`<button type="button" class="usage-pronunciation" lang="th" data-audio="${esc(audio)}" aria-label="${esc(audioLabels[language]+' '+thai)}" title="${esc(audioLabels[language])}" ${muted?'disabled':''}>${esc(thai)}</button>`:esc(thai);
    offset=match.index+thai.length;
  }
  return html+esc(text.slice(offset));
}
export function usageTitle(sense,esc,language){
  const title=sense.usage?.[language]?.title;
  return title?`<span translate="no" lang="${esc(language)}">${esc(title)}</span>`:esc(sense.cn);
}
export function renderUsage(sense,esc,language,muted=false){
  const usage=sense.usage?.[language];const origin=sense.loan_origin?.text?.[language];if(!usage&&!origin)return '';
  const l=labels[language];if(!l)return '';
  const originLabel=({'zh-CN':'音译来源',en:'Loanword origin',my:'အသံဖလှယ်စကားလုံး၏ မူရင်း'})[language];
  const originHtml=origin?`<div class="loan-origin"><dt>${esc(originLabel)}</dt><dd>${spokenText(origin,esc,language,muted)}</dd></div>`:'';
  if(!usage)return `<div class="sense-usage loan-origin-only" translate="no" lang="${esc(language)}"><dl>${originHtml}</dl></div>`;
  return `<div class="sense-usage" translate="no" lang="${esc(language)}"><dl>${originHtml}
    <div><dt>${esc(l.context)}</dt><dd>${spokenText(usage.context,esc,language,muted)}</dd></div>
    <div class="usage-tip"><dt>${esc(l.tip)}</dt><dd>${spokenText(usage.tip,esc,language,muted)}</dd></div>
    <div><dt>${esc(l.patterns)}</dt><dd><ul>${usage.patterns.map(([phrase,meaning])=>`<li><strong>${spokenText(phrase,esc,language,muted)}</strong><span>${spokenText(meaning,esc,language,muted)}</span></li>`).join('')}</ul></dd></div>
  </dl></div>`;
}

export function renderExampleAudio(filename,esc,language,muted,speakerIcon){
  if(!filename)return '';
  const label=({'zh-CN':'例句发音',en:'Play example',my:'ဥပမာဝါကျ အသံထွက်'})[language]||'例句发音';
  return `<div class="example-audio-row" translate="no"><button type="button" class="button soft example-audio-button" data-audio="${esc(filename)}" aria-label="${esc(label)}" title="${esc(label)}" lang="${esc(language)}" ${muted?'disabled':''}>${speakerIcon}<span>${esc(label)}</span></button></div>`;
}
