/* 공통: 유틸, 기본 틀, 상태, 설정 저장 */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GANADA = '가나다라마바사아자차카타파하';
const KEY = 'deungpan-unicorn-v1';

const DEFAULT_TEMPLATE = `{{회의명}} 제{{회차}}회 회의 진행 시나리오

■ 일시: {{일시}}
■ 장소: {{장소}}
■ 진행: {{위원장}}

1. 개회
  ○ 지금부터 {{회의명}} 제{{회차}}회 회의를 개회하겠습니다.

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
  skipNo: 0, skipDup: 0,
  template: DEFAULT_TEMPLATE,
  meta: [{k:'회의명',v:'심의위원회'},{k:'회차',v:''},{k:'일시',v:''},{k:'장소',v:''},{k:'위원장',v:''}],
  fmt: {prefix:'제', suffix:'호', sep:', ', range:true, dedupe:true, fill:true},
  doc: {font:'맑은 고딕', size:10.5, pageNo:true}
};

/* ---------- 설정 저장/복원 ---------- */
function pack(){ return {template:S.template, meta:S.meta, fmt:S.fmt, doc:S.doc}; }
function applySettings(j){
  if(!j || typeof j !== 'object') return;
  if(typeof j.template === 'string') S.template = j.template;
  if(Array.isArray(j.meta)) S.meta = j.meta.filter(m => m && typeof m.k === 'string').map(m => ({k:m.k, v:String(m.v == null ? '' : m.v)}));
  if(j.fmt && typeof j.fmt === 'object') Object.assign(S.fmt, j.fmt);
  if(j.doc && typeof j.doc === 'object') Object.assign(S.doc, j.doc);
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(pack())); }catch(e){} }
function restore(){ try{ applySettings(JSON.parse(localStorage.getItem(KEY) || 'null')); }catch(e){} }
