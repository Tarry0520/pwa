#!/bin/bash

echo "Cleaning up..."
npm run clean

echo "Building PWA..."
npm run build:pwa

echo "Pushing to Amplify..."
amplify push --force --yes

echo "Publishing with cache invalidation..."
amplify publish --invalidateCloudFront --yes
