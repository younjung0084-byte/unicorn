/* 간사용명부 시트: 심의사유별 안건 분류
   - 안건 1건 = 명부의 데이터 행 1줄
   - 의사소견서가 '각하'인 건은 심의사유 맨 끝의 '소견서제출기한연장' 문구 유무로 연장심의/각하심의를 가른다
   - 심의사유에 '소견서제출기한연장'이 있어도 의사소견서가 '마감후제출'이면 그 문구는 무시하고 나머지 사유로 센다
   - 나머지 사유로 세는 방법:
       · '급여내용'이 있으면 앞이든 뒤든 급여내용변경심의
       · 등급판정에 시설계속이 붙으면 시설계속심의, 특기사항이 붙으면 특기사항심의, 아무것도 안 붙으면 등급판정심의
       · 그 밖에는 칸 안에서 가장 먼저 나오는 사유(노인성질환·급성기질환·등급판정 계열) 기준
       · 65세미만노인성질환은 노인성질환, 등급판정(5등급대상자A-일반)처럼 등급판정 뒤 괄호 안은 설명이라 무시 */

const ROSTER_SHEET = '간사용명부';
const EXT_WORD = '소견서제출기한연장';
/* 분류 이름. 화면에는 ROSTER_CATS 순서대로 보인다 */
const CAT_OLD = '노인성질환심의', CAT_ACUTE = '급성기질환심의', CAT_BENEFIT = '급여내용변경심의';
const CAT_FACILITY = '시설계속심의', CAT_SPECIAL = '특기사항심의', CAT_GRADE = '등급판정심의';
const CAT_EXT = '소견서제출기한 연장심의';
const CAT_REJECT = '각하심의';
const ROSTER_CATS = [CAT_OLD, CAT_ACUTE, CAT_BENEFIT, CAT_FACILITY, CAT_SPECIAL, CAT_GRADE, CAT_EXT, CAT_REJECT];
/* 심의사유 칸에서 찾는 글자(공백 없이). 명부에는 줄여 적힌 경우가 있어서(예: 급성기질환심의 → 급성기) 앞부분만으로 찾는다.
   '노인성질환', '급성기질환심의'처럼 길게 적힌 것도 앞부분이 같으므로 함께 잡힌다. */
const KEY_OLD = '노인성', KEY_ACUTE = '급성기', KEY_BENEFIT = '급여내용', KEY_GRADE = '등급판정', KEY_FACILITY = '시설계속', KEY_SPECIAL = '특기사항';
/* 위 글자들. 이걸 지우고도 글자가 남으면 모르는 줄임말·메모가 섞인 것이므로 사람이 확인하도록 표시한다 */
const KNOWN_WORDS = /급여내용변경|급여내용|65세미만|노인성질환|급성기질환|노인성|급성기|등급판정|시설계속|특기사항|소견서제출기한연장|심의|및|또는/g;
/* '등급판정' 바로 뒤의 괄호 안(예: 등급판정(5등급대상자A-일반))은 대상자 설명이라 분류에도, 확인 필요 판단에도 쓰지 않는다 */
const GRADE_PAREN = /(등급판정)[(（][^)）]*[)）]/g;
const PUNCT = /[,，;；\/、·ㆍ.\-+&()\[\]]/g;

const nz = s => String(s == null ? '' : s).replace(/\s+/g, '');   // 모든 공백·줄바꿈 제거

function findRosterSheet(names){
  const want = nz(ROSTER_SHEET);
  return names.find(n => nz(n) === want) || names.find(n => nz(n).includes(want)) || '';
}

