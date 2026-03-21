$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
$wallet = '00a57f0b5fa458c2715b1bb6b190618a'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$csrfResp = Invoke-WebRequest -Uri "$base/api/auth/csrf" -WebSession $session -UseBasicParsing -TimeoutSec 120
$csrf = (ConvertFrom-Json $csrfResp.Content).csrfToken

$loginBody = "csrfToken=$([uri]::EscapeDataString($csrf))&email=ahmed%40mail.com&password=12345678&callbackUrl=$([uri]::EscapeDataString($base + '/'))"
try {
    Invoke-WebRequest -Method POST -Uri "$base/api/auth/callback/credentials" -WebSession $session -ContentType 'application/x-www-form-urlencoded' -Body $loginBody -MaximumRedirection 0 -UseBasicParsing -TimeoutSec 120 | Out-Null
}
catch {
    # NextAuth redirects with 302 on successful credentials login.
}

$payload = @{ walletCode = $wallet; amount = 1; note = 'You withdrew 1.00 USD from Dalil Safe platform.' } | ConvertTo-Json
$res = Invoke-WebRequest -Method POST -Uri "$base/api/pay/shamcash/withdraw" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -ContentType 'application/json' -Headers @{ 'x-lang' = 'en' } -Body $payload -TimeoutSec 420

"WITHDRAW_STATUS=$($res.StatusCode)"
$res.Content
