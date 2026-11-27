param(
    [Parameter(Mandatory=$true)][string]$InputPath,
    [Parameter(Mandatory=$true)][string]$OutputPngPath
)

$ErrorActionPreference = 'Stop'
$ext = [System.IO.Path]::GetExtension($InputPath).ToLowerInvariant()
$pdfPath = $InputPath
$tempPdf = $null

if ($ext -in @('.docx', '.doc', '.rtf')) {
    $tempPdf = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), ([guid]::NewGuid().ToString() + '.pdf'))
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    try {
        $doc = $word.Documents.Open($InputPath, $false, $true)
        $doc.ExportAsFixedFormat($tempPdf, 17)
        $doc.Close($false)
    } finally {
        $word.Quit()
    }
    $pdfPath = $tempPdf
}

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $null = [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
    $null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType=WindowsRuntime]
    $null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime]
    $null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType=WindowsRuntime]

    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]

    function AwaitOp($WinRtTask, $ResultType) {
        $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
        $netTask = $asTask.Invoke($null, @($WinRtTask))
        $netTask.Wait(-1) | Out-Null
        $netTask.Result
    }

    $file = AwaitOp ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdfPath)) ([Windows.Storage.StorageFile])
    $pdf = AwaitOp ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
    $page = $pdf.GetPage(0)
    $stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
    $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
    $opts.DestinationWidth = 1000

    $asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'
    })[0]
    $renderTask = $asTaskAction.Invoke($null, @($page.RenderToStreamAsync($stream, $opts)))
    $renderTask.Wait(-1) | Out-Null

    $stream.Seek(0)
    $dr = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
    $null = AwaitOp ($dr.LoadAsync([uint32]$stream.Size)) ([uint32])
    $bytes = New-Object byte[] ([int]$stream.Size)
    $dr.ReadBytes($bytes)
    [System.IO.File]::WriteAllBytes($OutputPngPath, $bytes)

    $dr.Dispose()
    $page.Dispose()
    $stream.Dispose()
} finally {
    if ($tempPdf -and (Test-Path $tempPdf)) {
        Remove-Item -Path $tempPdf -Force -ErrorAction SilentlyContinue
    }
}