/* 한 건 분류. 분류할 수 없으면 cat 을 빈 글자로 돌려주고 why 에 이유를 적는다 */
function classifyRoster(reason, doc){
  const r = nz(reason), d = nz(doc);
  const hasExt = r.includes(EXT_WORD);
  const endsExt = hasExt && /소견서제출기한연장(심의)?$/.test(r.replace(/[,，;；/·ㆍ.)\]+&]+$/, ''));
  const reject = d === '각하';
  const late = d.includes('마감후제출');

  if(reject){
    if(!hasExt) return {cat: CAT_REJECT, why: "의사소견서 '각하' · 심의사유에 소견서제출기한연장 없음"};
    if(endsExt) return {cat: CAT_EXT, why: "의사소견서 '각하' · 심의사유 맨 끝에 소견서제출기한연장"};
    return {cat: '', why: "의사소견서는 '각하'인데 소견서제출기한연장이 심의사유 맨 끝에 있지 않음"};
  }
  if(hasExt && !late) return {cat: '', why: "심의사유에 소견서제출기한연장이 있는데 의사소견서가 '각하'도 '마감후제출'도 아님"};

  // 심의사유 칸에서 사유 항목을 찾는다. 등급판정은 시설계속/특기사항이 함께 적혀 있으면 그 이름의 한 항목이 된다.
  // (65세미만노인성질환처럼 앞에 붙은 65세미만은 노인성질환의 설명일 뿐이라 그대로 노인성질환으로 본다)
  const rr = r.replace(GRADE_PAREN, '$1');
  const at = k => rr.indexOf(k);
  const pOld = at(KEY_OLD), pAcute = at(KEY_ACUTE), pBenefit = at(KEY_BENEFIT), pGrade = at(KEY_GRADE);
  const subs = [{name: CAT_FACILITY, p: at(KEY_FACILITY)}, {name: CAT_SPECIAL, p: at(KEY_SPECIAL)}]
    .filter(x => x.p >= 0).sort((a, b) => a.p - b.p);   // 둘 다 있으면 먼저 표기된 쪽
  const items = [];
  if(pOld >= 0) items.push({name: CAT_OLD, p: pOld});
  if(pAcute >= 0) items.push({name: CAT_ACUTE, p: pAcute});
  if(pBenefit >= 0) items.push({name: CAT_BENEFIT, p: pBenefit});
  if(pGrade >= 0) items.push(subs.length ? {name: subs[0].name, p: Math.min(pGrade, subs[0].p)} : {name: CAT_GRADE, p: pGrade});
  const orphan = pGrade < 0 && subs.length > 0;   // 시설계속/특기사항만 있고 등급판정이 같이 적혀 있지 않음
  let first = null;
  items.forEach(x => { if(first === null || x.p < first.p) first = x; });
  const cat = pBenefit >= 0 ? CAT_BENEFIT : (first ? first.name : '');   // 급여내용은 위치와 상관없이 우선

  if(!cat){
    if(orphan) return {cat: '', why: `‘${subs[0].name.replace('심의', '')}’만 적혀 있고 등급판정이 함께 적혀 있지 않음`};
    return {cat: '', why: r ? '심의사유에서 분류할 항목을 찾지 못함' : '심의사유가 비어 있음'};
  }
  const parts = [];
  if(hasExt && late) parts.push("'마감후제출'이라 소견서제출기한연장은 무시");
  if(pBenefit >= 0 && items.length > 1) parts.push("‘급여내용’이 있어 위치와 상관없이 급여내용변경심의");
  else parts.push(items.length > 1 ? `사유 ${items.length}개 중 먼저 표기된 것` : '사유 1개');
  if(pGrade >= 0 && subs.length) parts.push(`등급판정+${subs[0].name.replace('심의', '')}` + (subs.length > 1 ? ' (시설계속·특기사항 중 먼저 표기된 것)' : ''));
  // 사람이 한 번 더 볼 건: 알아본 글자를 빼고도 글자가 남음(모르는 줄임말일 수 있음), 시설계속/특기사항이 등급판정 없이 적힘. 분류는 그대로 한다.
  const warns = [];
  const left = rr.replace(KNOWN_WORDS, '').replace(PUNCT, '');
  if(left) warns.push(`인식하지 못한 글자 ‘${left.slice(0, 20)}’ 포함 · 줄임말이면 알려 주세요`);
  if(orphan) warns.push(`‘${subs[0].name.replace('심의', '')}’이 등급판정 없이 적혀 있음`);
  return {cat, multi: items.length > 1, why: parts.join(' · '), warn: warns.join(' / ')};
}

