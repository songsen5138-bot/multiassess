# 체험판 만들기: index.html에 가짜 자료(tools/sample-data.json)를 넣어 demo.html로 저장
# 체험판은 로그인 없이 열리고, 가짜 자료로 모든 단계(배포용 파일·순위 정하기·집계표)가 미리 채워져 있음
# 쓰는 법: python tools/build_demo.py   →  demo.html
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'demo.html')

with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
    html = f.read()
with open(os.path.join(ROOT, 'tools', 'sample-data.json'), encoding='utf-8') as f:
    data = json.load(f)

demo_js = '<script>window.DEMO_DATA = ' + json.dumps(data, ensure_ascii=False).replace('<', '\\u003c') + ';</script>'
# 글자 인코딩 선언(meta charset) 뒤에 넣음: 맨 앞 1024바이트 안에 있어야 한글이 깨지지 않음
i = html.index('<meta charset="UTF-8">') + len('<meta charset="UTF-8">')
out = html[:i] + '\n  ' + demo_js + html[i:]
out = out.replace('<title>다면평가 편하샘', '<title>[체험판] 다면평가 편하샘', 1)

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(out)
people = sum(len(g['names']) for g in data['groups'])
print(f'{OUT} ({len(out.encode("utf-8")) / 1024:.0f}KB, 평가 대상자 {people}명, 다면평가자 {len(data["evaluators"])}명)')
