/* 화면 그리기, 복사/저장, 이벤트 */
/* ---------- 화면 그리기 ---------- */
function showErr(msg){ const e = $('#loadErr'); e.textContent = msg; e.hidden = false; }
function hideErr(){ $('#loadErr').hidden = true; }

function refreshAll(){
  const loaded = S.rows.length > 0;
  $('#fileInfo').hidden = !S.fileName;
  $('#s2').hidden = !loaded;
  if(S.fileName){
    $('#fileName').textContent = S.fileName;
    const sb = $('#sheetBox');
    sb.hidden = !S.buf;
    $('#sheet').innerHTML = S.sheetNames.map(n => `<option${n === S.sheet ? ' selected' : ''}>${esc(n)}</option>`).join('');
    $('#hrow').value = S.headerRow;
  }
  if(!loaded && S.fileName){ showErr('이 시트에는 읽을 수 있는 데이터가 없습니다. 다른 시트를 선택해 보세요.'); }
  renderMapping(); renderGroups(); renderPreview(); renderChips(); renderOutput();
}

function renderMapping(){
  const opts = (sel, none) => (none ? `<option value="">${none}</option>` : '') +
    S.headers.map(h => `<option value="${esc(h)}"${h === sel ? ' selected' : ''}>${esc(h)}</option>`).join('');
  $('#mapNo').innerHTML = opts(S.map.no, '(없음 · 행 순서대로 번호 부여)');
  $('#mapTitle').innerHTML = opts(S.map.title, '(사용 안 함)');
  $('#mapType').innerHTML = opts(S.map.type, '(구분 없이 전체를 한 묶음으로)');
}

