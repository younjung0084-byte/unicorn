/* 화면 그리기, 복사/저장, 이벤트 */
/* ---------- 화면 그리기 ---------- */
function showErr(msg){   // 카드 안과 ‘파일 변경’ 창 안(열려 있을 때 가려지지 않도록) 양쪽에 보여준다
  ['#loadErr', '#modalErr'].forEach(s => { const e = $(s); e.textContent = msg; e.hidden = false; });
}
function hideErr(){ $('#loadErr').hidden = true; $('#modalErr').hidden = true; }

function refreshAll(){
  const loaded = S.rows.length > 0;
  $('#s2').hidden = !loaded;
  renderDrop();
  if(!loaded && S.sheet){ showErr(`‘${S.sheet}’ 시트에 읽을 수 있는 데이터가 없습니다.`); }
  renderMapping(); renderGroups(); renderPreview(); renderChips(); renderOutput();
}

/* 파일 올리는 칸: 파일이 없으면 카드 안에, 등록한 뒤에는 ‘파일 변경’ 창 안으로 옮기고
   제목 옆에는 배지와 파일 이름을 보여준다 */
function renderDrop(){
  const has = !!S.fileName;
  $('#drop').classList.toggle('has-file', has);
  $('#dropTag').hidden = !has;
  $('#dropTitle').textContent = has ? S.fileName : '클릭하여 파일 선택';
  $('#dropSub').textContent = has ? '다른 파일로 바꾸려면 클릭하거나 끌어다 놓으세요' : '또는 여기로 파일을 끌어다 놓기';
  const slot = has ? $('#modalDropSlot') : $('#dropHome'), wrap = $('#dropWrap');
  if(wrap.parentElement !== slot) slot.appendChild(wrap);
  $('#regSub').hidden = has;
  $('#fileBadge').hidden = !has;
  const chip = $('#fileChip');
  chip.hidden = !has;
  chip.textContent = S.fileName;
  chip.title = S.fileName;
}

