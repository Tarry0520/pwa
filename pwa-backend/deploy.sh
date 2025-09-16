#!/bin/bash

echo "Starting build and deployment..."
sam build && sam deploy --no-confirm-changeset

if [ $? -eq 0 ]; then
    echo "Deployment successful!"
else
    echo "Deployment failed!"
    exit 1
fi




