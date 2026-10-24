// 가짜 정량평가 자기평가서 한글 파일 5개 만들기 (앱의 fillQuantXml 그대로)
// 사용: node tools/build_fake_quant.cjs   → 테스트 자료/가짜 정량평가 자기평가서/
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), outDir = process.argv[2] || path.join(root, '테스트 자료', '가짜 정량평가 자기평가서');
const JSZip = require(path.join(root, 'assets/vendor/jszip.min.js'));
const lines = fs.readFileSync(path.join(root, 'index.html'), 'utf8').split('\n');
const a = lines.findIndex(l => l.startsWith('const COUNT_PT'));
let b = lines.findIndex((l, i) => i > a && l.startsWith('function fillQuantXml'));
while (!lines[b].startsWith('}')) b++;
const grabFn = n => { const i = lines.findIndex(l => l.startsWith('function ' + n)); let j = i; while (!lines[j].startsWith('}')) j++; return lines.slice(i, j + 1).join('\n'); };
const src = lines.slice(a, b + 1).join('\n') + '\n' + grabFn('mergeSummary');
const { fillQuantXml, quantScore } = new Function(src + '\nreturn { fillQuantXml, quantScore };')();
const evaluators = ['을지문덕', '계백', '김유신', '원효', '장보고', '왕건', '강감찬', '의천'];
const people = [
  ['단군왕검', { hours: '23', open1: true, open2: true, stu: '60', par: '45', diffType: 'grade', grade: '1', train: '75', dutyType: 'none' }],
  ['동명성왕', { hours: '20', open1: true, stu: '35', par: '22', diffType: 'grade', grade: '3', train: '45', dutyType: 'main', dutyMain: '교무', dutyText: '교무' }],
  ['온조왕', { hours: '19', open2: true, stu: '52', par: '51', diffType: 'etc', etcText: '교담', train: '30', dutyType: 'other', dutyOther: '5학년', dutyText: '5학년' }],
  ['박혁거세', { hours: '23', stu: '18', par: '12', diffType: 'grade', grade: '5', train: '15', dutyType: 'none' }],
  ['김부식', { hours: '23', open1: true, stu: '41', par: '33', diffType: 'grade', grade: '6', train: '90', dutyType: 'none' }],
];
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const tpl = fs.readFileSync(path.join(root, 'assets/template/quant-template.hwpx'));
  for (const [name, q] of people) {
    const zip = await JSZip.loadAsync(tpl);
    const p = 'Contents/section0.xml';
    zip.file(p, fillQuantXml(await zip.file(p).async('string'), q, name, evaluators));
    zip.file('mimetype', 'application/hwp+zip', { compression: 'STORE' });
    const buf = await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/hwp+zip', compression: 'DEFLATE' });
    fs.writeFileSync(path.join(outDir, `2026학년도 빛여울초 정량평가 자기평가서 ${name}.hwpx`), buf);
    const s = quantScore(q);
    console.log(name, s.sums.join('/'), '총점', s.total, s.missing.length ? '빠짐 ' + s.missing : '');
  }
})().catch(e => { console.error(e); process.exit(1); });
