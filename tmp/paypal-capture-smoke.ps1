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

$fatoraBody = @{ amount = 5; type = 'ACTIVATION'; method = 'PAYPAL' } | ConvertTo-Json
$fatoraRes = Invoke-WebRequest -Method POST -Uri "$base/api/pay/fatora" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -ContentType 'application/json' -Headers @{ 'x-lang' = 'en' } -Body $fatoraBody
Write-Output ("CREATE_STATUS={0}" -f $fatoraRes.StatusCode)
Write-Output ("CREATE_BODY={0}" -f $fatoraRes.Content)

if ($fatoraRes.StatusCode -ne 200) {
    exit 1
}

$orderId = (ConvertFrom-Json $fatoraRes.Content).orderId
$captureBody = @{ orderId = $orderId } | ConvertTo-Json
$captureRes = Invoke-WebRequest -Method POST -Uri "$base/api/pay/paypal/capture" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -ContentType 'application/json' -Headers @{ 'x-lang' = 'en' } -Body $captureBody
Write-Output ("CAPTURE_STATUS={0}" -f $captureRes.StatusCode)
Write-Output ("CAPTURE_BODY={0}" -f $captureRes.Content)
