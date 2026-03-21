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

$newPayload = @{ subject = 'Support UX ticket'; message = 'Hello support team, this is a smoke ticket flow test.' } | ConvertTo-Json
$newRes = Invoke-WebRequest -Method POST -Uri "$base/api/support/contact" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -ContentType 'application/json' -Headers @{ 'x-lang' = 'ar' } -Body $newPayload
Write-Output ("NEW_TICKET_STATUS={0}" -f $newRes.StatusCode)

$listRes = Invoke-WebRequest -Method GET -Uri "$base/api/support/tickets" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -Headers @{ 'x-lang' = 'ar' }
Write-Output ("LIST_STATUS={0}" -f $listRes.StatusCode)

$listJson = ConvertFrom-Json $listRes.Content
$ticketId = $listJson.tickets[0].id
Write-Output ("LATEST_TICKET_ID={0}" -f $ticketId)

$detailsRes = Invoke-WebRequest -Method GET -Uri "$base/api/support/tickets/$ticketId" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -Headers @{ 'x-lang' = 'ar' }
Write-Output ("DETAILS_STATUS={0}" -f $detailsRes.StatusCode)

$replyPayload = @{ message = 'Follow up from smoke test user on the same ticket.' } | ConvertTo-Json
$replyRes = Invoke-WebRequest -Method POST -Uri "$base/api/support/tickets/$ticketId/reply" -WebSession $session -UseBasicParsing -SkipHttpErrorCheck -ContentType 'application/json' -Headers @{ 'x-lang' = 'ar' } -Body $replyPayload
Write-Output ("REPLY_STATUS={0}" -f $replyRes.StatusCode)
Write-Output ("REPLY_BODY={0}" -f $replyRes.Content)
