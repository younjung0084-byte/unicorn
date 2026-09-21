/* Word(.docx) 생성: 외부 라이브러리 없이 XML 파일들을 압축 없는 zip 으로 묶는다.
   시나리오 글을 줄 단위로 읽어 모양을 정한다.
     첫 줄               → 제목(가운데, 굵게)
     ■ 항목: 값          → 맨 위 정보표(연속된 줄은 한 표로 묶음)
     1. 제목             → 큰 소제목
     가. 제목            → 작은 소제목
     ○ / - / · / ※ 문장 → 글머리 문단(들여쓰기 2칸마다 한 단계, 줄이 길어도 글머리 밑으로 내려오지 않음)
     [쪽나눔]            → 쪽 나누기
     빈 줄               → 무시(간격은 서식이 처리) */

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOCX_FONTS = ['맑은 고딕', '바탕', '돋움', '굴림'];
const DOCX_SIZES = [10, 10.5, 11, 12];
const PAGE = {w: 11906, h: 16838, top: 1418, bottom: 1418, left: 1134, right: 1134};   // A4, 단위: 1/20 pt
const TEXT_W = PAGE.w - PAGE.left - PAGE.right;
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

const xe = s => String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  .replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hp = pt => Math.round(pt * 2);   // pt → 반 포인트

/* ----- 문단 조각 ----- */
function dRun(text, o){
  o = o || {};
  let pr = '';
  if(o.b) pr += '<w:b/><w:bCs/>';
  if(o.color) pr += `<w:color w:val="${o.color}"/>`;
  if(o.sz) pr += `<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>`;
  return `<w:r>${pr ? '<w:rPr>' + pr + '</w:rPr>' : ''}<w:t xml:space="preserve">${xe(text)}</w:t></w:r>`;
}
const dTab = () => '<w:r><w:tab/></w:r>';
function dPara(inner, o){
  o = o || {};
  let pr = '';
  if(o.style) pr += `<w:pStyle w:val="${o.style}"/>`;
  if(o.keepNext) pr += '<w:keepNext/>';
  if(o.spacing) pr += `<w:spacing ${Object.entries(o.spacing).map(([k, v]) => `w:${k}="${v}"`).join(' ')}/>`;
  if(o.ind) pr += `<w:ind ${Object.entries(o.ind).map(([k, v]) => `w:${k}="${v}"`).join(' ')}/>`;
  if(o.jc) pr += `<w:jc w:val="${o.jc}"/>`;
  return `<w:p>${pr ? '<w:pPr>' + pr + '</w:pPr>' : ''}${inner}</w:p>`;
}

function dMetaTable(rows){
  const w1 = 1700, w2 = TEXT_W - w1;
  const bd = n => `<w:${n} w:val="single" w:sz="4" w:space="0" w:color="C9BFE0"/>`;
  const cell = (w, inner, fill) =>
    `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}<w:vAlign w:val="center"/></w:tcPr>` +
    dPara(inner, {spacing: {after: 0}}) + '</w:tc>';
  return `<w:tbl><w:tblPr><w:tblW w:w="${TEXT_W}" w:type="dxa"/>` +
    `<w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(bd).join('')}</w:tblBorders>` +
    `<w:tblLayout w:type="fixed"/>` +
    `<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>` +
    `</w:tblPr><w:tblGrid><w:gridCol w:w="${w1}"/><w:gridCol w:w="${w2}"/></w:tblGrid>` +
    rows.map(r => `<w:tr>${cell(w1, dRun(r.k, {b: true}), 'F3EEFA')}${cell(w2, r.v ? dRun(r.v) : '', '')}</w:tr>`).join('') +
    '</w:tbl>';
}

/* ----- 줄 분류 ----- */
const RE_META = /^■\s*([^:：]+?)\s*[:：]\s*(.*)$/;
const RE_H1 = /^\d+\.\s+.+$/;
const RE_H2 = /^[가나다라마바사아자차카타파하]\.\s+.+$/;
const RE_BULLET = /^([○●◦·•\-–※▶▷□◇◆ㅇ])\s+(.+)$/;

function classify(raw){
  const line = raw.replace(/\s+$/, '');
  const m = line.match(/^(\s*)(.*)$/);
  const spaces = m[1].replace(/\t/g, '    ').length;
  const body = m[2];
  if(!body) return {t: 'blank'};
  if(body === '[쪽나눔]') return {t: 'break'};
  let x;
  if((x = body.match(RE_META))) return {t: 'meta', k: x[1], v: x[2]};
  if(spaces === 0 && RE_H1.test(body)) return {t: 'h1', text: body};
  if(spaces === 0 && RE_H2.test(body)) return {t: 'h2', text: body};
  if((x = body.match(RE_BULLET))) return {t: 'bullet', mark: x[1], text: x[2], lvl: Math.max(0, Math.floor(spaces / 2) - 1)};
  return {t: 'plain', text: body, spaces};
}

