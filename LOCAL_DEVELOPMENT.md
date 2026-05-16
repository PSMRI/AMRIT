# AMRIT Local Development Setup Guide

A complete, step-by-step guide for setting up the AMRIT platform on your local machine.
This guide covers all services, common pitfalls, and OS-specific notes.

> **Tip:** You don't need to run every service at once. Start with the one module you're
> contributing to and bring up its direct dependencies only.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Overview](#2-repository-overview)
3. [Database Setup](#3-database-setup)
4. [Backend Service Setup (Spring Boot)](#4-backend-service-setup-spring-boot)
5. [Frontend Setup (Angular)](#5-frontend-setup-angular)
6. [Mobile App Setup (Android)](#6-mobile-app-setup-android)
7. [Service Startup Order](#7-service-startup-order)
8. [Port Reference](#8-port-reference)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [Docker Setup (Alternative)](#10-docker-setup-alternative)
11. [Troubleshooting](#11-troubleshooting)
12. [OS-Specific Notes](#12-os-specific-notes)

---

## 1. Prerequisites

Install all of these before proceeding.

### Required

| Tool | Version | Install |
|---|---|---|
| Java (JDK) | 17 LTS | [adoptium.net](https://adoptium.net) |
| Maven | 3.8+ | [maven.apache.org](https://maven.apache.org) |
| Node.js | 18 LTS or 20 LTS | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Bundled with Node.js |
| MySQL | 8.0 | [dev.mysql.com/downloads](https://dev.mysql.com/downloads/mysql) |
| Git | 2.x | [git-scm.com](https://git-scm.com) |

### Recommended

| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Run infrastructure (MySQL, Redis) without local install |
| Redis | Required by some APIs for session caching |
| IntelliJ IDEA / VS Code | IDE support for Java and Angular |
| Postman | Test API endpoints locally |
| Angular CLI | `npm install -g @angular/cli` |

### Verify installation

```bash
java -version        # should print: openjdk 17...
mvn -version         # should print: Apache Maven 3.8...
node -v              # should print: v18.x.x or v20.x.x
mysql --version      # should print: mysql  Ver 8.0...
git --version        # should print: git version 2.x
```

---

## 2. Repository Overview

AMRIT is split across many repositories. For local development, you typically work
on one module at a time. Here's the dependency map:

```
Every API depends on:
  └── Common-API (shared services, auth)
      └── MySQL (AMRIT-DB schema)

Every UI depends on:
  └── Its paired API
      └── Common-API

Mobile apps depend on:
  └── HWC-API or FLW-API
```

### Module groupings

**Start here if you're new:**
- HWC (Health & Wellness Centre): `HWC-API` + `HWC-UI`
- 104 Helpline: `Helpline104-API` + `Helpline104-UI`

**Other modules (bring up after Common-API is running):**
- Telemedicine: `TM-API` + `TM-UI`
- Mobile Medical Unit: `MMU-API` + `MMU-UI`
- Admin: `Admin-API` + `ADMIN-UI`

### Clone the repos you need

```bash
# Core (required by all)
git clone https://github.com/PSMRI/Common-API.git
git clone https://github.com/PSMRI/AMRIT-DB.git

# Example: HWC module
git clone https://github.com/PSMRI/HWC-API.git
git clone https://github.com/PSMRI/HWC-UI.git

# Example: 104 Helpline module
git clone https://github.com/PSMRI/Helpline104-API.git
git clone https://github.com/PSMRI/Helpline104-UI.git
```

---

## 3. Database Setup

### 3.1 Create the database

Log into MySQL as root:

```sql
CREATE DATABASE amrit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'amrit'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON amrit.* TO 'amrit'@'localhost';
FLUSH PRIVILEGES;
```

### 3.2 Apply the schema

AMRIT uses Flyway for schema management via the `AMRIT-DB` repo:

```bash
cd AMRIT-DB
# Edit src/main/resources/application.properties:
# spring.datasource.url=jdbc:mysql://localhost:3306/amrit
# spring.datasource.username=amrit
# spring.datasource.password=your_password

mvn spring-boot:run
# Flyway will apply all migrations automatically on startup
```

### 3.3 Seed master data

Some modules require master/lookup data in `m_` tables. After schema migration:

```bash
# Check if seed scripts exist in AMRIT-DB/src/main/resources/db/
ls AMRIT-DB/src/main/resources/db/seed/
# Run any .sql files found there manually via MySQL client
mysql -u amrit -p amrit < seed_data.sql
```

### 3.4 Redis (if required)

Some APIs use Redis for session management:

```bash
# Using Docker (easiest)
docker run -d --name amrit-redis -p 6379:6379 redis:7-alpine

# Or install natively:
# Windows: https://github.com/microsoftarchive/redis/releases
# Mac: brew install redis && brew services start redis
# Linux: sudo apt install redis-server && sudo systemctl start redis
```

---

## 4. Backend Service Setup (Spring Boot)

### 4.1 Configure application.properties

Every API has an `application.properties` in `src/main/resources/`. Copy the example
if one exists, otherwise edit directly:

```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/amrit?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=amrit
spring.datasource.password=your_password
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA
spring.jpa.hibernate.ddl-auto=none
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

# Server port (see port reference table)
server.port=8085

# Redis (if used)
spring.redis.host=localhost
spring.redis.port=6379

# Logging
logging.level.root=INFO
logging.level.com.iemr=DEBUG
```

### 4.2 Build and run

```bash
cd HWC-API   # (or whichever API you're working on)

# Build (skip tests for faster first run)
mvn clean install -DskipTests

# Run
mvn spring-boot:run

# Or run the JAR directly
java -jar target/HWC-API-*.jar
```

### 4.3 Verify the service is running

```bash
curl http://localhost:8085/actuator/health
# Expected: {"status":"UP"}
```

### 4.4 Start Common-API first

**Common-API must be running before any other API.** It handles authentication
and shared services that every other service calls.

```bash
cd Common-API
mvn clean install -DskipTests
mvn spring-boot:run
# Runs on port 8083
```

---

## 5. Frontend Setup (Angular)

### 5.1 Install dependencies

```bash
cd HWC-UI   # (or whichever UI you're working on)
npm install
```

### 5.2 Configure the environment

Edit `src/environments/environment.ts` to point to your local APIs:

```typescript
export const environment = {
  production: false,
  // Update these to match your local API ports
  hwcApiUrl: 'http://localhost:8085',
  commonApiUrl: 'http://localhost:8083',
  // Add other service URLs as needed
};
```

### 5.3 Run the development server

```bash
ng serve
# Or if you need a specific port:
ng serve --port 4204
```

Open `http://localhost:4204` in your browser.

### 5.4 Common Angular issues

**`npm install` fails with ERESOLVE error:**
```bash
npm install --legacy-peer-deps
```

**Node.js version mismatch (older repos use Angular 4–12):**
```bash
# Use nvm to switch Node versions
nvm install 16
nvm use 16
npm install
```

**SSL certificate errors on API calls:**
Add this to `src/environments/environment.ts`:
```typescript
// Only for local dev — never in production
rejectUnauthorized: false
```

---

## 6. Mobile App Setup (Android)

Applies to `HWC-Mobile-App` and `FLW-Mobile-App`.

### 6.1 Prerequisites

- Android Studio (latest stable)
- Android SDK API level 26+
- Kotlin plugin (bundled with Android Studio)

### 6.2 Configure the API base URL

Edit `app/build.gradle`:

```gradle
buildTypes {
    debug {
        buildConfigField "String", "API_BASE_URL", '"http://10.0.2.2:8085/"'
        // 10.0.2.2 is the Android emulator's alias for localhost
    }
}
```

> **Physical device:** Use your machine's local network IP instead of `10.0.2.2`
> (e.g., `http://192.168.1.x:8085/`)

### 6.3 Build and run

1. Open the project in Android Studio
2. Sync Gradle files (`File → Sync Project with Gradle Files`)
3. Select an emulator or connected device
4. Click Run (▶) or `Shift+F10`

### 6.4 Test offline sync

1. Register a beneficiary while the emulator has network access
2. Enable Airplane Mode on the emulator
3. Add more data — it should save locally
4. Disable Airplane Mode — WorkManager should sync automatically within 15 minutes

---

## 7. Service Startup Order

Always start services in this order to avoid dependency failures:

```
1. MySQL (database)
2. Redis (if required)
3. Common-API        (port 8083) ← all others depend on this
4. Admin-API         (port 8082)
5. BeneficiaryID-API (port 8092) ← required for patient registration
6. Identity-API      (port 8094)
7. Your target API   (e.g. HWC-API on 8085)
8. Your target UI    (e.g. HWC-UI on 4204)
```

> You can skip steps 4–6 if you're only working on a specific module and don't
> need beneficiary creation. Check your API logs for connection errors.

---

## 8. Port Reference

### Backend APIs

| Service | Port |
|---|---|
| FLW-API | 8081 |
| Admin-API | 8082 |
| Common-API | 8083 |
| ECD-API | 8084 |
| HWC-API | 8085 |
| Inventory-API | 8086 |
| MMU-API | 8087 |
| Scheduler-API | 8088 |
| TM-API | 8089 |
| Helpline1097-API | 8090 |
| Helpline104-API | 8091 |
| BeneficiaryID-Generation-API | 8092 |
| FHIR-API | 8093 |
| Identity-API | 8094 |
| Identity-1097-API | 8095 |

### Frontend UIs

| Service | Port |
|---|---|
| Inventory-UI | 4201 |
| MMU-UI | 4202 |
| TM-UI | 4203 |
| HWC-UI | 4204 |
| ADMIN-UI | 4205 |
| HWC-Scheduler-UI | 4206 |
| Scheduler-UI | 4208 |
| ECD-UI | 4209 |
| Helpline1097-UI | 4210 |
| Helpline104-UI | 4211 |

---

## 9. Environment Variables Reference

Variables commonly needed across AMRIT services:

| Variable | Description | Example |
|---|---|---|
| `DB_URL` | MySQL JDBC URL | `jdbc:mysql://localhost:3306/amrit` |
| `DB_USERNAME` | MySQL user | `amrit` |
| `DB_PASSWORD` | MySQL password | `your_password` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `SERVER_PORT` | API port | `8085` |
| `JWT_SECRET` | JWT signing secret | any random 32+ char string |
| `COMMON_API_URL` | Common-API base URL | `http://localhost:8083` |

Pass these as system properties if you don't want to edit `application.properties`:

```bash
mvn spring-boot:run -Dspring-boot.run.arguments="--DB_PASSWORD=your_password --SERVER_PORT=8085"
```

---

## 10. Docker Setup (Alternative)

If you prefer containers over local installs:

### 10.1 Infrastructure only (MySQL + Redis)

```yaml
# docker-compose.infra.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: amrit
      MYSQL_USER: amrit
      MYSQL_PASSWORD: amritpassword
    ports:
      - "3306:3306"
    volumes:
      - amrit_mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  amrit_mysql_data:
```

```bash
docker-compose -f docker-compose.infra.yml up -d
```

### 10.2 Build and run an API in Docker

```bash
cd HWC-API
mvn clean package -DskipTests

docker build -t amrit-hwc-api .
docker run -d \
  -p 8085:8085 \
  -e DB_URL=jdbc:mysql://host.docker.internal:3306/amrit \
  -e DB_USERNAME=amrit \
  -e DB_PASSWORD=amritpassword \
  amrit-hwc-api
```

> Use `host.docker.internal` on Mac/Windows to reach your local MySQL from inside Docker.
> On Linux, use `--network=host` instead.

---

## 11. Troubleshooting

### `Communications link failure` (MySQL connection refused)
- MySQL isn't running: `sudo systemctl start mysql` (Linux) or start from MySQL Workbench
- Wrong port in `application.properties` — default is 3306
- Check: `mysql -u amrit -p -h localhost` — if this fails, fix MySQL first

### `Access denied for user 'amrit'@'localhost'`
```sql
-- Run as root in MySQL:
ALTER USER 'amrit'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### `Port 8085 already in use`
```bash
# Find and kill the process
# Linux/Mac:
lsof -ti:8085 | xargs kill -9
# Windows:
netstat -ano | findstr :8085
taskkill /PID <PID> /F
```

### `Could not autowire: BeanDefinitionStoreException`
- Schema mismatch: the DB schema doesn't match what Hibernate expects
- Fix: re-run AMRIT-DB Flyway migrations on a clean database

### Angular: `Cannot GET /` after `ng serve`
- The app compiled but the default route is `/login` — navigate to `http://localhost:4204/login`

### Angular: CORS errors in browser console
- Your backend API doesn't have `@CrossOrigin` on the controller, or the Angular `environment.ts` URL is wrong
- Verify the API is actually running: `curl http://localhost:8085/actuator/health`

### Android emulator can't reach local API
- Use `10.0.2.2` instead of `localhost` or `127.0.0.1` in `BuildConfig.API_BASE_URL`
- Ensure the API is bound to `0.0.0.0` not just `127.0.0.1`

### `java.lang.UnsupportedClassVersionError`
- You're running with Java 11 but the project requires Java 17
- Fix: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` (Mac) or update `JAVA_HOME` in Windows env vars

### Maven build fails: `Could not resolve dependencies`
```bash
# Clear local Maven cache and retry
mvn dependency:purge-local-repository
mvn clean install -DskipTests
```

---

## 12. OS-Specific Notes

### Windows

- Use **Git Bash** or **WSL2** for shell commands — PowerShell may behave differently
- Set `JAVA_HOME` in System Environment Variables: `C:\Program Files\Eclipse Adoptium\jdk-17`
- Add Maven to PATH: `C:\Program Files\Apache Maven\bin`
- MySQL line endings: if you get `\r` errors in SQL scripts, open MySQL Workbench and run scripts from there
- Android emulator is slower on Windows — enable **Hardware Acceleration (HAXM)** in Android Studio

### macOS

```bash
# Install Java 17 via Homebrew
brew install --cask temurin@17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# Install Maven
brew install maven

# Install MySQL
brew install mysql@8.0
brew services start mysql@8.0
```

### Linux (Ubuntu/Debian)

```bash
# Java 17
sudo apt update
sudo apt install openjdk-17-jdk

# Maven
sudo apt install maven

# MySQL 8.0
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation
```

---

## Getting Help

- **Discord:** [discord.gg/FVQWsf5ENS](https://discord.gg/FVQWsf5ENS)
- **JIRA:** [support.piramalfoundation.org/jira](https://support.piramalfoundation.org/jira)
- **Developer docs:** [piramal-swasthya.gitbook.io/amrit](https://piramal-swasthya.gitbook.io/amrit)
- **GitHub Issues:** Open an issue on the relevant repo for module-specific bugs

---

## Contributing to This Guide

Found a setup step that's missing or wrong? Please:
1. Comment on [issue #111](https://github.com/PSMRI/AMRIT/issues/111) with your feedback
2. Or open a PR editing this file directly

This guide improves with every contributor who sets up AMRIT locally.
