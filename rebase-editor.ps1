$todoFile = $args[0]
$content = Get-Content $todoFile -Raw

# Replace each pick with reword to edit commit messages
$content = $content -replace '^pick a0b6467', "reword a0b6467"
$content = $content -replace '^pick 0d9ef6a', "reword 0d9ef6a"
$content = $content -replace '^pick f3f5642', "reword f3f5642"
$content = $content -replace '^pick ec9b662', "reword ec9b662"
$content = $content -replace '^pick d6a6c68', "reword d6a6c68"
$content = $content -replace '^pick 47fb480', "reword 47fb480"
$content = $content -replace '^pick 2b20357', "reword 2b20357"

Set-Content $todoFile $content -NoNewline
