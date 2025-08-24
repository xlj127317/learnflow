# LearnFlow Docker 部署脚本 (PowerShell版本)
# 使用方法: .\deploy.ps1 [start|stop|restart|logs|clean]

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "logs", "clean", "status", "health")]
    [string]$Action = "start"
)

# 错误处理
$ErrorActionPreference = "Stop"

# 颜色定义
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

# 项目名称
$ProjectName = "learnflow"

# 日志函数
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

# 检查Docker是否安装
function Test-Docker {
    try {
        $dockerVersion = docker --version
        $composeVersion = docker-compose --version
        Write-Success "Docker 环境检查通过"
        Write-Info "Docker: $dockerVersion"
        Write-Info "Compose: $composeVersion"
    }
    catch {
        Write-Error "Docker 未安装或未启动，请先安装并启动 Docker Desktop"
        exit 1
    }
}

# 检查端口是否被占用
function Test-Ports {
    $ports = @(5432, 3000, 80, 8080)
    
    foreach ($port in $ports) {
        $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connection) {
            Write-Warning "端口 $port 已被占用，请确保没有其他服务使用这些端口"
        }
    }
}

# 启动服务
function Start-Services {
    Write-Info "启动 LearnFlow 服务..."
    
    # 启动服务
    docker-compose up -d
    
    Write-Success "服务启动完成！"
    Write-Info "等待服务就绪..."
    
    # 等待数据库就绪
    Wait-Database
    
    # 执行数据库迁移
    Run-Migrations
    
    Write-Success "部署完成！"
    Show-Status
}

# 停止服务
function Stop-Services {
    Write-Info "停止 LearnFlow 服务..."
    docker-compose down
    Write-Success "服务已停止"
}

# 重启服务
function Restart-Services {
    Write-Info "重启 LearnFlow 服务..."
    docker-compose restart
    Write-Success "服务已重启"
}

# 查看日志
function Show-Logs {
    Write-Info "显示服务日志..."
    docker-compose logs -f
}

# 清理资源
function Clean-Resources {
    $response = Read-Host "这将删除所有容器、镜像和数据卷，确定继续吗？(y/N)"
    if ($response -match "^[yY]$") {
        Write-Info "清理资源..."
        docker-compose down -v --rmi all
        docker system prune -f
        Write-Success "资源清理完成"
    }
    else {
        Write-Info "取消清理操作"
    }
}

# 等待数据库就绪
function Wait-Database {
    Write-Info "等待数据库就绪..."
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        try {
            $result = docker-compose exec -T postgres pg_isready -U learnflow_user -d learnflow 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "数据库已就绪"
                return
            }
        }
        catch {
            # 忽略错误，继续等待
        }
        
        Write-Info "等待数据库... (尝试 $attempt/$maxAttempts)"
        Start-Sleep -Seconds 2
        $attempt++
    }
    
    Write-Error "数据库启动超时"
    exit 1
}

# 执行数据库迁移
function Run-Migrations {
    Write-Info "执行数据库迁移..."
    
    try {
        # 生成Prisma客户端
        docker-compose exec -T backend npx prisma generate
        
        # 执行迁移
        docker-compose exec -T backend npx prisma migrate deploy
        
        Write-Success "数据库迁移完成"
    }
    catch {
        Write-Warning "数据库迁移失败，请检查日志"
    }
}

# 显示服务状态
function Show-Status {
    Write-Info "服务状态："
    docker-compose ps
    
    Write-Host ""
    Write-Info "访问地址："
    Write-Host "  - 前端应用: http://localhost:8080" -ForegroundColor $White
    Write-Host "  - 后端API: http://localhost:8080/api" -ForegroundColor $White
    Write-Host "  - 数据库: localhost:5432" -ForegroundColor $White
    
    Write-Host ""
    Write-Info "管理命令："
    Write-Host "  - 查看日志: .\deploy.ps1 logs" -ForegroundColor $White
    Write-Host "  - 重启服务: .\deploy.ps1 restart" -ForegroundColor $White
    Write-Host "  - 停止服务: .\deploy.ps1 stop" -ForegroundColor $White
    Write-Host "  - 清理资源: .\deploy.ps1 clean" -ForegroundColor $White
}

# 健康检查
function Test-Health {
    Write-Info "执行健康检查..."
    
    # 检查前端
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "前端服务正常"
        }
        else {
            Write-Error "前端服务异常"
        }
    }
    catch {
        Write-Error "前端服务异常"
    }
    
    # 检查后端
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "后端服务正常"
        }
        else {
            Write-Error "后端服务异常"
        }
    }
    catch {
        Write-Error "后端服务异常"
    }
    
    # 检查数据库
    try {
        $result = docker-compose exec -T postgres pg_isready -U learnflow_user -d learnflow 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "数据库服务正常"
        }
        else {
            Write-Error "数据库服务异常"
        }
    }
    catch {
        Write-Error "数据库服务异常"
    }
}

# 主函数
function Main {
    switch ($Action) {
        "start" {
            Test-Docker
            Test-Ports
            Start-Services
        }
        "stop" {
            Stop-Services
        }
        "restart" {
            Restart-Services
        }
        "logs" {
            Show-Logs
        }
        "clean" {
            Clean-Resources
        }
        "status" {
            docker-compose ps
        }
        "health" {
            Test-Health
        }
        default {
            Write-Host "使用方法: .\deploy.ps1 [start|stop|restart|logs|clean|status|health]" -ForegroundColor $White
            Write-Host ""
            Write-Host "命令说明：" -ForegroundColor $White
            Write-Host "  start   - 启动所有服务" -ForegroundColor $White
            Write-Host "  stop    - 停止所有服务" -ForegroundColor $White
            Write-Host "  restart - 重启所有服务" -ForegroundColor $White
            Write-Host "  logs    - 查看服务日志" -ForegroundColor $White
            Write-Host "  clean   - 清理所有资源" -ForegroundColor $White
            Write-Host "  status  - 查看服务状态" -ForegroundColor $White
            Write-Host "  health  - 执行健康检查" -ForegroundColor $White
            exit 1
        }
    }
}

# 执行主函数
Main

