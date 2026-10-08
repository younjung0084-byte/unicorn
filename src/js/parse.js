/* 엑셀 읽기와 분석, 안건번호 표기 */
/* ---------- 파일 읽기 ---------- */
async function loadFile(file){
  hideErr();
  try{
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, {type:'array'});   // 읽기에 실패하면 여기서 끝나고, 이미 등록된 파일 상태는 그대로 남는다
    S.buf = buf;
    S.fileName = file.name;
    S.sheetNames = wb.SheetNames.slice();
    S.order = []; S.labels = {};
    const name = findRosterSheet(S.sheetNames);   // 읽는 시트는 항상 간사용명부
    if(name) loadSheet(name); else { S.sheet = ''; setRows([]); }
    buildRoster();
    renderRoster();
    return true;
  }catch(e){
    showErr('파일을 읽지 못했습니다. 손상되었거나 지원하지 않는 형식일 수 있습니다. (' + (e && e.message || e) + ')');
    return false;
  }
}

/* 시트 하나를 "행 × 열 글자" 표로 읽는다. 배열 번호 i 는 엑셀의 i+1 행과 같다. */
function sheetRows(name){
  const wb = XLSX.read(S.buf, {type:'array'});
  const ws = wb.Sheets[name];
  if(!ws || !ws['!ref']) return [];
  const rg = XLSX.utils.decode_range(ws['!ref']);
  if(ws['!merges']){   // 병합된 칸은 합쳐진 모든 줄에 같은 값이 들어 있는 것으로 읽는다
    for(const m of ws['!merges']){
      const tl = ws[XLSX.utils.encode_cell(m.s)];
      if(!tl) continue;
      for(let r = m.s.r; r <= m.e.r; r++) for(let c = m.s.c; c <= m.e.c; c++){
        if(r === m.s.r && c === m.s.c) continue;
        ws[XLSX.utils.encode_cell({r, c})] = Object.assign({}, tl);
      }
    }
  }
  ws['!ref'] = XLSX.utils.encode_range({s:{r:0,c:0}, e:rg.e});
  const aoa = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:false, blankrows:true});
  return aoa.map(r => r.map(v => String(v).trim()));
}

function loadSheet(name){
  S.sheet = name;
  setRows(sheetRows(name));
}

function setRows(rows){
  S.rows = rows;
  let h = 0;
  for(let i = 0; i < Math.min(15, rows.length); i++){
    if(rows[i].filter(Boolean).length >= 2){ h = i; break; }
  }
  S.headerRow = h + 1;
  buildData();
  refreshAll();
}

function buildData(){
  const hr = S.rows[S.headerRow - 1] || [];
  const body = S.rows.slice(S.headerRow);
  let width = 0;
  hr.forEach((v, i) => { if(v) width = Math.max(width, i + 1); });
  body.forEach(r => r.forEach((v, i) => { if(v) width = Math.max(width, i + 1); }));
  const used = {};
  S.headers = [];
  for(let i = 0; i < width; i++){
    let name = hr[i] || ('열' + (i + 1));
    if(used[name]){ used[name]++; name += '(' + used[name] + ')'; } else used[name] = 1;
    S.headers.push(name);
  }
  S.data = [];
  body.forEach((r, idx) => {
    if(!r.some(Boolean)) return;
    const cols = {};
    S.headers.forEach((h, i) => cols[h] = r[i] || '');
    S.data.push({row: S.headerRow + idx + 1, cols});
  });
  guessMap();
  analyze();
}

function guessMap(){
  const find = (pats, skip) => {
    for(const re of pats){ const h = S.headers.find(h => h !== skip && re.test(h)); if(h) return h; }
    return '';
  };
  const keep = (cur, guess) => S.headers.includes(cur) ? cur : guess;
  S.map.no    = keep(S.map.no,    find([/번호/, /순번|No\.?$/i, /호수/]));
  S.map.title = keep(S.map.title, find([/안건명|건명/, /제목|명칭|사업명/, /안건/, /내용/], S.map.no));
  S.map.type  = keep(S.map.type,  find([/유형|구분|종류|분류/, /결과/], S.map.no));
}

function analyze(){
  const m = S.map, items = [];
  S.skipNo = 0;
  S.data.forEach(d => {
    const no = m.no ? d.cols[m.no] : String(items.length + 1);
    if(m.no && !no){ S.skipNo++; return; }
    items.push({
      no, title: m.title ? d.cols[m.title] : '',
      type: m.type ? (d.cols[m.type] || '(미분류)') : '(전체)',
      cols: d.cols, row: d.row
    });
  });
  const byType = new Map();
  items.forEach(it => { if(!byType.has(it.type)) byType.set(it.type, []); byType.get(it.type).push(it); });
  S.order = S.order.filter(k => byType.has(k)).concat([...byType.keys()].filter(k => !S.order.includes(k)));
  S.items = items;
  buildGroups(byType);
}

function buildGroups(byType){
  if(!byType){
    byType = new Map();
    S.items.forEach(it => { if(!byType.has(it.type)) byType.set(it.type, []); byType.get(it.type).push(it); });
  }
  S.groups = S.order.map(k => ({key:k, label:(S.labels[k] || k), items:byType.get(k)}));
}

/* ---------- 번호 표기 ---------- */
function fmtNos(items){
  const {prefix:p, suffix:s, sep, range} = S.fmt;
  const f = n => p + n + s;
  const nos = items.map(i => i.no);
  if(!range || !nos.every(n => /^[1-9]\d*$/.test(n))) return nos.map(f).join(sep);
  const nums = [...new Set(nos.map(Number))].sort((a, b) => a - b);
  const parts = [];
  let i = 0;
  while(i < nums.length){
    let j = i;
    while(j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    if(j - i >= 2) parts.push(f(nums[i]) + '~' + f(nums[j]));
    else for(let k = i; k <= j; k++) parts.push(f(nums[k]));
    i = j + 1;
  }
  return parts.join(sep);
}
