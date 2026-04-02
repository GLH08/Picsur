$raw = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($raw)) {
  Write-Output "{}"
  exit 0
}

try {
  $inputObj = $raw | ConvertFrom-Json -Depth 100
} catch {
  Write-Output "{}"
  exit 0
}

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$projectRootNormalized = $projectRoot.TrimEnd('\','/')

function Normalize-Path([string]$path) {
  try {
    return [System.IO.Path]::GetFullPath($path)
  } catch {
    return $null
  }
}

function Is-UnderProject([string]$path) {
  $full = Normalize-Path $path
  if (-not $full) { return $false }

  $candidate = $full.TrimEnd('\','/')
  if ($candidate.Equals($projectRootNormalized, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $true
  }

  return $candidate.StartsWith($projectRootNormalized + "\", [System.StringComparison]::OrdinalIgnoreCase) -or
         $candidate.StartsWith($projectRootNormalized + "/", [System.StringComparison]::OrdinalIgnoreCase)
}

function Ask($reason) {
  $obj = @{
    hookSpecificOutput = @{
      hookEventName = "PreToolUse"
      permissionDecision = "ask"
      permissionDecisionReason = $reason
    }
  }
  $obj | ConvertTo-Json -Depth 10 -Compress
  exit 0
}

function Deny($reason) {
  $obj = @{
    hookSpecificOutput = @{
      hookEventName = "PreToolUse"
      permissionDecision = "deny"
      permissionDecisionReason = $reason
    }
  }
  $obj | ConvertTo-Json -Depth 10 -Compress
  exit 0
}

$tool = $inputObj.tool_name

switch ($tool) {
  "Read" {
    $path = $inputObj.tool_input.file_path
    if ($path -and -not (Is-UnderProject $path)) {
      Ask "读取项目目录外文件，需要你手动确认。"
    }
  }

  "Edit" {
    $path = $inputObj.tool_input.file_path
    if ($path -and -not (Is-UnderProject $path)) {
      Ask "编辑项目目录外文件，需要你手动确认。"
    }
  }

  "Write" {
    $path = $inputObj.tool_input.file_path
    if ($path -and -not (Is-UnderProject $path)) {
      Ask "写入项目目录外文件，需要你手动确认。"
    }
  }

  "Bash" {
    $cmd = [string]$inputObj.tool_input.command

    if ($cmd -match '(^|[;&|]\s*|\s+)rm\s+-[^\n\r]*r[^\n\r]*f') {
      Deny "禁止执行 rm -rf / rm -fr。"
    }

    if ($cmd -match '(^|[;&|]\s*)git\s+push(\s|$)') {
      Ask "远程推送必须手动确认。"
    }

    # 明显越出项目目录的常见模式：..、盘符绝对路径、UNC 路径、用户目录、cd 到外部
    if ($cmd -match '(^|[\s;|&])\.\.[\\/]' `
        -or $cmd -match '[A-Za-z]:\\' `
        -or $cmd -match '(^|[\s;|&])\\\\' `
        -or $cmd -match '(^|[\s;|&])~[\\/]' `
        -or $cmd -match '(^|[;&|]\s*)(cd|Set-Location)\s+(\.\.[\\/]|[A-Za-z]:\\|\\\\|~[\\/])') {
      Ask "该命令可能访问项目目录外路径，需要你手动确认。"
    }
  }
}

Write-Output "{}"
exit 0