/* ‘파일 변경’ 창 */
let modalReturn = null;
function openModal(){
  const m = $('#uploadModal');
  if(!m.hidden) return;
  modalReturn = document.activeElement;
  m.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#modalErr').hidden = true;
  $('#drop').focus();
}
function closeModal(){
  const m = $('#uploadModal');
  if(m.hidden) return;
  m.hidden = true;
  document.body.style.overflow = '';
  if(modalReturn && document.body.contains(modalReturn)) modalReturn.focus();
}
/* 파일을 읽고, 성공하면 ‘파일 변경’ 창을 닫는다 */
async function registerFile(f){
  if(await loadFile(f)) closeModal();
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
  if(S.skipNo) stat += ` <span>(안건번호가 비어 제외 ${S.skipNo}행)</span>`;
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
  $('#chipsBasic').innerHTML = chip('{{위원회명}}') + chip('{{차수}}') + chip('{{개최일자}}') +
    chip('{{총건수}}') + chip('{{유형수}}') +
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

/* ---------- 간사용명부: 심의사유별 안건 현황 ---------- */
function renderRoster(){
  const R = S.roster, box = $('#rosterBox'), err = $('#rosterErr');
  err.hidden = !(R && R.error);
  box.hidden = !(R && !R.error);
  if(R && R.error) err.textContent = R.error;
  if(!R || R.error) return;

  // 요약 문장(시나리오에도 들어갈 내용): 심의사유별 건수 / 총 N개 안건, M개 의안
  const sm = rosterSummary(R);
  // 숫자와 ‘건’(쉼표 포함)은 한 덩어리(nw)로 묶어서 "1 / 건"으로 갈라지거나 쉼표가 줄 맨 앞에 오지 않게 한다
  const last = sm.parts.length - 1;
  $('#rosterSummary').innerHTML =
    `<p>${sm.parts.length ? sm.parts.map((p, i) => `${esc(p.name)} <span class="nw"><b>${p.n}</b>건${i < last ? ',' : ''}</span>`).join(' ') : '심의사유로 분류된 의안이 없습니다.'}</p>` +
    `<p><span class="nw">총 <b>${sm.types}</b>개 안건,</span> <span class="nw"><b>${sm.total}</b>개 의안입니다.</span></p>`;

  // 요약 아래 알림: 사람이 확인해야 할 것(노란색)을 먼저, 참고(회색)를 뒤에
  const alerts = [];
  if(R.bad) alerts.push(['warn', `<b>분류 안 됨 ${R.bad}건</b> — 표의 ‘분류 안 됨’을 눌러 이유를 확인해 주세요. 위 건수에는 들어 있지 않습니다.`]);
  if(R.warn) alerts.push(['warn', `<b>확인 필요 ${R.warn}건</b> — 심의사유에 인식하지 못한 글자가 섞여 있습니다. ‘건별 분류 내역’에서 확인해 주세요.`]);
  sm.notes.forEach(n => alerts.push(['info', esc(n)]));
  $('#rosterAlerts').innerHTML = alerts.map(([k, h]) => `<div class="alert ${k}">${h}</div>`).join('');

  // 심의사유별 목록: 의안번호 · 심의사유 · 의사소견서
  const noLabel = R.noHead ? '의안번호' : '엑셀 행';
  const noVal = r => R.noHead ? (r.no || '-') : r.row;
  const byCat = {};
  R.rows.forEach(r => { const k = r.cat || '__bad'; (byCat[k] = byCat[k] || []).push(r); });
  const listHtml = (rows, withWhy) => rows.length
    ? `<div class="tbl-wrap tall"><table class="tbl-sm"><thead><tr><th>${noLabel}</th><th>심의사유</th><th>의사소견서</th>${withWhy ? '<th>근거</th>' : ''}</tr></thead><tbody>` +
      rows.map(r => `<tr><td class="num">${esc(noVal(r))}</td><td class="wrap">${esc(r.reason)}</td><td>${esc(r.doc)}</td>${withWhy ? `<td>${esc(r.why)}</td>` : ''}</tr>`).join('') +
      '</tbody></table></div>'
    : '<div class="empty">해당하는 의안이 없습니다.</div>';
  // 건수 옆 막대: 가장 많은 심의사유를 100%로 한 상대 크기(한눈에 비교용)
  const maxN = Math.max(1, R.bad, ...ROSTER_CATS.map(c => (byCat[c] || []).length));
  const catRow = (key, label, i, cls) => {
    const rows = byCat[key] || [], open = S.rosterOpen.has(key) && rows.length > 0;
    return `<tr class="cat ${cls || ''}"><td><button type="button" class="cat-btn" data-key="${esc(key)}" aria-expanded="${open}" aria-controls="rosterList${i}"${rows.length ? ' title="눌러서 의안 목록 보기"' : ' disabled'}>${esc(label)}</button></td>` +
      `<td class="num cnt"><span class="bar" aria-hidden="true"><i style="width:${Math.round(rows.length / maxN * 100)}%"></i></span><span class="count">${rows.length}</span></td></tr>` +
      `<tr class="cat-list" id="rosterList${i}"${open ? '' : ' hidden'}><td colspan="2">${listHtml(rows, key === '__bad')}</td></tr>`;
  };
  $('#rosterBody').innerHTML = ROSTER_CATS.map((c, i) => catRow(c, c, i)).join('') +
    (R.bad ? catRow('__bad', '분류 안 됨 (확인 필요)', ROSTER_CATS.length, 'bad') : '') +
    `<tr class="sum"><td>합계</td><td class="num cnt"><span class="count">${R.total}</span></td></tr>`;

  // 건별 분류 내역 위의 참고 정보(눈에 덜 띄게 접어 둔 곳에 둔다)
  const info = [];
  if(R.multi) info.push(`사유가 여러 개 적힌 건 ${R.multi}건은 먼저 표기된 사유 한 곳에만 세었습니다.`);
  const dv = Object.entries(R.docValues).sort((a, b) => b[1] - a[1]).slice(0, 12);
  info.push('의사소견서 값별 건수: ' + dv.map(([k, n]) => `${k} ${n}`).join(' · '));
  $('#rosterInfo').innerHTML = info.map(n => `<div>${esc(n)}</div>`).join('');

  // 건별 분류 내역(전체)
  $('#rosterOnlyBad').checked = S.rosterOnlyBad;
  const list = S.rosterOnlyBad ? R.rows.filter(r => !r.cat || r.warn) : R.rows;
  const cols = R.noHead ? 6 : 5;
  $('#rosterDetailHead').innerHTML = `<tr><th class="num">엑셀 행</th>${R.noHead ? '<th>의안번호</th>' : ''}<th>심의사유(원문)</th><th>의사소견서</th><th>분류</th><th>근거</th></tr>`;
  $('#rosterDetail').innerHTML = list.map(r => `
    <tr class="${r.cat ? (r.warn ? 'warnrow' : '') : 'bad'}"><td class="num">${r.row}</td>${R.noHead ? `<td>${esc(r.no || '-')}</td>` : ''}<td class="wrap">${esc(r.reason)}</td><td>${esc(r.doc)}</td>
    <td>${r.cat ? esc(r.cat) : '분류 안 됨'}</td><td>${esc(r.why)}${r.warn ? `<div class="warn-text">${esc(r.warn)}</div>` : ''}</td></tr>`).join('') ||
    `<tr><td colspan="${cols}" class="empty">${S.rosterOnlyBad ? '확인이 필요한 건이 없습니다.' : '표시할 건이 없습니다.'}</td></tr>`;
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
  $('#file').addEventListener('change', e => { if(e.target.files[0]) registerFile(e.target.files[0]); e.target.value = ''; });
  const drop = $('#drop');
  ['dragenter','dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if(f) registerFile(f); });
  drop.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); $('#file').click(); } });
  ['dragover','drop'].forEach(t => window.addEventListener(t, e => e.preventDefault()));

  // 파일 변경 창: 배지로 열고, ×·바깥 눌러서·Esc로 닫는다. Tab 키는 창 안에서만 돈다.
  const modal = $('#uploadModal');
  $('#fileBadge').addEventListener('click', openModal);
  $('#modalClose').addEventListener('click', closeModal);
  modal.addEventListener('mousedown', e => { if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });
  modal.addEventListener('keydown', e => {
    if(e.key !== 'Tab') return;
    const f = [$('#modalClose'), $('#drop')], i = f.indexOf(document.activeElement);
    if(e.shiftKey && i <= 0){ e.preventDefault(); f[f.length - 1].focus(); }
    else if(!e.shiftKey && (i < 0 || i === f.length - 1)){ e.preventDefault(); f[0].focus(); }
  });

  $('#rosterOnlyBad').addEventListener('change', e => { S.rosterOnlyBad = e.target.checked; renderRoster(); });
  // 심의사유 줄을 누르면 해당 안건 목록을 펼치고, 다시 누르면 접는다
  $('#rosterBody').addEventListener('click', e => {
    const tr = e.target.closest('tr.cat'); if(!tr) return;
    const b = tr.querySelector('.cat-btn'); if(!b || b.disabled) return;
    const open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(open));
    document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
    if(open) S.rosterOpen.add(b.dataset.key); else S.rosterOpen.delete(b.dataset.key);
  });

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
      save(); tpl.value = S.template; renderMeta(); renderInfo(); renderDocOpts(); renderGroups(); renderChips(); renderOutput();
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

  /* 1번 카드: 회의 정보 */
  const infoChanged = () => { renderInfoPreview(); renderOutput(); };
  $('#infoRegion').addEventListener('input', e => { S.info.region = e.target.value; save(); infoChanged(); });
  $('#infoLevel').addEventListener('click', e => {
    const b = e.target.closest('button[data-level]'); if(!b) return;
    S.info.level = S.info.level === b.dataset.level ? '' : b.dataset.level;   // 선택된 버튼을 다시 누르면 해제
    save(); renderInfo(); renderOutput();
  });
  const round = $('#infoRound');
  const cleanRound = () => {
    const c = round.value.normalize('NFKC').replace(/\D/g, '').slice(0, 2);   // 전각 숫자는 반각으로, 숫자 외는 제거
    if(c !== round.value) round.value = c;
    S.info.round = c;
  };
  round.addEventListener('input', e => { if(e.isComposing) return; cleanRound(); infoChanged(); });
  round.addEventListener('compositionend', () => { cleanRound(); infoChanged(); });
  round.addEventListener('change', () => {   // "05" → "5", "0"/"00" → 빈칸
    const n = parseInt(round.value, 10);
    round.value = S.info.round = n > 0 ? String(n) : '';
    infoChanged();
  });
  bindDateField(infoChanged);
}

