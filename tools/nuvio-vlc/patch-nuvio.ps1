$ErrorActionPreference = 'Stop'

$policy = @'
package com.nuvio.app.core.build

private val isWindowsDesktop = System.getProperty("os.name")
    ?.startsWith("Windows", ignoreCase = true)
    ?: false

actual object AppFeaturePolicy {
    actual val pluginsEnabled: Boolean = true
    actual val downloadsEnabled: Boolean = true
    actual val notificationsEnabled: Boolean = false
    actual val supportersContributorsPageEnabled: Boolean = true
    actual val accountDeletionEnabled: Boolean = false
    actual val personalMediaAddonCopyEnabled: Boolean = false
    actual val p2pEnabled: Boolean = true
    actual val externalPlayerSupported: Boolean = true
    actual val trailerPlaybackMode: TrailerPlaybackMode =
        if (isWindowsDesktop) TrailerPlaybackMode.EXTERNAL else TrailerPlaybackMode.IN_APP
    actual val heroTrailerPlaybackSupported: Boolean = !isWindowsDesktop
    actual val inAppUpdaterEnabled: Boolean = true
    actual val imdbRatingLogoEnabled: Boolean = true
    actual val mediaPlaybackForegroundServiceEnabled: Boolean = false
}
'@
Set-Content -Path 'nuvio/composeApp/src/desktopMain/kotlin/com/nuvio/app/core/build/AppFeaturePolicy.desktop.kt' -Value $policy -Encoding UTF8

$external = @'
package com.nuvio.app.features.player

import java.awt.Desktop
import java.io.File
import java.net.URI

private data class DesktopExternalPlayerIntent(
    val request: ExternalPlayerPlaybackRequest,
    val playerId: String?,
)

internal actual object ExternalPlayerPlatform {
    private const val systemPlayerId = "system"
    private const val vlcPlayerId = "vlc"

    actual fun defaultPlayerId(): String? =
        if (findVlcExecutable() != null) vlcPlayerId else systemPlayerId

    actual fun availablePlayers(): List<ExternalPlayerApp> = buildList {
        if (findVlcExecutable() != null) add(ExternalPlayerApp(vlcPlayerId, "VLC media player"))
        add(ExternalPlayerApp(systemPlayerId, "System default"))
    }

    actual fun open(
        request: ExternalPlayerPlaybackRequest,
        playerId: String?,
    ): ExternalPlayerOpenResult {
        if (playerId == vlcPlayerId) {
            return if (openVlc(request)) ExternalPlayerOpenResult.Opened
            else ExternalPlayerOpenResult.NoPlayerAvailable
        }
        return if (openUri(request.sourceUrl)) ExternalPlayerOpenResult.Opened else ExternalPlayerOpenResult.Failed
    }

    actual fun buildIntent(
        request: ExternalPlayerPlaybackRequest,
        playerId: String?,
    ): ExternalPlayerIntentResult =
        ExternalPlayerIntentResult.Success(DesktopExternalPlayerIntent(request, playerId))

    internal fun launch(intent: Any): Boolean {
        val desktopIntent = intent as? DesktopExternalPlayerIntent ?: return false
        return open(desktopIntent.request, desktopIntent.playerId) == ExternalPlayerOpenResult.Opened
    }

    private fun openVlc(request: ExternalPlayerPlaybackRequest): Boolean {
        val executable = findVlcExecutable() ?: return false
        val args = mutableListOf(executable.absolutePath)
        args += "--one-instance"
        args += "--play-and-exit"
        if (request.resumePositionMs > 0L) args += "--start-time=${request.resumePositionMs / 1000.0}"
        request.requestHeaders["User-Agent"]?.takeIf { it.isNotBlank() }?.let { args += ":http-user-agent=$it" }
        request.requestHeaders["Referer"]?.takeIf { it.isNotBlank() }?.let { args += ":http-referrer=$it" }
        args += request.sourceUrl
        return runCatching {
            ProcessBuilder(args).redirectErrorStream(true).start()
        }.isSuccess
    }

    private fun findVlcExecutable(): File? {
        val candidates = buildList {
            System.getenv("ProgramFiles")?.let { add(File(it, "VideoLAN/VLC/vlc.exe")) }
            System.getenv("ProgramFiles(x86)")?.let { add(File(it, "VideoLAN/VLC/vlc.exe")) }
            System.getenv("LOCALAPPDATA")?.let { add(File(it, "Programs/VideoLAN/VLC/vlc.exe")) }
            add(File("C:/Program Files/VideoLAN/VLC/vlc.exe"))
            add(File("C:/Program Files (x86)/VideoLAN/VLC/vlc.exe"))
        }
        return candidates.firstOrNull { it.isFile }
    }

    private fun openUri(rawUri: String): Boolean {
        val uri = runCatching { URI(rawUri) }.getOrNull() ?: return false
        val desktop = runCatching { Desktop.getDesktop() }.getOrNull()
        if (desktop != null && Desktop.isDesktopSupported()) {
            val opened = runCatching {
                if (uri.scheme.equals("file", ignoreCase = true)) desktop.open(File(uri)) else desktop.browse(uri)
            }.isSuccess
            if (opened) return true
        }
        val osName = System.getProperty("os.name").orEmpty().lowercase()
        val command = when {
            osName.contains("mac") -> listOf("open", rawUri)
            osName.contains("win") -> listOf("rundll32", "url.dll,FileProtocolHandler", rawUri)
            else -> listOf("xdg-open", rawUri)
        }
        return runCatching { ProcessBuilder(command).start() }.isSuccess
    }
}
'@
Set-Content -Path 'nuvio/composeApp/src/desktopMain/kotlin/com/nuvio/app/features/player/ExternalPlayerPlatform.desktop.kt' -Value $external -Encoding UTF8

# The official desktop network check requires the Nuvio Supabase endpoint to be reachable.
# This test build intentionally has no private build secrets, so that check would force
# ServersUnreachable even when public Internet and addon URLs are healthy. For the VLC
# test build only, treat public Internet reachability as Online and let individual HTTP
# requests report their own errors.
$networkPath = 'nuvio/composeApp/src/commonMain/kotlin/com/nuvio/app/core/network/NetworkStatusRepository.kt'
$network = Get-Content -Raw -Path $networkPath
$old = @'
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
$new = @'
        return NetworkCondition.Online
'@
if (-not $network.Contains($old)) { throw 'NetworkStatusRepository patch target not found' }
$network = $network.Replace($old, $new)
Set-Content -Path $networkPath -Value $network -Encoding UTF8

Write-Host 'Patched Nuvio Windows: VLC external player + public Internet network status.'
