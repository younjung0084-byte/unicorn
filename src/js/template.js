/* 시나리오 틀 엔진, 조사 처리 */
/* ---------- 틀 엔진 ---------- */
function parseTemplate(tpl){
  tpl = tpl.replace(/\r\n/g, '\n').replace(/^[ \t]*(\{\{\s*[#\/][^}]*\}\})[ \t]*\n/gm, '$1');
  const root = {c:[]}, stack = [root], errors = [];
  const re = /\{\{\s*([\s\S]*?)\s*\}\}/g;
  let last = 0, m;
  const top = () => stack[stack.length - 1];
  while((m = re.exec(tpl))){
    if(m.index > last) top().c.push({t:'text', v:tpl.slice(last, m.index)});
    const tag = m[1];
    if(tag[0] === '#'){
      const n = {t:'block', name:tag.slice(1).trim(), c:[], raw:m[0]};
      top().c.push(n); stack.push(n);
    }else if(tag[0] === '/'){
      if(stack.length > 1) stack.pop(); else errors.push('짝이 없는 닫기 표시: ' + m[0]);
    }else{
      top().c.push({t:'var', name:tag.trim(), raw:m[0]});
    }
    last = re.lastIndex;
  }
  if(last < tpl.length) root.c.push({t:'text', v:tpl.slice(last)});
  stack.slice(1).forEach(n => errors.push('닫는 표시가 없음: ' + n.raw));
  return {root, errors};
}

function findGroup(name){ return S.groups.find(g => g.label === name || g.key === name); }
function groupCtx(g, i){
  return {__g:g, 유형:g.label, 건수:g.items.length, 번호목록:fmtNos(g.items), 순번:i + 1, 가나다:GANADA[i] || String(i + 1)};
}
function itemCtx(it, i){
  const g = findGroup(it.type);
  return {__it:it, 번호:S.fmt.prefix + it.no + S.fmt.suffix, 번호원본:it.no, 안건명:it.title, 순번:i + 1, 유형:g ? g.label : it.type};
}
function globalCtx(){
  const c = {총건수:S.items.length, 유형수:S.groups.length};
  S.meta.forEach(m => { if(m.k.trim() && m.v.trim()) c[m.k.trim()] = m.v; });
  return c;
}
function lookup(name, ctx){
  let mm;
  if((mm = name.match(/^열\s*:\s*(.+)$/))){
    for(let i = ctx.length - 1; i >= 0; i--) if(ctx[i].__it){
      const v = ctx[i].__it.cols[mm[1].trim()];
      return v === undefined ? undefined : v;
    }
    return undefined;
  }
  if((mm = name.match(/^(건수|번호목록)\s*:\s*(.+)$/))){
    const g = findGroup(mm[2].trim());
    if(!g) return undefined;
    return mm[1] === '건수' ? String(g.items.length) : fmtNos(g.items);
  }
  for(let i = ctx.length - 1; i >= 0; i--) if(name in ctx[i]) return String(ctx[i][name]);
  return undefined;
}
function render(nodes, ctx, un){
  let out = '';
  for(const n of nodes){
    if(n.t === 'text'){ out += n.v; continue; }
    if(n.t === 'var'){
      const v = lookup(n.name, ctx);
      if(v === undefined){ un.add(n.raw); out += n.raw; } else out += v;
      continue;
    }
    const name = n.name;
    if(name === '각유형'){
      S.groups.forEach((g, i) => { out += render(n.c, ctx.concat(groupCtx(g, i)), un); });
    }else if(name === '안건'){
      let src = S.items;
      for(let i = ctx.length - 1; i >= 0; i--) if(ctx[i].__g){ src = ctx[i].__g.items; break; }
      src.forEach((it, i) => { out += render(n.c, ctx.concat(itemCtx(it, i)), un); });
    }else if(/^유형\s*=/.test(name)){
      const g = findGroup(name.replace(/^유형\s*=\s*/, '').trim());
      if(g && g.items.length) out += render(n.c, ctx.concat(groupCtx(g, S.groups.indexOf(g))), un);
    }else{
      un.add(n.raw);
    }
  }
  return out;
}
/* "을(를)" 같은 조사 표기를 앞 글자의 받침에 맞게 확정한다. */
const JOSA = {'을(를)':['을','를'], '이(가)':['이','가'], '은(는)':['은','는'], '과(와)':['과','와'], '와(과)':['과','와'], '으로(로)':['으로','로']};
const DIGIT_BATCHIM = '013678';   // 영·일·삼·육·칠·팔은 받침 있음
function fixJosa(text){
  return text.replace(/([가-힣0-9])(을\(를\)|이\(가\)|은\(는\)|과\(와\)|와\(과\)|으로\(로\))/g, (all, ch, j) => {
    const code = ch.charCodeAt(0);
    let jong;
    if(code >= 0xAC00 && code <= 0xD7A3) jong = (code - 0xAC00) % 28;
    else jong = DIGIT_BATCHIM.includes(ch) ? 1 : 0;
    const [withB, noB] = JOSA[j];
    if(j === '으로(로)') return ch + (jong === 0 || jong === 8 ? noB : withB);
    return ch + (jong ? withB : noB);
  });
}
function generate(){
  const {root, errors} = parseTemplate(S.template);
  const un = new Set();
  const text = fixJosa(render(root.c, [globalCtx()], un));
  return {text, errors, unresolved:[...un]};
}
