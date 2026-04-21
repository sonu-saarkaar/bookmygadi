$content = Get-Content -Path frontend/src/pages/app/HomePage.tsx -Raw
$s1 = $content.IndexOf('{/* Pricing screen: full map with bottom sheet */}')
$s2 = $content.IndexOf('{bookingState === "searching" && (')
if ($s1 -gt 0 -and $s2 -gt $s1) {
  $newContent = $content.Substring(0, $s1) + $content.Substring($s2)
  Set-Content -Path frontend/src/pages/app/HomePage.tsx -Value $newContent
  Write-Host "Removed successfully"
} else {
  Write-Host "Indices: s1=$s1 s2=$s2"
}
