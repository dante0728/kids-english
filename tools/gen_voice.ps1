# 批次合成所有單字/例句語音（英文 Zira + 中文 Hanhan）
# 先執行 node tools/export_words.cjs 產生 words.json，再跑本腳本
Add-Type -AssemblyName System.Speech
$root = Split-Path -Parent $PSScriptRoot
$json = Get-Content (Join-Path $PSScriptRoot 'words.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$outDir = Join-Path $root 'assets\voice_wav'
New-Item -ItemType Directory -Force $outDir | Out-Null

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$EN = 'Microsoft Zira Desktop'
$ZH = 'Microsoft Hanhan Desktop'

foreach ($theme in $json) {
  for ($i = 0; $i -lt $theme.words.Count; $i++) {
    $w = $theme.words[$i]

    # 單字檔（唸慢一點）
    $synth.Rate = -2
    $synth.SelectVoice($EN)
    $synth.SetOutputToWaveFile((Join-Path $outDir ($theme.id + '_' + $i + '_w.wav')))
    $synth.Speak($w.en)
    $synth.SetOutputToNull()

    # 例句檔：英文例句 + 停頓 + 中文例句
    $synth.Rate = -1
    $pb = New-Object System.Speech.Synthesis.PromptBuilder
    $pb.StartVoice($EN)
    $pb.AppendText($w.sen)
    $pb.AppendBreak([TimeSpan]::FromMilliseconds(400))
    $pb.EndVoice()
    $pb.StartVoice($ZH)
    $pb.AppendText($w.szh)
    $pb.EndVoice()
    $synth.SetOutputToWaveFile((Join-Path $outDir ($theme.id + '_' + $i + '_s.wav')))
    $synth.Speak($pb)
    $synth.SetOutputToNull()
  }
  Write-Host ("theme done: " + $theme.id)
}

# 讚美與提示語
$synth.Rate = -1
$synth.SelectVoice($EN)
$praises = @('Great job!', 'Wonderful!', 'You did it!')
for ($i = 0; $i -lt $praises.Count; $i++) {
  $synth.SetOutputToWaveFile((Join-Path $outDir ('praise_' + $i + '.wav')))
  $synth.Speak($praises[$i])
  $synth.SetOutputToNull()
}
$synth.SetOutputToWaveFile((Join-Path $outDir 'try_again.wav'))
$synth.Speak('Try again!')
$synth.SetOutputToNull()
$synth.Dispose()
Write-Host 'voice generation done'
