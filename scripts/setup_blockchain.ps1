# PowerShell script for Windows
Write-Host "🚀 Setting up Blockchain for Wheat Lifecycle" -ForegroundColor Green
Write-Host ""

# Check if Hardhat is installed
if (-not (Test-Path "blockchain\node_modules")) {
    Write-Host "📦 Installing Hardhat dependencies..." -ForegroundColor Yellow
    Set-Location blockchain
    npm install
    Set-Location ..
}

Write-Host "1️⃣ Starting Hardhat node..." -ForegroundColor Cyan
Set-Location blockchain

# Start Hardhat node in background
$hardhatJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npx hardhat node
}

Write-Host "   Hardhat node starting in background..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Write-Host "2️⃣ Deploying contract..." -ForegroundColor Cyan
npx hardhat run scripts/deployWheat.js --network localhost

Set-Location ..

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "📝 Don't forget to add CONTRACT_ADDRESS to your .env file" -ForegroundColor Yellow
Write-Host "🛑 To stop Hardhat node: Stop-Job $($hardhatJob.Id); Remove-Job $($hardhatJob.Id)" -ForegroundColor Gray

