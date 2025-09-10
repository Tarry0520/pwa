#!/bin/bash

# EC2 配置
EC2_HOST="18.139.162.43"
KEY_PATH="/Users/billchen/Codes/POC/pwa/aws/pwa-db-redis.pem"  # 請替換成你的 key pair 路徑
PROJECT_PATH="/home/ec2-user/pwa"

# 檢查 SSH key 是否存在
if [ ! -f "$KEY_PATH" ]; then
    echo "錯誤：找不到 SSH key: $KEY_PATH"
    exit 1
fi

# 安裝 Docker 和 Docker Compose
echo "正在安裝 Docker 和 Docker Compose..."
ssh -i "$KEY_PATH" ec2-user@$EC2_HOST "
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo curl -L \"https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo usermod -aG docker ec2-user
"

# 創建必要的目錄
echo "創建目錄結構..."
ssh -i "$KEY_PATH" ec2-user@$EC2_HOST "mkdir -p $PROJECT_PATH/docker/data/mysql $PROJECT_PATH/docker/data/redis"

# 複製 docker-compose 文件
echo "複製 docker-compose 文件..."
scp -i "$KEY_PATH" docker-compose.ec2.yaml ec2-user@$EC2_HOST:$PROJECT_PATH/docker-compose.yaml

# 啟動服務
echo "啟動 Docker 服務..."
ssh -i "$KEY_PATH" ec2-user@$EC2_HOST "cd $PROJECT_PATH && docker-compose up -d"

# 檢查服務狀態
echo "檢查服務狀態..."
ssh -i "$KEY_PATH" ec2-user@$EC2_HOST "cd $PROJECT_PATH && docker-compose ps"

echo "部署完成！"
echo "MySQL 可以通過 $EC2_HOST:3306 訪問"
echo "Redis 可以通過 $EC2_HOST:6379 訪問"