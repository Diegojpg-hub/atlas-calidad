[CmdletBinding()]
param(
    [switch]$Activar,
    [switch]$UnaLectura,
    [string]$DirectorioSalida = (Join-Path $PSScriptRoot '..\reportes')
)

$ErrorActionPreference = 'Stop'

if ($Activar) {
    if (Test-Path Function:\docker) {
        throw 'Ya existe una funcion docker en esta terminal. No se reemplazo.'
    }

    $monitorScriptPath = $PSCommandPath
    $nativeDockerPath = (Get-Command docker.exe -CommandType Application -ErrorAction Stop).Source
    $outputDirectory = $DirectorioSalida
    $function:global:docker = {
        if ($args.Count -gt 0 -and $args[0] -eq 'stats') {
            if ($args.Count -ne 1) {
                throw 'Para registrar las mediciones, usa docker stats sin argumentos adicionales.'
            }
            & $monitorScriptPath -DirectorioSalida $outputDirectory
        } else {
            & $nativeDockerPath @args
        }
    }.GetNewClosure()

    Write-Host 'Activado solo en esta terminal. Escribe docker stats para mostrar y registrar las mismas lecturas.'
    Write-Host 'Detenlo con Ctrl+C. Para desactivar la integracion: Remove-Item Function:\docker'
    return
}

$dockerPath = (Get-Command docker.exe -CommandType Application -ErrorAction Stop).Source
$directory = New-Item -ItemType Directory -Path $DirectorioSalida -Force
$runName = 'docker-stats-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff')
$csvPath = Join-Path $directory.FullName ($runName + '.csv')
$summaryPath = Join-Path $directory.FullName ($runName + '-maximos.txt')
$culture = [Globalization.CultureInfo]::InvariantCulture
$state = @{
    Count = 0
    MaxCpu = -1.0
    MaxMemoryBytes = -1.0
    MaxMemoryText = ''
    CpuTime = ''
    MemoryTime = ''
}
$units = @{
    B = 1.0; kB = 1000.0; MB = 1000000.0; GB = 1000000000.0; TB = 1000000000000.0
    KiB = 1024.0; MiB = 1048576.0; GiB = 1073741824.0; TiB = 1099511627776.0
}
$dockerArguments = @('stats', '--format', '{{json .}}')
if ($UnaLectura) {
    $dockerArguments += '--no-stream'
}

Write-Host "Lecturas: $csvPath"
Write-Host "Maximos del backend: $summaryPath"
Write-Host 'Una sola salida de Docker alimenta la pantalla y los archivos. Ctrl+C para terminar.'
Write-Host ('{0,-25} {1,9} {2,-25} {3,8} {4,-20} {5,-20} {6,6}' -f
    'CONTENEDOR', 'CPU', 'MEMORIA / LIMITE', 'MEM %', 'RED E/S', 'DISCO E/S', 'PIDS')

try {
    & $dockerPath @dockerArguments | ForEach-Object {
        # Docker puede incluir secuencias de limpieza de pantalla en su salida continua.
        $line = [regex]::Replace([string]$_, '\x1B\[[0-?]*[ -/]*[@-~]', '').Trim()
        if ($line) {
            $sample = $line | ConvertFrom-Json -ErrorAction Stop
            foreach ($field in @('Name', 'CPUPerc', 'MemUsage', 'MemPerc', 'NetIO', 'BlockIO', 'PIDs')) {
                if (-not $sample.PSObject.Properties[$field]) {
                    throw "Docker no entrego el campo requerido: $field"
                }
            }
            $timestamp = (Get-Date).ToString('o')
            $row = [pscustomobject][ordered]@{
                FechaHora = $timestamp
                Contenedor = $sample.Name
                CPU = $sample.CPUPerc
                Memoria = $sample.MemUsage
                PorcentajeMemoria = $sample.MemPerc
                Red = $sample.NetIO
                Disco = $sample.BlockIO
                PIDs = $sample.PIDs
            }
            $row | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding UTF8 -Append

            if ($sample.Name -eq 'atlas-backend-et') {
                $cpu = [double]::Parse($sample.CPUPerc.TrimEnd('%'), $culture)
                $memoryText = ($sample.MemUsage -split '/')[0].Trim()
                if ($memoryText -notmatch '^([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]+)$') {
                    throw "Formato de memoria no reconocido: $memoryText"
                }
                $memoryValue = [double]::Parse($Matches[1], $culture)
                $unit = $Matches[2]
                if (-not $units.ContainsKey($unit)) {
                    throw "Unidad de memoria no reconocida: $unit"
                }
                $memoryBytes = $memoryValue * $units[$unit]
                $state.Count++
                if ($cpu -gt $state.MaxCpu) {
                    $state.MaxCpu = $cpu
                    $state.CpuTime = $timestamp
                }
                if ($memoryBytes -gt $state.MaxMemoryBytes) {
                    $state.MaxMemoryBytes = $memoryBytes
                    $state.MaxMemoryText = $memoryText
                    $state.MemoryTime = $timestamp
                }
                @(
                    'Contenedor: atlas-backend-et'
                    "Muestras del backend: $($state.Count)"
                    "CPU maxima observada: $($state.MaxCpu.ToString($culture))%"
                    "Fecha/hora de CPU maxima: $($state.CpuTime)"
                    "Memoria maxima observada: $($state.MaxMemoryText)"
                    "Fecha/hora de memoria maxima: $($state.MemoryTime)"
                    "Ultima muestra: $timestamp"
                    'Maximos de las muestras registradas, no de los intervalos entre muestras.'
                    "Lecturas originales: $csvPath"
                ) | Set-Content -LiteralPath $summaryPath -Encoding UTF8
            }

            Write-Host ('{0,-25} {1,9} {2,-25} {3,8} {4,-20} {5,-20} {6,6}' -f
                $sample.Name, $sample.CPUPerc, $sample.MemUsage, $sample.MemPerc,
                $sample.NetIO, $sample.BlockIO, $sample.PIDs)
            if ($sample.Name -eq 'atlas-backend-et') {
                Write-Host ("  MAXIMOS backend: CPU {0}% | Memoria {1} | Muestras {2}" -f
                    $state.MaxCpu.ToString($culture), $state.MaxMemoryText, $state.Count)
            }
        }
    }
    if ($LASTEXITCODE -ne 0) {
        throw "docker stats termino con codigo $LASTEXITCODE."
    }
    if ($state.Count -eq 0) {
        throw 'No se recibieron mediciones de atlas-backend-et. Revisa que el contenedor este ejecutandose.'
    }
} finally {
    Write-Host "Lecturas guardadas: $csvPath"
    if (Test-Path -LiteralPath $summaryPath) {
        Write-Host "Maximos guardados: $summaryPath"
    }
}