function renderGroups(){
  const n = S.groups.length;
  let stat = `엑셀 ${S.data.length}행 → 안건 <b>${S.items.length}건</b> · 유형 <b>${n}개</b>`;
  const notes = [];
  if(S.skipNo) notes.push(`안건번호가 비어 제외 ${S.skipNo}행`);
  if(S.skipDup) notes.push(`중복 번호 제외 ${S.skipDup}행`);
  if(notes.length) stat += ` <span>(${notes.join(', ')})</span>`;
  $('#stat').innerHTML = stat;
  $('#groupBody').innerHTML = S.groups.map((g, i) => `
    <tr>
      <td><button type="button" class="mini" data-act="up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="위로">▲</button>
          <button type="button" class="mini" data-act="down" data-i="${i}" ${i === n - 1 ? 'disabled' : ''} aria-label="아래로">▼</button></td>
      <td>${esc(g.key)}</td>
      <td><input type="text" data-label="${i}" value="${esc(g.label)}" aria-label="${esc(g.key)} 표시명"></td>
      <td class="num"><span class="count">${g.items.length}</span></td>
      <td class="nos">${esc(fmtNos(g.items))}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="empty">표시할 안건이 없습니다. 열 지정을 확인해 주세요.</td></tr>';
  $('#fmtPrefix').value = S.fmt.prefix;
  $('#fmtSuffix').value = S.fmt.suffix;
  $('#fmtSep').value = S.fmt.sep;
  $('#fmtRange').checked = S.fmt.range;
  $('#optDedupe').checked = S.fmt.dedupe;
  $('#optFill').checked = S.fmt.fill;
}

function refreshNos(){
  document.querySelectorAll('#groupBody .nos').forEach((td, i) => { if(S.groups[i]) td.textContent = fmtNos(S.groups[i].items); });
}

function renderPreview(){
  const rows = S.data.slice(0, 15);
  $('#preview').innerHTML =
    '<thead><tr><th class="num">행</th>' + S.headers.map(h => `<th>${esc(h)}</th>`).join('') + '</tr></thead><tbody>' +
    rows.map(d => `<tr><td class="num">${d.row}</td>` + S.headers.map(h => `<td>${esc(d.cols[h])}</td>`).join('') + '</tr>').join('') + '</tbody>';
}

function chip(text, cls){ return `<button type="button" class="chip ${cls || ''}" data-ins="${esc(text)}">${esc(text.replace(/\n/g, ' ').trim())}</button>`; }
function renderMeta(){
  $('#metaList').innerHTML = S.meta.map((m, i) => `
    <div class="meta-row">
      <input type="text" data-mk="${i}" value="${esc(m.k)}" aria-label="항목 이름">
      <input type="text" data-mv="${i}" value="${esc(m.v)}" aria-label="${esc(m.k)} 값" placeholder="값 입력">
      <button type="button" data-mdel="${i}" aria-label="항목 삭제">×</button>
    </div>`).join('');
}
function renderChips(){
  $('#chipsBasic').innerHTML = chip('{{총건수}}') + chip('{{유형수}}') +
    S.meta.filter(m => m.k.trim()).map(m => chip('{{' + m.k.trim() + '}}')).join('') +
    chip('[쪽나눔]\n');
  $('#chipsBlock').innerHTML =
    chip('{{#각유형}}\n\n{{/각유형}}\n', 'block') +
    chip('{{#안건}}\n{{번호}} {{안건명}}\n{{/안건}}\n', 'block');
  $('#chipsInner').innerHTML = ['유형','건수','번호목록','순번','가나다','번호','번호원본','안건명'].map(k => chip('{{' + k + '}}')).join('') +
    S.headers.map(h => chip('{{열:' + h + '}}')).join('');
  $('#chipsGroups').innerHTML = S.groups.length ? S.groups.map(g => `
    <div class="gline"><span class="gname">${esc(g.label)}</span>
      ${chip('{{건수:' + g.label + '}}')}${chip('{{번호목록:' + g.label + '}}')}${chip('{{#유형=' + g.label + '}}\n\n{{/유형}}\n', 'block')}
    </div>`).join('') : '<div class="empty">엑셀을 불러오면 유형별 버튼이 나타납니다.</div>';
}

function renderOutput(){
  const has = S.items.length > 0;
  $('#outEmpty').hidden = has;
  $('#outBox').hidden = !has;
  if(!has) return;
  const r = generate();
  $('#out').value = r.text;
  const w = $('#warn');
  const msgs = [];
  if(r.errors.length) msgs.push(`<b>틀 구조 확인 필요</b><ul>${r.errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`);
  if(r.unresolved.length) msgs.push(`<b>값을 채우지 못한 항목</b> (회의 정보 미입력이거나 알 수 없는 이름) — 결과에 그대로 남아 있습니다.<ul>${r.unresolved.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`);
  w.innerHTML = msgs.join('');
  w.hidden = !msgs.length;
}

/* ---------- 샘플 ---------- */
function loadSample(){
  hideErr();
  const T = ['신규','변경','재심의','보고'];
  const rows = [['안건번호','안건명','심의구분','소관부서','비고']];
  const list = [
    [1,'A사업 시행계획(안)',T[0],'기획과'],[2,'B시설 건립 계획(안)',T[0],'시설과'],[3,'C지구 정비 기본계획(안)',T[0],'도시과'],
    [4,'D사업 규모 변경(안)',T[1],'기획과'],[5,'E계획 기간 조정(안)',T[1],'복지과'],[6,'F시설 용도 변경(안)',T[1],'시설과'],
    [7,'G사업 추진방식(안)',T[0],'교통과'],[8,'H계획 보완사항 재심의',T[2],'도시과'],
    [9,'I사업 추진현황 보고',T[3],'기획과'],[10,'J지구 조성 경과 보고',T[3],'도시과'],
    [11,'K시설 운영 실적 보고',T[3],'시설과'],[12,'L계획 종합 보고',T[3],'복지과']
  ];
  list.forEach(r => rows.push([String(r[0]), r[1], r[2], r[3], '']));
  S.buf = null; S.fileName = '샘플 데이터 (내장)'; S.sheetNames = ['샘플']; S.sheet = '샘플';
  S.order = []; S.labels = {}; S.map = {no:'', title:'', type:''};
  setRows(rows);
}

/* ---------- 복사 / 저장 ---------- */
function flash(msg){
  const s = $('#copyStatus'); s.textContent = msg;
  clearTimeout(flash.t); flash.t = setTimeout(() => { s.textContent = ''; }, 2500);
}
async function copyOut(){
  const ta = $('#out');
  try{
    await navigator.clipboard.writeText(ta.value);
    flash('복사되었습니다');
  }catch(e){
    ta.focus(); ta.select();
    flash(document.execCommand('copy') ? '복사되었습니다' : '복사에 실패했습니다. 직접 선택해서 복사해 주세요.');
  }
}
function downloadBlob(text, name, type){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type}));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function today(){ const d = new Date(); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }

/* ---------- 이벤트 ---------- */
function bind(){
  $('#file').addEventListener('change', e => { if(e.target.files[0]) loadFile(e.target.files[0]); e.target.value = ''; });
  const drop = $('#drop');
  ['dragenter','dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if(f) loadFile(f); });
  ['dragover','drop'].forEach(t => window.addEventListener(t, e => e.preventDefault()));
  $('#sample').addEventListener('click', loadSample);

  $('#sheet').addEventListener('change', e => { S.order = []; S.labels = {}; loadSheet(e.target.value); });
  $('#hrow').addEventListener('change', e => {
    S.headerRow = Math.max(1, parseInt(e.target.value, 10) || 1);
    buildData(); refreshAll();
  });
  $('#optFill').addEventListener('change', e => { S.fmt.fill = e.target.checked; save(); if(S.buf) loadSheet(S.sheet); });
  $('#optDedupe').addEventListener('change', e => { S.fmt.dedupe = e.target.checked; save(); analyze(); refreshAll(); });

  [['#mapNo','no'],['#mapTitle','title'],['#mapType','type']].forEach(([sel, k]) =>
    $(sel).addEventListener('change', e => { S.map[k] = e.target.value; analyze(); refreshAll(); }));

  $('#groupBody').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if(!b) return;
    const i = +b.dataset.i, j = b.dataset.act === 'up' ? i - 1 : i + 1;
    if(j < 0 || j >= S.order.length) return;
    [S.order[i], S.order[j]] = [S.order[j], S.order[i]];
    buildGroups(); renderGroups(); renderChips(); renderOutput();
  });
  $('#groupBody').addEventListener('input', e => {
    const i = e.target.dataset.label; if(i === undefined) return;
    const g = S.groups[+i], v = e.target.value.trim();
    if(v) S.labels[g.key] = v; else delete S.labels[g.key];
    g.label = v || g.key;
    renderChips(); renderOutput();
  });

  [['#fmtPrefix','prefix'],['#fmtSuffix','suffix'],['#fmtSep','sep']].forEach(([sel, k]) =>
    $(sel).addEventListener('input', e => { S.fmt[k] = e.target.value; save(); refreshNos(); renderOutput(); }));
  $('#fmtRange').addEventListener('change', e => { S.fmt.range = e.target.checked; save(); refreshNos(); renderOutput(); });

  const tpl = $('#tpl');
  tpl.addEventListener('input', () => { S.template = tpl.value; save(); renderOutput(); });
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-ins]'); if(!c) return;
    tpl.setRangeText(c.dataset.ins, tpl.selectionStart, tpl.selectionEnd, 'end');
    tpl.focus(); S.template = tpl.value; save(); renderOutput();
  });

  $('#metaList').addEventListener('input', e => {
    const t = e.target;
    if(t.dataset.mk !== undefined){ S.meta[+t.dataset.mk].k = t.value; renderChips(); }
    else if(t.dataset.mv !== undefined){ S.meta[+t.dataset.mv].v = t.value; }
    else return;
    save(); renderOutput();
  });
  $('#metaList').addEventListener('click', e => {
    const b = e.target.closest('[data-mdel]'); if(!b) return;
    S.meta.splice(+b.dataset.mdel, 1); save(); renderMeta(); renderChips(); renderOutput();
  });
  $('#metaAdd').addEventListener('click', () => {
    S.meta.push({k:'새항목', v:''}); save(); renderMeta(); renderChips();
    const ins = document.querySelectorAll('#metaList [data-mk]'); const last = ins[ins.length - 1]; last.focus(); last.select();
  });

  $('#tplReset').addEventListener('click', () => {
    if(!confirm('시나리오 틀을 기본 틀로 되돌립니다. 지금까지 작성한 틀은 사라집니다. 계속할까요?')) return;
    S.template = DEFAULT_TEMPLATE; tpl.value = S.template; save(); renderOutput();
  });
  $('#tplExport').addEventListener('click', () =>
    downloadBlob(JSON.stringify(pack(), null, 2), '시나리오틀_' + today() + '.json', 'application/json'));
  $('#tplImport').addEventListener('click', () => $('#tplFile').click());
  $('#tplFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if(!f) return;
    try{
      applySettings(JSON.parse(await f.text()));
      save(); tpl.value = S.template; renderMeta(); renderDocOpts(); renderGroups(); renderChips(); renderOutput();
    }catch(err){ alert('틀 파일을 읽지 못했습니다. 이 프로그램에서 내보낸 .json 파일인지 확인해 주세요.'); }
  });

  $('#copy').addEventListener('click', copyOut);
  $('#download').addEventListener('click', () =>
    downloadBlob(String.fromCharCode(0xFEFF) + $('#out').value.replace(/\n/g, '\r\n'), '회의시나리오_' + today() + '.txt', 'text/plain;charset=utf-8'));
  $('#dlDocx').addEventListener('click', () => {
    try{
      downloadBlob(buildDocx($('#out').value, S.doc), '회의시나리오_' + today() + '.docx', DOCX_MIME);
      flash('Word 파일을 저장했습니다');
    }catch(e){
      flash('Word 파일을 만들지 못했습니다: ' + (e && e.message || e));
    }
  });
  $('#docFont').addEventListener('change', e => { S.doc.font = e.target.value; save(); });
  $('#docSize').addEventListener('change', e => { S.doc.size = parseFloat(e.target.value); save(); });
  $('#docPageNo').addEventListener('change', e => { S.doc.pageNo = e.target.checked; save(); });
}

function renderDocOpts(){
  const fonts = DOCX_FONTS.includes(S.doc.font) ? DOCX_FONTS : DOCX_FONTS.concat(S.doc.font);
  $('#docFont').innerHTML = fonts.map(f => `<option${f === S.doc.font ? ' selected' : ''}>${esc(f)}</option>`).join('');
  $('#docSize').innerHTML = DOCX_SIZES.map(s => `<option${s === S.doc.size ? ' selected' : ''}>${s}</option>`).join('');
  $('#docPageNo').checked = !!S.doc.pageNo;
}
