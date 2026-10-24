// 시험용(가짜 자료) 배포 파일 만들기 — 앱의 buildDistHtml·sealFor와 같은 방식
// 사용: node tools/build_test_dist.mjs            → 테스트 자료/ 의 가짜 정성평가·제출자료 배포 파일 2개
//       node tools/build_test_dist.mjs <출력> <기한> <qual|docs>
// 이름: tools/sample-data.json (가짜), 접근자: 아이디 '시험', 비밀번호 '1234'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv.length <= 2) {
  // 인자 없이: 두 파일 모두 (자기 자신을 두 번 부름)
  for (const [k, n] of [['qual', '가짜 정성평가 배포용 파일'], ['docs', '가짜 제출자료 배포용 파일']]) {
    execFileSync(process.execPath, [fileURLToPath(import.meta.url), path.join(ROOT, '테스트 자료', `${n} (2026.11.18까지).html`), '2026-11-18', k], { stdio: 'inherit' });
  }
  process.exit(0);
}
const OUT = path.resolve(process.argv[2]);
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const data = JSON.parse(read('tools/sample-data.json'));
const te = new TextEncoder();
const b64 = buf => Buffer.from(buf).toString('base64');
const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
async function nameKeys(name) {
  const base = await crypto.subtle.importKey('raw', te.encode(name.replace(/\s+/g, '')), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Buffer.from(salt, 'base64'), iterations: 600000, hash: 'SHA-256' }, base, 512));
  const key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt']);
  return { key, id: [...bits.slice(32, 44)].map(b => b.toString(16).padStart(2, '0')).join('') };
}
const KIND = process.argv[4] || 'qual';
const QUANT = KIND === 'quant' || KIND === 'self' || KIND === 'docs';
const cfg = { groups: data.groups, items: [{name:'태도',w:10},{name:'학습지도',w:40},{name:'생활지도',w:30},{name:'전문성',w:5},{name:'담당업무',w:15}],
  bands: [{hi:99.5,lo:95.1},{hi:94.5,lo:90.1},{hi:89.5,lo:85.1}], firstFull: true };
const boxes = {};
for (const ev of (QUANT ? [...new Set(data.groups.flatMap(g => g.names))] : data.evaluators)) {
  const { key, id } = await nameKeys(ev);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(QUANT ? { name: ev, evaluators: data.evaluators, pre: ev === '계백' ? (KIND === 'docs' ? { quant: { diffType: 'grade', grade: '3', dutyType: 'none' }, self: { position: '초등교사', cls: '3학년 1반', subj: '3학년 전 과목', homeroom: '담임', head: '해당 없음', duty: '학교 홍보' } } : KIND === 'self' ? { position: '교사', cls: '3학년 1반', homeroom: '담임', head: '해당 없음', duty: '학교 홍보' } : { diffType: 'grade', grade: '3', dutyType: 'none' }) : null } : { name: ev, cfg })));
  boxes[id] = { iv: b64(iv), ct: b64(ct) };
}
// 시험용 접근자: 아이디 '시험', 비밀번호 '1234'
const people = QUANT ? [...new Set(data.groups.flatMap(g => g.names))] : data.evaluators;
const preOf = ev => ev === '계백' ? (KIND === 'docs' ? { quant: { diffType: 'grade', grade: '3', dutyType: 'none' }, self: { position: '초등교사', cls: '3학년 1반', subj: '3학년 전 과목', homeroom: '담임', head: '해당 없음', duty: '학교 홍보' } } : null) : null;
const vSalt = b64(crypto.getRandomValues(new Uint8Array(16)));
const vBase = await crypto.subtle.importKey('raw', te.encode('시험|1234'), 'PBKDF2', false, ['deriveBits']);
const vKey = await crypto.subtle.importKey('raw', await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Buffer.from(vSalt, 'base64'), iterations: 600000, hash: 'SHA-256' }, vBase, 256), 'AES-GCM', false, ['encrypt']);
const vIv = crypto.getRandomValues(new Uint8Array(12));
const vPayload = QUANT ? { names: people, evaluators: data.evaluators, pre: Object.fromEntries(people.map(n => [n, preOf(n)])) } : { names: data.evaluators, cfg, evaluators: data.evaluators };
const viewers = { '시험': { salt: vSalt, iv: b64(vIv), ct: b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: vIv }, vKey, te.encode(JSON.stringify(vPayload)))) } };
const until = process.argv[3] || '2026-11-18';
const dist = { kind: KIND, id: 'test' + Date.now().toString(36), year: data.year, school: data.school, level: '초등학교', until, made: '2026-10-19', salt, boxes, viewers };
let html = read('index.html');
let fa = read('assets/vendor/fontawesome/css/all.min.css');
const font = fs.readFileSync(path.join(ROOT, 'assets/vendor/fontawesome/webfonts/fa-solid-900.woff2')).toString('base64');
fa = fa.replace(/url\(\.\.\/webfonts\/fa-solid-900\.woff2\)/g, `url(data:font/woff2;base64,${font})`).replace(/url\(\.\.\/webfonts\/[^)]+\)/g, 'url(data:,)');
const inline = js => '<script>' + js.replace(/<\/script/gi, '<\\/script') + '</script>';
const t64 = n => fs.readFileSync(path.join(ROOT, 'assets/template/' + n + '-template.hwpx')).toString('base64');
const tpl = (KIND === 'quant' || KIND === 'docs' ? 'window.QUANT_TEMPLATE = "' + t64('quant') + '";' : '') + (KIND === 'self' || KIND === 'docs' ? 'window.SELF_TEMPLATE = "' + t64('self') + '";' : '');
const swaps = [
  ['<meta charset="UTF-8">', '<meta charset="UTF-8">\n  <script>window.DIST = ' + JSON.stringify(dist).split('<').join('\\u003c') + ';' + tpl + '</script>'],
  ['<link rel="stylesheet" href="assets/vendor/fontawesome/css/all.min.css">', '<style>' + fa + '</style>'],
  ['<script src="assets/vendor/xlsx.full.min.js"></script>', ''],
  ['<script src="assets/vendor/exceljs.min.js"></script>', QUANT ? '' : inline(read('assets/vendor/exceljs.min.js'))],
  ['<script src="assets/vendor/jszip.min.js"></script>', QUANT ? inline(read('assets/vendor/jszip.min.js')) : ''],
];
for (const [a, b] of swaps) { const i = html.indexOf(a); html = html.slice(0, i) + b + html.slice(i + a.length); }
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`[${KIND}] ${path.basename(OUT)}: ${Object.keys(boxes).length}명`);
