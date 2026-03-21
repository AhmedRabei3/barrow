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
}

$payload = @{ subject = 'اختبار تواصل'; message = 'هذه رسالة اختبار من مودال تواصل معنا'; } | ConvertTo-Json
$res = Invoke-WebRequest -Method POST -Uri "$base/api/support/contact" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -ContentType 'application/json' -Headers @{ 'x-lang' = 'ar' } -Body $payload
Write-Output ("SUPPORT_STATUS={0}" -f $res.StatusCode)
Write-Output ("SUPPORT_BODY={0}" -f $res.Content)