/* 업로드한 파일에서 간사용명부 시트를 읽어 분류한다. 결과는 S.roster */
function buildRoster(){
  const R = S.roster = {sheet: '', error: '', headerRow: 0, reasonHead: '', docHead: '', noHead: '', total: 0, idCount: 0, idDistinct: 0, counts: {}, bad: 0, multi: 0, warn: 0, docValues: {}, rows: []};
  S.rosterOpen = new Set();   // 펼쳐 둔 심의사유 목록은 새 파일을 올리면 모두 접는다
  if(!S.buf) return;
  const name = findRosterSheet(S.sheetNames);
  if(!name){
    R.error = `'${ROSTER_SHEET}' 시트를 찾지 못했습니다. (이 파일의 시트: ${S.sheetNames.join(', ')})`;
    return;
  }
  R.sheet = name;
  const rows = sheetRows(name);

  // 머리글 행 찾기: '심의사유' 라고 적힌 칸이 있는 첫 행 (정확히 일치하는 칸을 먼저, 없으면 글자가 들어간 칸)
  let h = -1, rc = -1, dc = -1, nc = -1;
  const col = (cells, word, exact) => { const e = cells.indexOf(word); return e >= 0 || exact ? e : cells.findIndex(c => c.includes(word)); };
  search:
  for(const exact of [true, false]){
    for(let i = 0; i < Math.min(rows.length, 40); i++){
      const cells = rows[i].map(nz);
      const a = col(cells, '심의사유', exact);
      if(a >= 0){
        h = i; rc = a; dc = col(cells, '의사소견서', false);
        nc = ['의안번호', '안건번호'].reduce((f, w) => f >= 0 ? f : col(cells, w, false), -1);   // 의안번호 열(없으면 안건번호)
        break search;
      }
    }
  }
  if(h < 0){ R.error = `'${name}' 시트 위쪽 40행 안에서 머리글 '심의사유'를 찾지 못했습니다.`; return; }
  if(dc < 0){ R.error = `'${name}' 시트의 ${h + 1}행에서 머리글 '의사소견서'를 찾지 못했습니다.`; return; }
  R.headerRow = h + 1; R.reasonHead = rows[h][rc]; R.docHead = rows[h][dc];
  R.noHead = nc >= 0 ? rows[h][nc] : '';

  ROSTER_CATS.forEach(c => { R.counts[c] = 0; });
  const idSet = new Set();
  for(let i = h + 1; i < rows.length; i++){
    const row = rows[i];
    if(!row.some(Boolean)) continue;   // 완전히 빈 줄은 건너뜀
    const reason = row[rc] || '', doc = row[dc] || '';
    const c = classifyRoster(reason, doc);
    if(nc >= 0 && row[nc]){ R.idCount++; idSet.add(row[nc]); }
    R.rows.push({row: i + 1, no: nc >= 0 ? row[nc] || '' : '', reason, doc, cat: c.cat, why: c.why, multi: !!c.multi, warn: c.warn || ''});
    if(c.cat) R.counts[c.cat]++; else R.bad++;
    if(c.multi) R.multi++;
    if(c.warn) R.warn++;
    const dv = doc || '(비어 있음)';
    R.docValues[dv] = (R.docValues[dv] || 0) + 1;
  }
  R.total = R.rows.length;
  R.idDistinct = idSet.size;
  // 한 줄은 정확히 한 곳에만 세므로 분류별 합(분류 안 됨 포함)은 항상 전체 건수와 같아야 한다. 어긋나면 숫자를 보여주지 않는다.
  const sum = ROSTER_CATS.reduce((n, c) => n + R.counts[c], 0) + R.bad;
  if(sum !== R.total) R.error = `내부 계산 오류: 분류별 합(${sum})이 전체 줄 수(${R.total})와 다릅니다. 이 파일을 개발자에게 알려 주세요.`;
}

/* 요약 문장: "노인성질환심의 00건, 급성기질환심의 00건, … / 총 0개 안건, 000개 의안입니다."
   안건 수 = 건수가 1건 이상인 심의사유의 종류 수, 의안 수 = 의안번호의 개수(의안번호 열이 없으면 명부 줄 수).
   회의 시나리오에도 쓸 문장이라 화면과 시나리오가 같은 값을 쓰도록 여기서 한 번만 만든다. */
function rosterSummary(R){
  const parts = ROSTER_CATS.filter(c => R.counts[c] > 0).map(c => ({name: c, n: R.counts[c]}));
  const total = R.noHead ? R.idCount : R.total;
  const notes = [];
  if(!R.noHead) notes.push('의안번호 열을 찾지 못해 명부의 줄 수를 의안 수로 보여드립니다.');
  else{
    if(R.idCount !== R.total) notes.push(`의안번호가 비어 있는 ${R.total - R.idCount}줄은 의안 수에 넣지 않았습니다.`);
    if(R.idDistinct < R.idCount) notes.push(`같은 의안번호가 여러 줄에 있습니다. (의안번호 종류 ${R.idDistinct}개)`);
  }
  return {
    parts, types: parts.length, total, notes,
    line1: parts.map(p => `${p.name} ${p.n}건`).join(', '),
    line2: `총 ${parts.length}개 안건, ${total}개 의안입니다.`
  };
}
