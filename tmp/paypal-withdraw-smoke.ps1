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

$profile = Invoke-WebRequest -Uri "$base/api/profile" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck
Write-Output ("PROFILE_STATUS={0}" -f $profile.StatusCode)
Write-Output ("PROFILE_BODY={0}" -f $profile.Content)

$withdrawBody = @{ paypalEmail = 'sb-receiver@personal.example.com'; amount = 1 } | ConvertTo-Json
$withdraw = Invoke-WebRequest -Method POST -Uri "$base/api/pay/paypal/withdraw" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -ContentType 'application/json' -Headers @{ 'x-lang' = 'en' } -Body $withdrawBody
Write-Output ("WITHDRAW_STATUS={0}" -f $withdraw.StatusCode)
Write-Output ("WITHDRAW_BODY={0}" -f $withdraw.Content)

$profileAfter = Invoke-WebRequest -Uri "$base/api/profile" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck
Write-Output ("PROFILE_AFTER_STATUS={0}" -f $profileAfter.StatusCode)
Write-Output ("PROFILE_AFTER_BODY={0}" -f $profileAfter.Content)
