/* 공통: 유틸, 기본 틀, 상태, 설정 저장 */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GANADA = '가나다라마바사아자차카타파하';
const KEY = 'deungpan-unicorn-v1';

const DEFAULT_TEMPLATE = `{{위원회명}} 제{{차수}}차 회의 진행 시나리오

■ 개최일자: {{개최일자}}
■ 장소: {{장소}}
■ 진행: {{위원장}}

1. 개회
  ○ 지금부터 {{위원회명}} 제{{차수}}차 회의를 개회하겠습니다.

2. 안건 상정 안내
  ○ 오늘 심의할 안건은 모두 {{총건수}}건이며, 유형별로는 다음과 같습니다.
{{#각유형}}
    - {{유형}}: {{건수}}건 ({{번호목록}})
{{/각유형}}

3. 안건별 심의
{{#각유형}}
{{가나다}}. {{유형}} 안건 ({{건수}}건)
  ○ {{번호목록}}을(를) 상정하겠습니다.
{{#안건}}
    · {{번호}} {{안건명}}
{{/안건}}
{{/각유형}}

4. 폐회
  ○ 이상으로 오늘 예정된 안건 심의를 모두 마치고 회의를 폐회하겠습니다.
`;

const S = {
  buf: null, fileName: '', sheetNames: [], sheet: '',
  rows: [], headerRow: 1, headers: [], data: [],
  map: {no:'', title:'', type:''},
  items: [], groups: [], order: [], labels: {},
  skipNo: 0,
  roster: null, rosterOnlyBad: false, rosterOpen: new Set(),   // 간사용명부 심의사유 분류 결과(roster.js)와 상세표 필터
  template: DEFAULT_TEMPLATE,
  meta: [{k:'장소',v:''},{k:'위원장',v:''}],
  info: {region:'', level:'', round:'', date:''},   // 1번 카드: 지역명, 시/군/구, 차수, 개최일자(YYYY-MM-DD)
  fmt: {prefix:'제', suffix:'호', sep:', ', range:true},
  doc: {font:'맑은 고딕', size:10.5, pageNo:true}
};

/* ---------- 1번 카드(회의 정보) → 틀에서 쓰는 값 ---------- */
const WEEKDAYS = '일월화수목금토';
/* 값이 비어 있는 항목은 아예 넣지 않는다 → 틀에 자리표시가 그대로 남고 경고가 뜬다 */
function infoValues(){
  const i = S.info, v = {};
  const region = i.region.trim();
  if(region){
    v.지역 = region + i.level;
    v.위원회명 = v.지역 + ' 등급판정위원회';
  }
  const n = parseInt(i.round, 10);
  if(n > 0) v.차수 = String(n);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(i.date);
  if(m){
    const y = +m[1], mo = +m[2], d = +m[3], dt = new Date(y, mo - 1, d);
    if(dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d){
      v.개최년 = String(y); v.개최월 = String(mo); v.개최일 = String(d);
      v.개최요일 = WEEKDAYS[dt.getDay()];
      v.개최일자 = `${y}년 ${mo}월 ${d}일`;   // 요일은 {{개최요일}}로 따로 쓴다
    }
  }
  return v;
}

/* ---------- 설정 저장/복원 ---------- */
/* 차수와 개최일자는 회의마다 바뀌므로 저장하지 않는다(지난 회의 날짜가 남아 문서에 찍히는 사고 방지) */
function pack(){ return {template:S.template, meta:S.meta, info:{region:S.info.region, level:S.info.level}, fmt:S.fmt, doc:S.doc}; }
function applySettings(j){
  if(!j || typeof j !== 'object') return;
  if(typeof j.template === 'string') S.template = j.template;
  if(j.info && typeof j.info === 'object'){
    if(typeof j.info.region === 'string') S.info.region = j.info.region;
    if(['시','군','구',''].includes(j.info.level)) S.info.level = j.info.level;
  }
  if(Array.isArray(j.meta)) S.meta = j.meta.filter(m => m && typeof m.k === 'string').map(m => ({k:m.k, v:String(m.v == null ? '' : m.v)}));
  if(j.fmt && typeof j.fmt === 'object'){   // 예전에 저장된 값에 지금은 없는 항목이 섞여 있어도 무시한다
    ['prefix', 'suffix', 'sep'].forEach(k => { if(typeof j.fmt[k] === 'string') S.fmt[k] = j.fmt[k]; });
    if(typeof j.fmt.range === 'boolean') S.fmt.range = j.fmt.range;
  }
  if(j.doc && typeof j.doc === 'object') Object.assign(S.doc, j.doc);
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(pack())); }catch(e){} }
function restore(){ try{ applySettings(JSON.parse(localStorage.getItem(KEY) || 'null')); }catch(e){} }
