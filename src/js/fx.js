/* 마우스 별가루 이펙트 */
/* ---------- 마우스 별가루 ---------- */
const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)');
const SPARK_COLORS = ['#f0a9c6','#e58db1','#cdb9ea','#b79be0','#f7c6dc','#ffffff'];
const SPARK_GLYPHS = ['♥','✦','★','✧','♥','✦'];
const SPARK_MAX = 60, SPARK_STEP = 14;
const FX_KEY = 'deungpan-unicorn-fx';
let sparkLive = 0, lastX = null, lastY = null, fxOn = true;
try{ fxOn = localStorage.getItem(FX_KEY) !== 'off'; }catch(e){}

function renderFx(){
  const b = $('#fxToggle');
  if(REDUCE.matches){
    b.disabled = true; b.setAttribute('aria-pressed', 'false');
    b.textContent = '✦ 이펙트 꺼짐 (시스템 설정)';
    b.title = '윈도우의 애니메이션 효과 줄이기 설정이 켜져 있어 이펙트를 쓰지 않습니다';
    return;
  }
  b.disabled = false;
  b.setAttribute('aria-pressed', String(fxOn));
  b.textContent = fxOn ? '✦ 이펙트 켜짐' : '✧ 이펙트 꺼짐';
}
function setFx(on){
  fxOn = on;
  try{ localStorage.setItem(FX_KEY, on ? 'on' : 'off'); }catch(e){}
  if(!on) document.querySelectorAll('.spark').forEach(el => el.getAnimations().forEach(a => a.cancel()));
  lastX = lastY = null;
  renderFx();
}

function sparkle(x, y){
  if(sparkLive >= SPARK_MAX) return;
  sparkLive++;
  const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
  const el = document.createElement('span');
  el.className = 'spark';
  el.textContent = SPARK_GLYPHS[Math.floor(Math.random() * SPARK_GLYPHS.length)];
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.fontSize = (9 + Math.random() * 10) + 'px';
  el.style.color = color;
  el.style.textShadow = '0 0 6px ' + color;
  document.body.appendChild(el);
  const ox = (Math.random() - 0.5) * 14, oy = (Math.random() - 0.5) * 14;
  const dx = (Math.random() - 0.5) * 30, fall = 16 + Math.random() * 28;
  const spin = (Math.random() - 0.5) * 180;
  // t: 진행도, s: 크기, o: 투명도 — 깜빡이며 반짝이도록 투명도를 오르내린다
  const frame = (t, s, o) => ({
    transform: `translate(calc(-50% + ${ox + dx * t}px), calc(-50% + ${oy + fall * t * t}px)) scale(${s}) rotate(${spin * t}deg)`,
    opacity: o, offset: t
  });
  const anim = el.animate([
    frame(0, 0.2, 0), frame(0.12, 1.2, 1), frame(0.28, 0.7, 0.35), frame(0.42, 1.1, 1),
    frame(0.58, 0.75, 0.4), frame(0.72, 1, 0.9), frame(1, 0.1, 0)
  ], {duration: 650 + Math.random() * 450, easing: 'ease-out'});
  // 완료뿐 아니라 취소(탭 전환 등)로 끝나도 정리해야 개수 제한에 걸리지 않는다
  const done = () => { el.remove(); sparkLive = Math.max(0, sparkLive - 1); };
  anim.finished.then(done, done);
}
document.addEventListener('pointermove', e => {
  if(!fxOn || REDUCE.matches || e.pointerType === 'touch') return;
  if(lastX === null){ lastX = e.clientX; lastY = e.clientY; return; }
  const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
  if(dist < SPARK_STEP) return;
  const n = dist > 60 ? 3 : dist > 30 ? 2 : 1;
  for(let i = 0; i < n; i++){
    const t = (i + 1) / n;
    sparkle(lastX + (e.clientX - lastX) * t, lastY + (e.clientY - lastY) * t);
  }
  lastX = e.clientX; lastY = e.clientY;
});
document.documentElement.addEventListener('pointerleave', () => { lastX = lastY = null; });
$('#fxToggle').addEventListener('click', () => setFx(!fxOn));
REDUCE.addEventListener('change', renderFx);
renderFx();
