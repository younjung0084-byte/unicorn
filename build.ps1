# src\ 아래의 조각들을 합쳐 단일 파일 "등판간사_업무비서.html" 을 만든다.
#   src\index.src.html : 화면 뼈대 (자리표시: /*STYLE*/ /*XLSX_LIB*/ /*APP_JS*/)
#   src\style.css      : 스타일
#   src\xlsx.full.min.js : 엑셀 라이브러리 (SheetJS)
#   src\js\*.js        : 앱 코드. 아래 순서대로 이어 붙여 하나의 함수 안에 들어간다.
# 소스를 고친 뒤 이 스크립트를 다시 실행하면 된다.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$utf8 = New-Object System.Text.UTF8Encoding($false)
$read = { param($p) [IO.File]::ReadAllText("$root\src\$p", $utf8) }

$order = 'core', 'parse', 'roster', 'template', 'docx', 'ui', 'fx', 'main'
$js = ($order | ForEach-Object { & $read "js\$_.js" }) -join "`n"

$html = & $read 'index.src.html'
$html = $html.Replace('/*STYLE*/', (& $read 'style.css'))
$html = $html.Replace('/*XLSX_LIB*/', (& $read 'xlsx.full.min.js'))
$html = $html.Replace('/*APP_JS*/', $js)

[IO.File]::WriteAllText("$root\등판간사_업무비서.html", $html, $utf8)
"완료: {0:N0} KB" -f ((Get-Item "$root\등판간사_업무비서.html").Length / 1KB)
