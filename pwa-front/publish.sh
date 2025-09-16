#!/bin/bash

# Set environment variables
export AMPLIFY_APP_ID="d3e0epva6o5gvq"
export AMPLIFY_ENV_NAME="dev"
export AWS_REGION="ap-southeast-1"

echo "Cleaning up..."
npm run clean

echo "Building PWA..."
npm run build:pwa

echo "Pushing to Amplify..."
amplify push --yes

echo "Publishing with cache invalidation..."
amplify publish --invalidateCloudFront --yes
