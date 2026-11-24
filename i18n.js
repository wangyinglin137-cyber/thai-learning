const KEY = 'thai-studio-native-language';
window.addEventListener('storage', event => {
  if (event.key === 'thai-studio-reset' && event.newValue) location.replace('/?v=' + Date.now());
});
const supported = ['zh-CN', 'en', 'my'];
let language = 'zh-CN', messages = {}, reviewed = {};
let trie = {};
const originals = new WeakMap(), packs = new Map();
const listeners = new Set();
export const onLocaleChange = callback => listeners.add(callback);
let observer;
const observe = () => observer.observe(document.documentElement, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder','content']});
function originalTranslation(node, key, value) {
  let fields = originals.get(node);
  if (!fields) originals.set(node, fields = new Map());
  const previous = fields.get(key);
  const source = previous && value === previous.rendered ? previous.source : value;
  const rendered = translate(source);
  fields.set(key, {source, rendered});
  return rendered;
}
async function loadPack(next) {
  if (next === 'zh-CN') return {messages:{}, reviewed:{}, trie:{}};
  if (packs.has(next)) return packs.get(next);
  const responses = await Promise.all([fetch(`locale-${next}.json`), fetch('reviewed-translations.json')]);
  if (responses.some(response => !response.ok)) throw Error('Language file unavailable');
  const [messages, corrections] = await Promise.all(responses.map(response => response.json()));
  const trie = {};
  for (const [key, value] of Object.entries(messages)) {
    if (!/^[\u3400-\u9fff]+$/.test(key)) continue;
    let node = trie;
    for (const char of key) node = node[char] ||= {};
    node.translation = value;
  }
  const pack = {messages, reviewed:corrections[next] || {}, trie};
  packs.set(next, pack);
  return pack;
}
function activate(next, pack) {
  language = next;
  ({messages, reviewed, trie} = pack);
  document.documentElement.lang = language;
  let note = document.querySelector('.translation-notice');
  if (language === 'zh-CN') {note?.remove(); return;}
  if (!note) {
    note = document.createElement('p'); note.className = 'translation-notice';
    note.setAttribute('translate', 'no');
    document.querySelector('.sidebar-bottom').append(note);
  }
  note.textContent = language === 'en' ? 'Machine translations with AI-assisted corrections; not reviewed by a native-speaking teacher.' : 'စက်ဘာသာပြန်ချက်များကို AI ဖြင့် ပြင်ဆင်ထားပါသည်။ မိခင်ဘာသာစကားပြော ဆရာက စစ်ဆေးထားခြင်း မရှိပါ။';
}
const han = /[\u3400-\u9fff]+/g;
function translateFragment(text) {
  if (messages[text]) return messages[text];
  const parts = [];
  for (let start = 0; start < text.length;) {
    let node = trie, end = start, match = null;
    while (end < text.length && node[text[end]]) {
      node = node[text[end++]];
      if (node.translation) match = {end, value:node.translation};
    }
    if (match) {parts.push(match.value); start = match.end;}
    else parts.push(text[start++]);
  }
  return parts.join(' ');
}
export const locale = () => language;
export function translate(value) {
  if (language === 'zh-CN' || typeof value !== 'string') return value;
  return value.split('\n').map(line => messages[line] || line.replace(han, translateFragment)).join('\n');
}
function meaning(thai, source) {
  return reviewed.meanings?.[thai]?.[source] ?? translate(source);
}
function sentence(wordThai, sourceMeaning, item) {
  const key = wordThai + '\t' + sourceMeaning + '\t' + item.example;
  return reviewed.sense_examples?.[key] ?? reviewed.sentences?.[item.example] ?? translate(item.example_cn);
}
// Normalize displayed glosses only, after translation lookup. Keep sentences untouched.
export function cleanGloss(value) {
  if (typeof value !== 'string') return value;
  let text=value.trim();
  if (!/[\p{L}\p{N}]/u.test(text)) return text;
  text=text.replace(/[。၊။，,；;、]+$/u,'').trimEnd();
  // Preserve ellipses and conventional English abbreviations.
  if (!/(?:\.\.|\b(?:[a-z]\.)+|\b(?:etc|mr|mrs|ms|dr|vs|no|st)\.)$/i.test(text)) text=text.replace(/\.$/,'');
  return text;
}
function cleanWordGlosses(data) {
  for (const word of data.words) {
    word.cn=cleanGloss(word.cn);
    word.definitions=(word.definitions||[]).map(cleanGloss);
    if(word.example_tokens) word.example_tokens=word.example_tokens.map(([thai,gloss])=>[thai,cleanGloss(gloss)]);
    for(const sense of word.senses||[]) {
      sense.cn=cleanGloss(sense.cn);
      if(sense.example_tokens) sense.example_tokens=sense.example_tokens.map(([thai,gloss])=>[thai,cleanGloss(gloss)]);
    }
  }
  return data;
}

export function localizeData(data) {
  if (language === 'zh-CN') return cleanWordGlosses(data);
  // Stable Thai spellings, IDs and Chinese level keys retain progress compatibility.
  for (const word of data.words) {
    const sourceMeaning = word.cn;
    word.cn = meaning(word.thai, sourceMeaning);
    word.definitions = (word.definitions || []).map(text => meaning(word.thai, text));
    word.grade_reason = translate(word.grade_reason);
    if (word.example_cn) word.example_cn = sentence(word.thai, sourceMeaning, word);
    if (word.example_tokens) word.example_tokens = word.example_tokens.map(([thai, gloss]) => [thai, meaning(thai, gloss)]);
    for (const sense of word.senses || []) {
      const sourceSense = sense.cn;
      sense.example_cn = sentence(word.thai, sourceSense, sense);
      sense.cn = meaning(word.thai, sourceSense);
      sense.example_tokens = (sense.example_tokens || []).map(([thai, gloss]) => [thai, meaning(thai, gloss)]);
    }
  }
  for (const key of Object.keys(data.level_info)) data.level_info[key] = translate(data.level_info[key]);
  return cleanWordGlosses(data);
}

function localizeNode(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    if (root.parentElement?.closest('script,style,[translate="no"], [lang="th"]')) return;
    const next = originalTranslation(root, 'text', root.nodeValue);
    if (next !== root.nodeValue) root.nodeValue = next;
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE || root.matches('script,style,[translate="no"],[lang="th"]')) return;
  for (const attr of ['aria-label', 'title', 'placeholder', 'content']) {
    if (root.hasAttribute(attr)) {
      const old = root.getAttribute(attr), next = originalTranslation(root, attr, old);
      if (next !== old) root.setAttribute(attr, next);
    }
  }
  for (const child of root.childNodes) localizeNode(child);
}
async function chooseFirstLanguage() {
  const dialog = document.createElement('dialog');
  dialog.id = 'native-language-welcome';
  dialog.setAttribute('translate', 'no');
  dialog.setAttribute('aria-labelledby', 'welcome-language-title');
  dialog.innerHTML = `<h1 id="welcome-language-title"><span lang="zh-CN">请选择母语</span><span lang="en">Choose your native language</span><span lang="my">မိခင်ဘာသာစကားကို ရွေးချယ်ပါ</span></h1>
    <div class="welcome-language-options">
      <button type="button" data-language="zh-CN" lang="zh-CN">中文</button>
      <button type="button" data-language="en" lang="en">English</button>
      <button type="button" data-language="my" lang="my">မြန်မာဘာသာ</button>
    </div>`;
  dialog.addEventListener('cancel', event => event.preventDefault());
  document.body.append(dialog);
  return new Promise(resolve => {
    dialog.addEventListener('click', event => {
      const choice = event.target.closest('[data-language]')?.dataset.language;
      if (!supported.includes(choice)) return;
      try {localStorage.setItem(KEY, choice);} catch {}
      dialog.close();
      dialog.remove();
      resolve(choice);
    });
    dialog.showModal();
  });
}
export async function initLocale() {
  let saved;
  try {saved = localStorage.getItem(KEY);} catch {}
  const initial = supported.includes(saved) ? saved : await chooseFirstLanguage();
  const select = document.getElementById('native-language');
  try {activate(initial, await loadPack(initial));}
  catch {
    activate('zh-CN', await loadPack('zh-CN'));
    document.getElementById('save-status').textContent = 'Could not load language. Please retry.';
  }
  select.value = language;
  localizeNode(document.documentElement);
  observer = new MutationObserver(records => {
    observer.disconnect();
    for (const record of records) {
      if (record.type === 'childList') record.addedNodes.forEach(localizeNode);
      else localizeNode(record.target);
    }
    observe();
  });
  observe();
  select.addEventListener('change', async () => {
    const next = select.value;
    if (!supported.includes(next) || next === language || select.disabled) return;
    select.disabled = true;
    select.setAttribute('aria-busy', 'true');
    try {
      const pack = await loadPack(next);
      // Flush pending Chinese UI changes using the old language before switching.
      observer.disconnect();
      localizeNode(document.documentElement);
      const position = {x:scrollX, y:scrollY};
      activate(next, pack);
      for (const callback of listeners) callback();
      localizeNode(document.documentElement);
      scrollTo(position.x, position.y);
      try {localStorage.setItem(KEY, next);} catch {}
    } catch {
      alert(language === 'zh-CN' ? '语言文件加载失败，请重试。' : language === 'en' ? 'Could not load language. Please retry.' : 'ဘာသာစကားဖိုင်ကို မဖွင့်နိုင်ပါ။ ထပ်စမ်းပါ။');
    } finally {
      select.value = language;
      select.disabled = false;
      select.removeAttribute('aria-busy');
      observe();
    }
  });
}
