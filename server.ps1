param([int]$Port = 8080)

$Prefix = "http://*:$Port/"
$LocalPrefix = "http://localhost:$Port/"

$Listener = New-Object System.Net.HttpListener
try {
    $Listener.Prefixes.Add($Prefix)
    $Listener.Start()
} catch {
    $Listener = New-Object System.Net.HttpListener
    $Listener.Prefixes.Add($LocalPrefix)
    $Listener.Start()
}

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".webp" = "image/webp"
    ".ico"  = "image/x-icon"
}

Write-Output "HTTP Server listening on port $Port..."

while ($Listener.IsListening) {
    try {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        $UrlPath = $Request.Url.LocalPath
        if ($UrlPath -eq "/" -or [string]::IsNullOrEmpty($UrlPath)) {
            $UrlPath = "/index.html"
        }

        $CleanPath = $UrlPath.TrimStart("/").Replace("/", "\")
        $FilePath = Join-Path $PSScriptRoot $CleanPath

        if (Test-Path $FilePath -PathType Leaf) {
            $Ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
            $ContentType = $MimeTypes[$Ext]
            if (-not $ContentType) { $ContentType = "application/octet-stream" }

            $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
            $Response.ContentType = $ContentType
            $Response.ContentLength64 = $Bytes.Length
            $Response.AddHeader("Access-Control-Allow-Origin", "*")
            $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        } else {
            $Response.StatusCode = 404
            $NotFoundMsg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $Response.ContentType = "text/plain; charset=utf-8"
            $Response.ContentLength64 = $NotFoundMsg.Length
            $Response.OutputStream.Write($NotFoundMsg, 0, $NotFoundMsg.Length)
        }
        $Response.OutputStream.Close()
    } catch {
        # ignore client disconnect errors
    }
}
