# 관리자용 파일 만들기: index.html과 부품(라이브러리·아이콘·정량평가 한글 양식)을 HTML 파일 하나로 묶음
# 인터넷 없이 더블클릭으로 열어 모든 기능(배포용 파일 만들기, 엑셀 내려받기 등)을 쓸 수 있음
# 쓰는 법: python tools/build_local.py   →  관리자용 파일/다면평가 편하샘.html
import base64, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, '관리자용 파일')
OUT = os.path.join(OUT_DIR, '다면평가 편하샘.html')

def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()

def read_b64(p):
    with open(os.path.join(ROOT, p), 'rb') as f:
        return base64.b64encode(f.read()).decode()

html = read('index.html')
xlsx = read('assets/vendor/xlsx.full.min.js')
exceljs = read('assets/vendor/exceljs.min.js')
jszip = read('assets/vendor/jszip.min.js')
fa_raw = read('assets/vendor/fontawesome/css/all.min.css')
font = read_b64('assets/vendor/fontawesome/webfonts/fa-solid-900.woff2')
quant = read_b64('assets/template/quant-template.hwpx')
self_tpl = read_b64('assets/template/self-template.hwpx')
moum = read_b64('assets/template/moum-template.hwpx')

# 아이콘 글꼴을 CSS 안에 넣음 (쓰지 않는 글꼴은 빈 값)
fa = fa_raw.replace('url(../webfonts/fa-solid-900.woff2)', f'url(data:font/woff2;base64,{font})')
fa = re.sub(r'url\(\.\./webfonts/[^)]+\)', 'url(data:,)', fa)

# 배포용 파일을 만들 때 쓸 원본 부품 (앱의 buildDistHtml이 이것을 씀)
bundle = {'html': html, 'exceljs': exceljs, 'jszip': jszip, 'fa': fa_raw, 'font': font, 'quant': quant, 'self': self_tpl, 'moum': moum}
bundle_js = 'window.APP_BUNDLE = ' + json.dumps(bundle, ensure_ascii=False).replace('<', '\\u003c') + ';'

inline = lambda js: '<script>' + re.sub(r'</script', r'<\\/script', js, flags=re.I) + '</script>'
swaps = [
    # 글자 인코딩 선언(meta charset) 뒤에 넣음: 맨 앞 1024바이트 안에 있어야 한글이 깨지지 않음
    ('<meta charset="UTF-8">', '<meta charset="UTF-8">\n  <script>' + bundle_js + '</script>'),
    ('<link rel="stylesheet" href="assets/vendor/fontawesome/css/all.min.css">', '<style>' + fa + '</style>'),
    ('<script src="assets/vendor/xlsx.full.min.js"></script>', inline(xlsx)),
    ('<script src="assets/vendor/exceljs.min.js"></script>', inline(exceljs)),
    ('<script src="assets/vendor/jszip.min.js"></script>', inline(jszip)),
]
out = html
for a, b in swaps:
    i = out.index(a)  # 파일 맨 앞 <head> 안의 첫 번째 것만 바꿈
    out = out[:i] + b + out[i + len(a):]

os.makedirs(OUT_DIR, exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(out)
print(f'{OUT} ({len(out.encode("utf-8")) / 1024 / 1024:.1f}MB)')
