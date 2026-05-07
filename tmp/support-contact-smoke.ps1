$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$base = if ($env:SMOKE_BASE_URL) { $env:SMOKE_BASE_URL } else { 'http://localhost:3000' }
$email = if ($env:SMOKE_E2E_EMAIL) { $env:SMOKE_E2E_EMAIL } else { 'e2e.user@example.com' }
$password = if ($env:SMOKE_E2E_PASSWORD) { $env:SMOKE_E2E_PASSWORD } else { 'Test@12345' }
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$csrfResp = Invoke-WebRequest -Uri "$base/api/auth/csrf" -WebSession $session -UseBasicParsing
$csrf = (ConvertFrom-Json $csrfResp.Content).csrfToken

$body = "csrfToken=$([uri]::EscapeDataString($csrf))&email=$([uri]::EscapeDataString($email))&password=$([uri]::EscapeDataString($password))&callbackUrl=$([uri]::EscapeDataString($base + '/'))"
try {
    Invoke-WebRequest -Method POST -Uri "$base/api/auth/callback/credentials" -WebSession $session -ContentType 'application/x-www-form-urlencoded' -Body $body -MaximumRedirection 0 -UseBasicParsing | Out-Null
}
catch {
}

$payload = @{ subject = 'اختبار تواصل'; message = 'هذه رسالة اختبار من مودال تواصل معنا'; } | ConvertTo-Json
$res = Invoke-WebRequest -Method POST -Uri "$base/api/support/contact" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -ContentType 'application/json' -Headers @{ 'x-lang' = 'ar' } -Body $payload
Write-Output ("SUPPORT_STATUS={0}" -f $res.StatusCode)
Write-Output ("SUPPORT_BODY={0}" -f $res.Content)