/* ---------- 개최일자: 손으로 숫자 8자리(yyyymmdd) 입력 + 달력 선택 ---------- */
function fmtDateDigits(d){   // 숫자만 → 입력한 만큼 yyyy-mm-dd 로 자리를 잡아준다
  return d.length <= 4 ? d : d.length <= 6 ? d.slice(0, 4) + '-' + d.slice(4) : d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6);
}
function isoFromDigits(d){   // 8자리 숫자가 실제로 있는 날짜일 때만 'YYYY-MM-DD', 아니면 ''
  if(d.length !== 8) return '';
  const y = +d.slice(0, 4), m = +d.slice(4, 6), day = +d.slice(6, 8), t = new Date(y, m - 1, day);
  if(y < 1900 || y > 2100 || t.getFullYear() !== y || t.getMonth() !== m - 1 || t.getDate() !== day) return '';
  return fmtDateDigits(d);
}
function digitsFromPasted(text){   // "2026.1.8." "2026-1-8" 처럼 붙여넣은 글에서 8자리를 뽑는다
  const s = text.normalize('NFKC'), m = /^\s*(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D*$/.exec(s);
  return (m ? m[1] + m[2].padStart(2, '0') + m[3].padStart(2, '0') : s.replace(/\D/g, '')).slice(0, 8);
}
function bindDateField(infoChanged){
  const dt = $('#infoDate'), pick = $('#infoDatePick'), hint = $('#infoDateHint');
  const setHint = t => { hint.textContent = t; dt.setAttribute('aria-invalid', String(!!t)); };
  const apply = digits => {   // 상태에 반영하고, 칸에 보여줄 글자를 돌려준다
    S.info.date = isoFromDigits(digits);
    pick.value = S.info.date;
    setHint(digits.length === 8 && !S.info.date ? '존재하지 않는 날짜입니다. 연·월·일을 확인해 주세요.' : '');
    return fmtDateDigits(digits);
  };
  dt.addEventListener('input', e => {
    if(e.isComposing) return;
    const raw = dt.value.normalize('NFKC');
    let digits = raw.replace(/\D/g, '');
    // 구분 기호를 직접 친 경우: "2026-1-" → 2026-01, "2026-10-8-" → 2026-10-08
    if(/\D$/.test(raw) && (digits.length === 5 || digits.length === 7)) digits = digits.slice(0, -1) + '0' + digits.slice(-1);
    digits = digits.slice(0, 8);
    const f = apply(digits);
    if(dt.value !== f){
      const caret = dt.selectionStart, atEnd = caret >= dt.value.length;
      const before = dt.value.slice(0, caret).replace(/\D/g, '').length;
      dt.value = f;
      if(!atEnd){   // 중간을 고치는 중이면 커서를 같은 숫자 뒤에 둔다
        let n = 0, pos = 0;
        while(pos < f.length && n < before){ if(/\d/.test(f[pos])) n++; pos++; }
        dt.setSelectionRange(pos, pos);
      }
    }
    infoChanged();
  });
  dt.addEventListener('paste', e => {
    e.preventDefault();
    dt.value = apply(digitsFromPasted((e.clipboardData || window.clipboardData).getData('text')));
    infoChanged();
  });
  dt.addEventListener('blur', () => {
    if(dt.value && !S.info.date && !hint.textContent) setHint('연·월·일 8자리를 끝까지 입력해 주세요. (예: 20261008)');
  });
  $('#infoCal').addEventListener('click', () => {
    pick.value = S.info.date;
    try{ pick.showPicker(); }catch(err){ pick.focus(); pick.click(); }
  });
  pick.addEventListener('change', () => {
    S.info.date = pick.value;
    dt.value = pick.value;
    setHint('');
    infoChanged();
  });
}

function renderInfo(){
  $('#infoRegion').value = S.info.region;
  $('#infoRound').value = S.info.round;
  $('#infoDate').value = $('#infoDatePick').value = S.info.date;
  $('#infoDateHint').textContent = '';
  $('#infoDate').removeAttribute('aria-invalid');
  document.querySelectorAll('#infoLevel button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === S.info.level)));
  renderInfoPreview();
}
/* 표지 제목이 한 줄에 안 들어가면 그만큼 글자 크기를 줄인다(글자 폭은 크기에 비례하므로 한 번에 맞는다) */
function fitCoverTitle(){
  const t = $('#coverTitle');
  t.style.removeProperty('--t');
  const base = parseFloat(getComputedStyle(t).getPropertyValue('--t'));
  const over = t.scrollWidth / t.clientWidth;
  if(over > 1) t.style.setProperty('--t', Math.max(2.5, base / over * 0.97).toFixed(2));
}

/* 표지 미리보기: 왼쪽 위 "<회의 시나리오>" / "제0차 00구 등급판정위원회" / 빈 한 줄 / 개최일 / 아래 가운데 "00운영센터".
   아직 입력 안 한 부분은 회색 자리표시 */
function renderInfoPreview(){
  const v = infoValues(), region = S.info.region.trim(), level = S.info.level;
  const ph = t => `<span class="ph">${t}</span>`;
  const place = region ? esc(region + level) : ph('00' + (level || '시·군·구'));
  $('#coverTitle').innerHTML = (v.차수 ? `제${v.차수}차` : `제${ph('0')}차`) + ' ' + place + ' 등급판정위원회';
  $('#coverDate').innerHTML = v.개최일자 ? esc(v.개최일자) : ph('0000년 0월 0일');
  $('#coverFoot').innerHTML = (region ? esc(region) : ph('00')) + '운영센터';   // 지역명만(시·군·구 제외)
  fitCoverTitle();
  const notes = [];
  if(region && !level) notes.push('시·군·구를 선택하지 않았습니다.');
  if(level && region.endsWith(level)) notes.push(`지역명 끝에 이미 ‘${esc(level)}’가 있어 ‘${esc(region + level)}’로 들어갑니다.`);
  $('#coverNote').innerHTML = notes.map(n => `<div>${n}</div>`).join('');
}

function renderDocOpts(){
  const fonts = DOCX_FONTS.includes(S.doc.font) ? DOCX_FONTS : DOCX_FONTS.concat(S.doc.font);
  $('#docFont').innerHTML = fonts.map(f => `<option${f === S.doc.font ? ' selected' : ''}>${esc(f)}</option>`).join('');
  $('#docSize').innerHTML = DOCX_SIZES.map(s => `<option${s === S.doc.size ? ' selected' : ''}>${s}</option>`).join('');
  $('#docPageNo').checked = !!S.doc.pageNo;
}
