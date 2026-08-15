$ErrorActionPreference = 'Stop'

$streamsPath = 'nuvio/composeApp/src/commonMain/kotlin/com/nuvio/app/features/streams/StreamsScreen.kt'
$streams = Get-Content -Path $streamsPath -Raw

$old = @'
                onStreamSelected = { stream, positionMs, progressFraction ->
                    onStreamSelected(stream, positionMs, progressFraction)
                },
'@

$new = @'
                onStreamSelected = { stream, positionMs, progressFraction ->
                    if (stream.isYanHh3dStream()) {
                        onStreamActionOpen(stream, true, positionMs, progressFraction)
                    } else {
                        onStreamSelected(stream, positionMs, progressFraction)
                    }
                },
'@

$count = ([regex]::Matches($streams, [regex]::Escape($old))).Count
if ($count -lt 2) {
    throw "Expected at least 2 stream-selection wrappers, found $count"
}
$streams = $streams.Replace($old, $new)

$helper = @'

private fun StreamItem.isYanHh3dStream(): Boolean {
    val identity = listOfNotNull(
        addonId,
        addonName,
        sourceName,
        name,
        title,
        description,
    ).joinToString(" ").lowercase()

    return "yanhh3d" in identity ||
        "yan3d" in identity ||
        "yan hh3d" in identity
}
'@

if ($streams -notmatch 'private fun StreamItem\.isYanHh3dStream\(') {
    $streams += $helper
}
Set-Content -Path $streamsPath -Value $streams -Encoding UTF8

# The test build uses placeholder Supabase credentials only to satisfy compile-time
# configuration. Do not classify the whole app as offline because that placeholder
# endpoint is unreachable; addon/catalog networking should depend on public Internet.
$networkPath = 'nuvio/composeApp/src/commonMain/kotlin/com/nuvio/app/core/network/NetworkStatusRepository.kt'
$network = Get-Content -Path $networkPath -Raw
$oldNetwork = @'
        val supabaseReachable = SupabaseEndpointConfig.restEndpointUrls().any { url ->
            probeReachable(
                url = url,
                headers = mapOf("apikey" to SupabaseConfig.ANON_KEY),
            )
        }
        if (!supabaseReachable) {
            return NetworkCondition.ServersUnreachable
        }

        return NetworkCondition.Online
'@
$newNetwork = @'
        // VLC test build: public Internet reachability is sufficient for addon traffic.
        // Supabase credentials in this unsigned test package are placeholders.
        return NetworkCondition.Online
'@
if (-not $network.Contains($oldNetwork)) {
    throw 'Could not locate Supabase network probe block'
}
$network = $network.Replace($oldNetwork, $newNetwork)
Set-Content -Path $networkPath -Value $network -Encoding UTF8

Write-Host 'Patched YanHH3D single-click -> external VLC and desktop network probe.'