function docBody(text, o){
  const out = [];
  let metaRows = [], first = true;
  const flushMeta = () => {
    if(!metaRows.length) return;
    out.push(dMetaTable(metaRows));
    out.push(dPara('', {spacing: {after: 120}}));
    metaRows = [];
  };
  text.replace(/\r\n/g, '\n').split('\n').forEach(raw => {
    const c = classify(raw);
    if(c.t === 'meta'){ metaRows.push(c); first = false; return; }
    flushMeta();
    if(c.t === 'blank') return;
    if(c.t === 'break'){ out.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>'); return; }
    if(first && c.t === 'plain' && c.spaces === 0){ out.push(dPara(dRun(c.text), {style: 'Title'})); first = false; return; }
    first = false;
    if(c.t === 'h1') out.push(dPara(dRun(c.text), {style: 'Heading1'}));
    else if(c.t === 'h2') out.push(dPara(dRun(c.text), {style: 'Heading2'}));
    else if(c.t === 'bullet'){
      const start = 120 + c.lvl * 300, hang = 300;
      out.push(dPara(dRun(c.mark) + dTab() + dRun(c.text), {ind: {left: start + hang, hanging: hang}}));
    }else{
      out.push(dPara(dRun(c.text), c.spaces ? {ind: {left: Math.floor(c.spaces / 2) * 300}} : null));
    }
  });
  flushMeta();
  const sect = (o.pageNo ? '<w:footerReference w:type="default" r:id="rId2"/>' : '') +
    `<w:pgSz w:w="${PAGE.w}" w:h="${PAGE.h}"/>` +
    `<w:pgMar w:top="${PAGE.top}" w:right="${PAGE.right}" w:bottom="${PAGE.bottom}" w:left="${PAGE.left}" w:header="851" w:footer="851" w:gutter="0"/>`;
  return `${XML_HEAD}<w:document ${NS_W}><w:body>${out.join('')}<w:sectPr>${sect}</w:sectPr></w:body></w:document>`;
}

/* ----- 스타일 ----- */
function docStyles(o){
  const f = xe(o.font), base = hp(o.size);
  const fonts = `<w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:eastAsia="${f}" w:cs="${f}"/>`;
  const sz = n => `<w:sz w:val="${n}"/><w:szCs w:val="${n}"/>`;
  const para = (id, name, ppr, rpr) =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>` +
    `<w:pPr>${ppr}</w:pPr>${rpr ? '<w:rPr>' + rpr + '</w:rPr>' : ''}</w:style>`;
  return `${XML_HEAD}<w:styles ${NS_W}>` +
    `<w:docDefaults><w:rPrDefault><w:rPr>${fonts}${sz(base)}<w:lang w:val="ko-KR" w:eastAsia="ko-KR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>` +
    `<w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="336" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>` +
    `<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/>` +
      `<w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>` +
    para('Title', 'Title', '<w:keepNext/><w:spacing w:before="0" w:after="280"/><w:jc w:val="center"/>', '<w:b/><w:bCs/>' + sz(hp(o.size + 6))) +
    para('Heading1', 'heading 1',
      '<w:keepNext/><w:keepLines/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="B9A5DC"/></w:pBdr><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/>',
      '<w:b/><w:bCs/>' + sz(hp(o.size + 2))) +
    para('Heading2', 'heading 2', '<w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/>',
      '<w:b/><w:bCs/>' + sz(hp(o.size + 1))) +
    `</w:styles>`;
}

function docFooter(o){
  const r = t => `<w:r><w:rPr>${'<w:color w:val="666666"/>'}<w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>${t}</w:r>`;
  const fld = t => `<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:fldChar w:fldCharType="${t}"/></w:r>`;
  return `${XML_HEAD}<w:ftr ${NS_W}><w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr>` +
    r('<w:t xml:space="preserve">- </w:t>') + fld('begin') +
    `<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>` +
    fld('separate') + r('<w:t>1</w:t>') + fld('end') + r('<w:t xml:space="preserve"> -</w:t>') + '</w:p></w:ftr>';
}

/* ----- zip (압축 없음) ----- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for(let n = 0; n < 256; n++){
    let c = n;
    for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes){
  let c = 0xFFFFFFFF;
  for(let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function zipStore(files){
  const enc = new TextEncoder();
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const parts = [], central = [];
  let offset = 0;
  files.forEach(f => {
    const name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 0, true); lh.setUint16(10, time, true); lh.setUint16(12, date, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + data.length;
  });
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), {type: DOCX_MIME});
}

/* ----- 진입점: 시나리오 글 → .docx Blob ----- */
function buildDocx(text, opts){
  const o = {font: '맑은 고딕', size: 10.5, pageNo: true};
  Object.assign(o, opts || {});
  if(!DOCX_FONTS.includes(o.font)) o.font = '맑은 고딕';
  if(!(o.size >= 8 && o.size <= 20)) o.size = 10.5;
  const title = (text.split('\n').find(l => l.trim()) || '회의 시나리오').trim();
  const CT = 'application/vnd.openxmlformats-officedocument.wordprocessingml';
  const files = [
    {name: '[Content_Types].xml', text: XML_HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      `<Override PartName="/word/document.xml" ContentType="${CT}.document.main+xml"/>` +
      `<Override PartName="/word/styles.xml" ContentType="${CT}.styles+xml"/>` +
      (o.pageNo ? `<Override PartName="/word/footer1.xml" ContentType="${CT}.footer+xml"/>` : '') +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'},
    {name: '_rels/.rels', text: XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'},
    {name: 'word/document.xml', text: docBody(text, o)},
    {name: 'word/styles.xml', text: docStyles(o)},
    {name: 'word/_rels/document.xml.rels', text: XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      (o.pageNo ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' : '') +
      '</Relationships>'}
  ];
  if(o.pageNo) files.push({name: 'word/footer1.xml', text: docFooter(o)});
  files.push({name: 'docProps/core.xml', text: XML_HEAD +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${xe(title)}</dc:title><dc:creator>등판간사 업무비서</dc:creator>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>`});
  return zipStore(files);
}
