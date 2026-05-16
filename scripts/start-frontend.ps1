param(
    [int]$Port = 5800,
    [string]$HostAddress = "127.0.0.1",
    [string]$Root = (Join-Path $PSScriptRoot "..\frontend")
)

$ErrorActionPreference = "Stop"

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$script:RootFull = [System.IO.Path]::GetFullPath($resolvedRoot).TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
)
$script:RootPrefix = $script:RootFull + [System.IO.Path]::DirectorySeparatorChar

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".webp" = "image/webp"
    ".woff" = "font/woff"
    ".woff2" = "font/woff2"
}

function Get-StaticFilePath {
    param([string]$Target)

    if ([string]::IsNullOrWhiteSpace($Target) -or $Target -eq "/") {
        $Target = "/index.html"
    }

    $pathOnly = ($Target -split "\?")[0]
    try {
        $decoded = [System.Uri]::UnescapeDataString($pathOnly)
    } catch {
        $decoded = $pathOnly
    }

    $relativePath = ($decoded -replace "/", [System.IO.Path]::DirectorySeparatorChar).TrimStart([char[]]@("\", "/"))
    $combined = [System.IO.Path]::GetFullPath((Join-Path $script:RootFull $relativePath))

    if ($combined -ne $script:RootFull -and -not $combined.StartsWith($script:RootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $null
    }

    if ([System.IO.Directory]::Exists($combined)) {
        return Join-Path $combined "index.html"
    }

    return $combined
}

function Write-HttpResponse {
    param(
        [System.Net.Sockets.TcpClient]$Client,
        [int]$Status,
        [string]$Reason,
        [string]$Body,
        [string]$ContentType = "text/plain; charset=utf-8"
    )

    $stream = $Client.GetStream()
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
    $header = "HTTP/1.1 $Status $Reason`r`nContent-Type: $ContentType`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`nCache-Control: no-cache`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    $stream.Write($bodyBytes, 0, $bodyBytes.Length)
}

function Write-StaticFile {
    param(
        [System.Net.Sockets.TcpClient]$Client,
        [string]$FilePath,
        [string]$Method
    )

    $stream = $Client.GetStream()
    $extension = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
    $contentType = $mimeTypes[$extension]
    if (-not $contentType) {
        $contentType = "application/octet-stream"
    }

    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nCache-Control: no-cache`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)

    if ($Method -ne "HEAD") {
        $stream.Write($bytes, 0, $bytes.Length)
    }
}

$ipAddress = [System.Net.IPAddress]::Parse($HostAddress)
$listener = [System.Net.Sockets.TcpListener]::new($ipAddress, $Port)

try {
    $listener.Start()
} catch {
    Write-Host "Port $Port cannot be used. Stop the process using it, then run this script again." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Tip: check with 'netstat -ano | findstr :$Port'." -ForegroundColor Yellow
    exit 1
}

Write-Host "Serving frontend from: $script:RootFull" -ForegroundColor Green
Write-Host "Open: http://$HostAddress`:$Port/index.html" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 8192, $true)
            $requestLine = $reader.ReadLine()

            while ($true) {
                $headerLine = $reader.ReadLine()
                if ($null -eq $headerLine -or $headerLine -eq "") {
                    break
                }
            }

            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                continue
            }

            $parts = $requestLine.Split(" ")
            if ($parts.Count -lt 2) {
                Write-HttpResponse -Client $client -Status 400 -Reason "Bad Request" -Body "Bad Request"
                continue
            }

            $method = $parts[0].ToUpperInvariant()
            $target = $parts[1]

            if ($method -ne "GET" -and $method -ne "HEAD") {
                Write-HttpResponse -Client $client -Status 405 -Reason "Method Not Allowed" -Body "Method Not Allowed"
                continue
            }

            $filePath = Get-StaticFilePath -Target $target
            if (-not $filePath) {
                Write-HttpResponse -Client $client -Status 403 -Reason "Forbidden" -Body "Forbidden"
                continue
            }

            if (-not [System.IO.File]::Exists($filePath)) {
                Write-HttpResponse -Client $client -Status 404 -Reason "Not Found" -Body "Not Found"
                continue
            }

            Write-StaticFile -Client $client -FilePath $filePath -Method $method
        } catch {
            try {
                Write-HttpResponse -Client $client -Status 500 -Reason "Internal Server Error" -Body "Internal Server Error"
            } catch {
            }
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
