$ErrorActionPreference = 'Stop'

$addonPath = 'nuvio/composeApp/src/commonMain/kotlin/com/nuvio/app/features/addons/AddonRepository.kt'
$addon = Get-Content -Path $addonPath -Raw

$old = @'
        val storedUrls = dedupeManifestUrls(AddonStorage.loadInstalledAddonUrls(currentProfileId))
'@

$new = @'
        val bundledFullAddonUrl = "https://web-phim-zwsx.onrender.com/full/manifest.json"
        val existingUrls = AddonStorage.loadInstalledAddonUrls(currentProfileId)
            .filterNot { url ->
                val normalized = url.trim().trimEnd('/').lowercase()
                normalized == "https://web-phim-zwsx.onrender.com/manifest.json" ||
                    normalized == "https://web-phim-zwsx.onrender.com/hh3d/manifest.json" ||
                    normalized == "https://web-phim-zwsx.onrender.com/yanhh3d/manifest.json" ||
                    normalized == "https://web-phim-zwsx.onrender.com/full/manifest.json"
            }
        val storedUrls = dedupeManifestUrls(listOf(bundledFullAddonUrl) + existingUrls)
        AddonStorage.saveInstalledAddonUrls(currentProfileId, storedUrls)
'@

if (-not $addon.Contains($old)) {
    throw 'Could not locate AddonRepository storedUrls initialization'
}
$addon = $addon.Replace($old, $new)
Set-Content -Path $addonPath -Value $addon -Encoding UTF8

Write-Host 'Patched Nuvio to preinstall one unified Web Phim Full manifest.'
