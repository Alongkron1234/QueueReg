# QueueReg — High-Concurrency Course Registration System

ระบบลงทะเบียนเรียนสถาปัตยกรรม High-Concurrency เพื่อป้องกันปัญหา Race Condition, Database Connection Exhaustion และรองรับ Traffic Spike ช่วงเปิดลงทะเบียนเรียนด้วย **Queue-based Admission Control Pattern**

---

## 🛠️ Tech Stack

- **Backend Framework:** NestJS (TypeScript)
- **Database:** PostgreSQL 16
- **Cache & Locking:** Redis 7 (Atomic Counter & Sliding Window Rate Limiting)
- **Message Queue:** BullMQ
- **Real-time Gateway:** WebSocket (Socket.IO / Native WS)
- **Frontend:** React + TypeScript
- **Infrastructure:** Docker & Docker Compose
- **Load Testing:** k6

---

## 🚀 Quick Start (Docker Setup)

### 1. Clone & Environment Setup
คัดลอกไฟล์ตัวแปรสภาพแวดล้อม:
```bash
cp .env.example .env
```

### 2. Run Services via Docker Compose
เปิดการทำงานของบริการ Infrastructure (PostgreSQL & Redis):
```bash
docker compose up -d
```

ตรวจสอบสถานะของ Container:
```bash
docker compose ps
```

---

## 🔌 Running Services & Ports

| Service | Container Name | Host Port | Internal Port |
|---|---|---|---|
| PostgreSQL | `coursereg_postgres` | `5432` | `5432` |
| Redis | `coursereg_redis` | `6379` | `6379` |

---

## 📋 Helpful Docker Commands

- **ดู Logs ของทุกบริการ:**
  ```bash
  docker compose logs -f
  ```
- **ทดสอบการเชื่อมต่อ Redis:**
  ```bash
  docker exec -it coursereg_redis redis-cli ping
  ```
- **หยุดการทำงานบริการทั้งหมด:**
  ```bash
  docker compose down
  ```
