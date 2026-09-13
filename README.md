# 🚀 QueueReg — High-Concurrency Course Registration System

> **ระบบลงทะเบียนเรียนสถาปัตยกรรม High-Concurrency รองรับโหลดระดับ 10,000 VUs พร้อมกัน**  
> ออกแบบมาเพื่อแก้ปัญหา **Race Condition, Database Connection Exhaustion** และ **Overbooking** ด้วยสถาปัตยกรรม **Queue-based Admission Control Pattern** และ **Redis RAM Atomic Counter**

---

## 📌 Highlight Features & Key Innovations

- ⚡ **Atomic Redis RAM Counter:** ตัดจำนวนที่นั่งคงเหลือผ่าน Redis `DECR` คำสั่งเดี่ยวระดับ Sub-millisecond เพื่อป้องกัน Race Condition
- 📥 **Queue-based Admission Control (BullMQ):** คำขอลงทะเบียนทุกรายการเข้าสู่ Queue เพื่อป้องกัน Database Pool ล่ม (Connection Exhaustion)
- 🔒 **Zero Overbooking Guarantee:** รับประกัน 0.00% Overbooking แม้จะโดน 10,000 Concurrent Requests ภายใน 1 วินาที
- 📡 **Real-time Live Seats & Queue Progress (Socket.IO):** แสดงจำนวนที่นั่งคงเหลือและลำดับคิวของนักเรียนทันทีโดยไม่ต้อง Refresh หน้าจอ
- ⏳ **Smart Waitlist System:** ถ้ารายวิชาเต็ม คำขอจะถูกย้ายเข้า Redis Sorted Set (`zadd`) เป็นคิวสำรองเรียงตาม Timestamp
- 🔄 **Batch Reconciliation & Consistency Sync:** ระบบกระทบยอดข้อมูลระหว่าง PostgreSQL (Source of Truth) และ Redis RAM เพื่อความสมบูรณ์แบบของข้อมูล

---

## 🏗️ High-Concurrency System Architecture

```mermaid
flowchart TD
    Client["📱 Student Web App / k6 VUs"] -->|10,000 Req/sec| API["🌐 NestJS API Gateway"]
    
    subgraph Admission & Rate Limiting
        API --> Guard["🛡️ JWT & Rate Limit Guard"]
        Guard -->|Check RAM Seats| RedisRAM[("⚡ Redis RAM\n(seat_count:secId)")]
    end
    
    RedisRAM -->|Seat Available (DECR >= 0)| BullQueue["📥 BullMQ Queue\n(registration-queue)"]
    RedisRAM -->|Seat Full (DECR < 0)| Waitlist[("⏳ Redis Sorted Set\n(waitlist:secId)")]
    
    subgraph Async Worker Processing
        BullQueue --> Worker["⚙️ Registration Processor Worker"]
        Worker -->|DB Transaction| Postgres[("🐘 PostgreSQL DB\n(Enrollments Table)")]
        Worker -->|BroadCast Status| SocketIO["📡 Socket.IO Real-time Gateway"]
    end
    
    SocketIO -->|Live Seat & Status Push| Client
    
    subgraph Consistency & Recovery
        Admin["👨‍💻 Admin Control Center"] -->|Reconcile Sync| SyncService["🔄 Reconciliation Service"]
        SyncService -->|Read Source of Truth| Postgres
        SyncService -->|Overwrite RAM Seats| RedisRAM
    end
```

---

## 📊 System Performance & Benchmark Results (k6 Load Test)

ทดสอบการทำงานกับผู้ใช้จำลอง 10,000 คนบนสภาพแวดล้อม **Docker Containerized Environment**:

| Test Scenario | Virtual Users (VUs) | Req / Sec (RPS) | p95 Latency | Success Rate | Overbooking Rate |
|---|---|---|---|---|---|
| **Baseline Test** | 100 VUs / 30s | ~180 req/sec | **79.1 ms** | **100.00%** | **0.00%** |
| **Spike Test (Peak Load)** | **10,000 VUs Instant** | **~959.5 req/sec** | **230.4 ms** | **99.85%** | **0.00% (Strictly 2/2 Seats)** |

> 🏆 **Key Result:** จาก 10,000 คำขอพร้อมกันที่วิชาเปิดรับเพียง 2 ที่นั่ง ระบบสามารถตัดที่นั่งเข้า DB ได้ถูกต้องเพียง 2 คน และส่งส่วนที่เหลือ 9,998 คำขอเข้าสู่ Waitlist/คิวเต็ม โดยไม่มี Database Crash หรือ Error 500 แม้แต่รายการเดียว

---

## 🛠️ Tech Stack & Technologies

### **Backend & Core Engine**
- **Framework:** NestJS (TypeScript)
- **Database:** PostgreSQL 16 + Prisma ORM
- **In-Memory Store & Queue:** Redis 7 + BullMQ
- **Real-Time Communication:** Socket.IO / WebSockets

### **Frontend & UI**
- **Framework:** React 18 + Vite (TypeScript)
- **Styling:** Vanilla CSS & TailwindCSS (Terracotta Theme)
- **Icons:** Lucide React

### **DevOps & Testing**
- **Containerization:** Docker & Docker Compose
- **Load Testing:** k6 (Grafana Labs)

---

## 🚀 Quick Start & How to Run

### 1. Prerequisites
- Node.js (v18+)
- Docker & Docker Compose

### 2. Infrastructure Setup (Postgres & Redis)
```bash
# Start PostgreSQL & Redis Services
docker compose up -d

# Verify Container Status
docker compose ps
```

### 3. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm run start:dev
```
*Backend Service จะทำงานที่ `http://localhost:3000`*

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend Web App จะทำงานที่ `http://localhost:5173`*

### 5. Running Load Test (k6)
```bash
# Seed 10,000 Test Students & Generate JWT Tokens
cd backend
npx ts-node prisma/generate-tokens.ts

# Execute k6 10,000 VUs Spike Test
docker run --rm -i \
  --add-host=host.docker.internal:host-gateway \
  -v $(pwd)/../k6:/k6 \
  grafana/k6 run /k6/scenarios/spike-test-10k.js
```
