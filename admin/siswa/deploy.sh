#!/bin/bash
set -e

echo "Building the application..."
npm run build

echo "Deploying to FTP..."
python3 scripts/deploy_ftp.py

echo "Deployment complete!"
