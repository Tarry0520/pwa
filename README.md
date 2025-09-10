# PWA Project Architecture

This document outlines the architecture and deployment configuration of the PWA project.

## System Architecture

The project follows a distributed architecture with the following components:

- **Frontend**: Progressive Web App (PWA) hosted on AWS Amplify
- **Backend**: Node.js application deployed on AWS Lambda
- **Database**: MySQL and Redis running in Docker containers on EC2

### Architecture Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Browser   │────▶│ AWS Amplify │────▶│     AWS Lambda      │
│    (PWA)    │     │  (Frontend) │     │     (Backend)       │
└─────────────┘     └─────────────┘     └─────────────────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │      AWS EC2        │
                                        │  ┌─────────────┐    │
                                        │  │   Docker    │    │
                                        │  │ ┌─────────┐ │    │
                                        │  │ │  MySQL  │ │    │
                                        │  │ └─────────┘ │    │
                                        │  │ ┌─────────┐ │    │
                                        │  │ │  Redis  │ │    │
                                        │  │ └─────────┘ │    │
                                        │  └─────────────┘    │
                                        └─────────────────────┘
```

## Component Details

### Frontend (AWS Amplify)

- **Build Configuration**: `amplify.yml`
- **Build Process**:
  - Pre-build: `npm install`
  - Build: `npm run build`
- **Artifacts Directory**: `dist/spa`
- **Cache Configuration**:
  - Assets and Icons: Cache for 1 year
  - Service Worker and Manifest: No cache
  - Node modules cached between builds

### Backend (AWS Lambda)

- **Runtime**: Node.js
- **Entry Point**: `lambda.js`
- **API Routes**: Located in `/routes` directory
- **Controllers**: Located in `/controllers` directory
- **Services**: Located in `/services` directory

### Database (EC2 Docker)

#### MySQL Configuration
- **Version**: 8.0
- **Container Name**: pwa_mysql
- **Port**: 3306
- **Database Name**: pwa_backend
- **Resource Limits**:
  - Memory Limit: 512MB
  - Memory Reservation: 256MB
- **Persistence**: Data stored in `./docker/data/mysql`
- **Authentication**:
  - User: xxgjj
  - Password: 123456
  - Root Password: root

#### Redis Configuration
- **Version**: Latest
- **Container Name**: pwa_redis
- **Port**: 6379
- **Resource Limits**:
  - Memory Limit: 256MB
  - Memory Reservation: 128MB
  - Max Memory Policy: allkeys-lru
- **Persistence**: 
  - Data stored in `./docker/data/redis`
  - Append-only mode enabled
- **Password**: 1234567890

## Development Setup

1. Start local databases:
```bash
docker-compose up -d
```

2. Start EC2 databases:
```bash
docker-compose -f docker-compose.ec2.yaml up -d
```

## Health Monitoring

Both MySQL and Redis containers include health checks:

- **MySQL**: Checks connection every 10s
- **Redis**: Checks connection every 10s

## Security Notes

- All database passwords and sensitive information should be moved to environment variables in production
- Redis and MySQL ports are exposed to allow external access - ensure proper security groups and firewall rules are in place
- All services configured with automatic restart policy: `unless-stopped`

## Deployment

- Frontend changes automatically deploy through AWS Amplify CI/CD pipeline
- Backend changes need to be deployed to AWS Lambda
- Database changes on EC2 persist through Docker volumes
