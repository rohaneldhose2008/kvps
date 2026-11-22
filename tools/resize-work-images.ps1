param([string]$Src, [string]$Thumb, [string]$Large, [string]$Sheet)
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $Thumb | Out-Null
New-Item -ItemType Directory -Force $Large | Out-Null

$jpg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
function Save-Resized($img, [int]$maxW, [string]$out, [int]$quality) {
  $w = $img.Width; $h = $img.Height
  if ($w -gt $maxW) { $h = [int]($h * $maxW / $w); $w = $maxW }
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
  $g.DrawImage($img, 0, 0, $w, $h)
  $p = New-Object System.Drawing.Imaging.EncoderParameters 1
  $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$quality)
  $bmp.Save($out, $jpg, $p)
  $g.Dispose(); $bmp.Dispose()
}

$files = Get-ChildItem $Src -Filter *.jpg | Sort-Object Name
$cols = 15; $cell = 128; $rows = [math]::Ceiling($files.Count / $cols)
$sheetBmp = New-Object System.Drawing.Bitmap ($cols * $cell), ($rows * $cell)
$sg = [System.Drawing.Graphics]::FromImage($sheetBmp)
$sg.Clear([System.Drawing.Color]::Black)
$font = New-Object System.Drawing.Font 'Arial', 11, ([System.Drawing.FontStyle]::Bold)
$i = 0
foreach ($f in $files) {
  $img = [System.Drawing.Image]::FromFile($f.FullName)
  # respect phone rotation (EXIF orientation)
  if ($img.PropertyIdList -contains 274) {
    $o = $img.GetPropertyItem(274).Value[0]
    switch ($o) { 3 { $img.RotateFlip('Rotate180FlipNone') } 6 { $img.RotateFlip('Rotate90FlipNone') } 8 { $img.RotateFlip('Rotate270FlipNone') } }
  }
  Save-Resized $img 420 (Join-Path $Thumb $f.Name) 72
  Save-Resized $img 1600 (Join-Path $Large $f.Name) 80
  $x = ($i % $cols) * $cell; $y = [math]::Floor($i / $cols) * $cell
  $s = [math]::Min(($cell - 4) / $img.Width, ($cell - 4) / $img.Height)
  $sg.DrawImage($img, $x + 2, $y + 2, [int]($img.Width * $s), [int]($img.Height * $s))
  $sg.FillRectangle([System.Drawing.Brushes]::Black, $x + 2, $y + 2, 30, 16)
  $sg.DrawString("$i", $font, [System.Drawing.Brushes]::Yellow, $x + 3, $y + 2)
  $img.Dispose(); $i++
}
$sheetBmp.Save($Sheet, $jpg, $null)
"done $i"
