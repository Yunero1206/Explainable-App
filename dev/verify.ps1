$raw = Get-Content -Raw "dev/fixtures/quickbite.replay.json"
$fixture = $raw | ConvertFrom-Json

Write-Host "==============================================================="
Write-Host "    REPLAY FIXTURE INVARIANT TEST SUITE                        "
Write-Host "==============================================================="

$failures = 0
$passed = 0

function Assert-Test($condition, $testName, $detail = "") {
    if ($condition) {
        Write-Host "  [PASS] $testName"
        $script:passed++
    } else {
        Write-Host "  [FAIL] $testName - $detail" -ForegroundColor Red
        $script:failures++
    }
}

# 1. No legacy vocabulary
$legacyTerms = @("User-reported", "Established in record", "Conflicted", "Ambiguous / relationship unresolved")
$foundLegacy = 0
foreach ($term in $legacyTerms) {
    if ($raw.Contains($term)) {
        $foundLegacy++
    }
}
Assert-Test ($foundLegacy -eq 0) "INV-00 Zero legacy vocabulary strings" "Found $foundLegacy legacy term occurrences"

# 2. G01 Persistence
$g01Turns = @(1, 2, 6, 7, 8)
foreach ($turnNum in $g01Turns) {
    $tData = $fixture.turns | Where-Object { $_.turn -eq $turnNum }
    $hasG01 = $false
    if ($tData -and $tData.output.gaps) {
        foreach ($g in $tData.output.gaps) {
            if ($g.id -eq "G01") { $hasG01 = $true }
        }
    }
    Assert-Test ($hasG01 -eq $true) "INV-01 G01 persistence in Turn $turnNum"
}

# 3. G02 in Turn 9
$turn9 = $fixture.turns | Where-Object { $_.turn -eq 9 }
$hasG02 = $false
if ($turn9 -and $turn9.output.gaps) {
    foreach ($g in $turn9.output.gaps) {
        if ($g.id -eq "G02") { $hasG02 = $true }
    }
}
Assert-Test ($hasG02 -eq $true) "INV-02 / INV-03 G02 present in Turn 9"

# 4. G04 in Turn 10
$turn10 = $fixture.turns | Where-Object { $_.turn -eq 10 }
$hasG04 = $false
if ($turn10 -and $turn10.output.gaps) {
    foreach ($g in $turn10.output.gaps) {
        if ($g.id -eq "G04") { $hasG04 = $true }
    }
}
Assert-Test ($hasG04 -eq $true) "INV-04 G04 present in Turn 10"

# 5. No invented timestamps
$tsViolation = $false
foreach ($t in $fixture.turns) {
    if ($t.output.events) {
        foreach ($ev in $t.output.events) {
            $hasEv = ($ev.evidence_ids -and $ev.evidence_ids.Count -gt 0)
            if (-not $hasEv -and $ev.time -and $ev.time -ne "Unknown" -and $ev.time.Contains("202") -and $ev.time.Contains("T")) {
                $tsViolation = $true
            }
        }
    }
}
Assert-Test (-not $tsViolation) "INV-05 No invented timestamps for user-reported events"

# 6. Documentary evidence not auto-creating objective truth
$docTruthViolation = $false
foreach ($t in $fixture.turns) {
    if ($t.output.claims) {
        foreach ($c in $t.output.claims) {
            $hasSup = ($c.supporting_evidence -and $c.supporting_evidence.Count -gt 0)
            if (-not $hasSup -and $c.assessment -eq "Established within current record") {
                $docTruthViolation = $true
            }
        }
    }
}
Assert-Test (-not $docTruthViolation) "INV-07 Claim without supporting evidence is not Established within current record"

# 7. Supported claims are properly assessed
$claimAssessMatch = $true
foreach ($t in $fixture.turns) {
    if ($t.output.claims) {
        foreach ($c in $t.output.claims) {
            $hasSup = ($c.supporting_evidence -and $c.supporting_evidence.Count -gt 0)
            if ($hasSup -and $c.assessment -ne "Established within current record") {
                $claimAssessMatch = $false
            }
        }
    }
}
Assert-Test ($claimAssessMatch -eq $true) "INV-09 Claims backed by evidence are Established within current record"

# 8. All turns valid
Write-Host ""
Write-Host "==============================================================="
Write-Host "  RESULTS: $passed Passed, $failures Failed"
Write-Host "==============================================================="
