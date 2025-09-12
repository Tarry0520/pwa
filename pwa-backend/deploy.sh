#!/bin/bash

echo "開始構建和部署..."
sam build && sam deploy --no-confirm-changeset

if [ $? -eq 0 ]; then
    echo "部署成功！"
else
    echo "部署失敗！"
    exit 1
fi

