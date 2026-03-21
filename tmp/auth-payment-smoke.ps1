$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$base = 'http://localhost:3000'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$csrfResp = Invoke-WebRequest -Uri "$base/api/auth/csrf" -WebSession $session -UseBasicParsing
$csrf = (ConvertFrom-Json $csrfResp.Content).csrfToken

$body = "csrfToken=$([uri]::EscapeDataString($csrf))&email=$([uri]::EscapeDataString('e2e.user@example.com'))&password=$([uri]::EscapeDataString('Test@12345'))&callbackUrl=$([uri]::EscapeDataString($base + '/'))"

try {
  Invoke-WebRequest -Method POST -Uri "$base/api/auth/callback/credentials" -WebSession $session -ContentType 'application/x-www-form-urlencoded' -Body $body -MaximumRedirection 0 -UseBasicParsing | Out-Null
}
catch {
  # 302 is expected with redirect flow
}

Write-Output 'COOKIES:'
$session.Cookies.GetCookies($base) | ForEach-Object { Write-Output $_.Name }

$profileResp = Invoke-WebRequest -Uri "$base/api/profile" -WebSession $session -UseBasicParsing
Write-Output ("PROFILE_STATUS={0}" -f $profileResp.StatusCode)
Write-Output ("PROFILE_SNIPPET={0}" -f $profileResp.Content.Substring(0, [Math]::Min(120, $profileResp.Content.Length)))

$withdrawEnBody = @{ paypalEmail = 'bad-email'; amount = 10 } | ConvertTo-Json
$withdrawEn = Invoke-WebRequest -Method POST -Uri "$base/api/pay/paypal/withdraw" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -ContentType 'application/json' -Headers @{ 'x-lang' = 'en' } -Body $withdrawEnBody
Write-Output ("WITHDRAW_EN_STATUS={0}" -f $withdrawEn.StatusCode)
Write-Output ("WITHDRAW_EN_BODY={0}" -f $withdrawEn.Content)

$withdrawArBody = @{ paypalEmail = 'bad-email'; amount = 10 } | ConvertTo-Json
$withdrawAr = Invoke-WebRequest -Method POST -Uri "$base/api/pay/paypal/withdraw" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -ContentType 'application/json' -Headers @{ 'x-lang' = 'ar' } -Body $withdrawArBody
Write-Output ("WITHDRAW_AR_STATUS={0}" -f $withdrawAr.StatusCode)
Write-Output ("WITHDRAW_AR_BODY={0}" -f $withdrawAr.Content)

$fatoraBody = @{ amount = 5; type = 'ACTIVATION'; method = 'PAYPAL' } | ConvertTo-Json
$fatoraEn = Invoke-WebRequest -Method POST -Uri "$base/api/pay/fatora" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -ContentType 'application/json' -Headers @{ 'x-lang' = 'en' } -Body $fatoraBody
Write-Output ("FATORA_EN_STATUS={0}" -f $fatoraEn.StatusCode)
Write-Output ("FATORA_EN_BODY={0}" -f $fatoraEn.Content)
