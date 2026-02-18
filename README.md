# 🎓 Online Learning Platform — Backend Microservices

Hệ thống backend cho nền tảng học trực tuyến, xây dựng theo kiến trúc **Microservices** với **12 service** + **API Gateway**.

---

## 📐 Kiến trúc tổng quan

```
┌─────────────┐
│  Client App  │
└──────┬──────┘
       │ HTTP
┌──────▼──────────────────────────────────────┐
│              API Gateway (:3000)             │
│    Express + http-proxy-middleware           │
│    Rate Limiting, CORS, Helmet              │
└──────┬──────────────────────────────────────┘
       │ Proxy
┌──────▼──────────────────────────────────────────────────────────┐
│                      12 Microservices                           │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐      │
│  │  Auth    │ │  User    │ │  Course  │ │    Search    │      │
│  │  :3001   │ │  :3002   │ │  :3003   │ │    :3004     │      │
│  │ Postgres │ │ MongoDB  │ │ MongoDB  │ │  Postgres    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐      │
│  │  Order   │ │ Payment  │ │  Wallet  │ │   Learning   │      │
│  │  :3005   │ │  :3006   │ │  :3007   │ │    :3008     │      │
│  │ Postgres │ │ Postgres │ │ Postgres │ │   MongoDB    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐      │
│  │  Cert.   │ │  Review  │ │  Notif.  │ │    Admin     │      │
│  │  :3009   │ │  :3010   │ │  :3011   │ │    :3012     │      │
│  │ MongoDB  │ │ MongoDB  │ │ MongoDB  │ │   (gRPC)     │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
       │                        │
┌──────▼───────┐    ┌───────────▼──────────┐
│  RabbitMQ    │    │    gRPC (đồng bộ)    │
│  (Bất đồng   │    │  Course ↔ Order      │
│   bộ events) │    │  Payment ↔ Order     │
│  :5672       │    │  User ↔ Admin        │
│  :15672 (UI) │    │  Learning ↔ Admin    │
└──────────────┘    └──────────────────────┘
```

---

## 🛠 Công nghệ sử dụng

| Thành phần | Công nghệ | Phiên bản |
|---|---|---|
| **Runtime** | Node.js | 20 LTS |
| **Framework** | Express.js | 4.18 |
| **CSDL quan hệ** | PostgreSQL | 15 |
| **CSDL NoSQL** | MongoDB | 7 |
| **ORM (SQL)** | Prisma | 5.7 |
| **ODM (NoSQL)** | Mongoose | 8.0 |
| **Message Broker** | RabbitMQ | 3.12 |
| **Cache** | Redis | 7 |
| **gRPC** | @grpc/grpc-js | 1.9 |
| **API Proxy** | http-proxy-middleware | 3.0 |
| **Auth** | JWT + Google OAuth | — |
| **Thanh toán** | Stripe + MoMo + Mock | — |
| **Validation** | Joi | 17 |
| **Logging** | Winston | 3.11 |
| **Container** | Docker + Docker Compose | — |

---

## 📁 Cấu trúc thư mục

```
backend/
├── docker-compose.yml          # Orchestration toàn bộ hệ thống
├── .env                        # Biến môi trường
├── init-postgres/              # Script khởi tạo nhiều DB PostgreSQL
│   └── init-databases.sh
├── shared/                     # Code dùng chung cho mọi service
│   ├── events/rabbitmq.js      # RabbitMQ publish/subscribe
│   ├── middleware/              # auth, error, validate middleware
│   └── utils/                  # logger, errors
├── proto/                      # gRPC Protocol Buffers
│   ├── course.proto
│   ├── payment.proto
│   ├── learning.proto
│   └── user.proto
├── api-gateway/                # Reverse proxy + rate limiting
├── auth-service/               # Đăng ký, đăng nhập, Google login
├── user-service/               # Profile, instructor management
├── course-service/             # CRUD khóa học, section, lesson, coupon
├── search-service/             # Tìm kiếm, lọc khóa học
├── order-service/              # Giỏ hàng, checkout, đơn hàng
├── payment-service/            # Thanh toán (Stripe, MoMo, Mock)
├── wallet-service/             # Ví điện tử, nạp tiền
├── learning-service/           # Enrollment, tiến độ học
├── certificate-service/        # Cấp chứng chỉ tự động
├── review-service/             # Đánh giá khóa học
├── notification-service/       # Thông báo real-time
└── admin-service/              # Quản trị hệ thống
```

---

## 📋 Chi tiết từng Service

### 1. Auth Service (`:3001`) — PostgreSQL + Prisma
| API | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/auth/register` | POST | ❌ | Đăng ký tài khoản |
| `/api/v1/auth/login` | POST | ❌ | Đăng nhập |
| `/api/v1/auth/google` | POST | ❌ | Đăng nhập bằng Google |
| `/api/v1/auth/me` | GET | ✅ | Lấy thông tin user hiện tại |

### 2. User Service (`:3002`) — MongoDB + gRPC
| API | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/users/profile` | GET | ✅ | Lấy profile |
| `/api/v1/users/profile` | PUT | ✅ | Cập nhật profile |
| `/api/v1/users/instructor` | POST | ✅ | Đăng ký làm instructor |

### 3. Course Service (`:3003`) — MongoDB + gRPC + RabbitMQ
| API | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/courses` | POST | ✅ Instructor | Tạo khóa học |
| `/api/v1/courses` | GET | ❌ | Danh sách khóa học |
| `/api/v1/courses/:id` | GET | ❌ | Chi tiết khóa học |
| `/api/v1/courses/:id` | PUT | ✅ Instructor | Cập nhật khóa học |
| `/api/v1/courses/:id/publish` | POST | ✅ Instructor | Xuất bản |
| `sections/` | CRUD | ✅ | Quản lý chương |
| `lessons/` | CRUD | ✅ | Quản lý bài học |
| `coupons/` | CRUD | ✅ | Quản lý coupon |

### 4. Search Service (`:3004`) — PostgreSQL + Prisma
| API | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/search?keyword=&topicId=&minPrice=&maxPrice=&sortBy=` | GET | ❌ | Tìm kiếm khóa học |

**Events tiêu thụ:** `course.published`, `course.updated`, `course.deleted`, `review.created`, `review.updated`

### 5. Order Service (`:3005`) — PostgreSQL + Prisma + gRPC
| API | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/cart` | GET | ✅ | Xem giỏ hàng |
| `/api/v1/cart` | POST | ✅ | Thêm vào giỏ |
| `/api/v1/cart/:courseId` | DELETE | ✅ | Xóa khỏi giỏ |
| `/api/v1/checkout` | POST | ✅ | Thanh toán giỏ hàng |
| `/api/v1/orders` | GET | ✅ | Danh sách đơn hàng |
| `/api/v1/orders/:orderId` | GET | ✅ | Chi tiết đơn hàng |

### 6. Payment Service (`:3006`) — PostgreSQL + Prisma + gRPC
| API | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/payments/topup` | POST | ✅ | Nạp tiền ví |
| `/api/v1/payments/order` | POST | ✅ | Thanh toán đơn |
| `/api/v1/payments/:id/status` | GET | ✅ | Trạng thái thanh toán |
| `/api/v1/payments/webhook/:provider` | POST | ❌ | Webhook từ Stripe/MoMo |

**Provider hỗ trợ:** `MOCK` (auto-succeed), `STRIPE`, `MOMO`

### 7. Wallet Service (`:3007`) — PostgreSQL + Prisma
| API | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/wallet/balance` | GET | ✅ | Xem số dư |
| `/api/v1/wallet/transactions` | GET | ✅ | Lịch sử giao dịch |

### 8. Learning Service (`:3008`) — MongoDB + gRPC
| API | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/learning/my-courses` | GET | ✅ | Khóa học đã đăng ký |
| `/api/v1/learning/courses/:courseId` | GET | ✅ | Chi tiết enrollment |
| `/api/v1/learning/courses/:courseId/progress` | GET | ✅ | Tiến độ theo lesson |
| `/api/v1/learning/courses/:courseId/complete` | POST | ✅ | Đánh dấu hoàn thành bài |

### 9. Certificate Service (`:3009`) — MongoDB
| API | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/certificates` | GET | ✅ | Danh sách chứng chỉ |
| `/api/v1/certificates/verify/:id` | GET | ❌ | Xác minh chứng chỉ |

### 10. Review Service (`:3010`) — MongoDB
| API | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/reviews` | POST | ✅ | Tạo đánh giá |
| `/api/v1/reviews/:reviewId` | PUT | ✅ | Sửa đánh giá |
| `/api/v1/reviews/:reviewId` | DELETE | ✅ | Xóa đánh giá |
| `/api/v1/reviews/course/:courseId` | GET | ❌ | Đánh giá theo khóa |
| `/api/v1/reviews/course/:courseId/stats` | GET | ❌ | Thống kê sao |

### 11. Notification Service (`:3011`) — MongoDB
| API | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/notifications` | GET | ✅ | Danh sách thông báo |
| `/api/v1/notifications/unread-count` | GET | ✅ | Số thông báo chưa đọc |
| `/api/v1/notifications/:id/read` | PUT | ✅ | Đánh dấu đã đọc |
| `/api/v1/notifications/read-all` | PUT | ✅ | Đọc tất cả |

### 12. Admin Service (`:3012`) — gRPC client
| API | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/admin/courses/:id` | GET | ✅ ADMIN | Thông tin khóa học |
| `/api/v1/admin/courses/:id/publish` | POST | ✅ ADMIN | Duyệt xuất bản |
| `/api/v1/admin/courses/:id/hide` | POST | ✅ ADMIN | Ẩn khóa học |
| `/api/v1/admin/instructors/:id/ban` | POST | ✅ ADMIN | Cấm instructor |
| `/api/v1/admin/instructors/:id/unban` | POST | ✅ ADMIN | Mở cấm instructor |

---

## 🔄 Luồng sự kiện (Event Flow)

```
course.published ──► Search Service (index)
course.updated   ──► Search Service (update index)
course.deleted   ──► Search Service (remove index)

payment.succeeded ──► Order Service (mark PAID)
payment.failed    ──► Order Service (mark CANCELLED)
topup.succeeded   ──► Wallet Service (credit balance)

order.paid ──► Learning Service (create enrollment)
           ──► Wallet Service (credit instructor earnings)
           ──► Notification Service (notify student)

course.enrolled     ──► Notification Service
course.completed    ──► Certificate Service (issue cert)
certificate.issued  ──► Notification Service
review.created      ──► Search Service (update rating)
review.updated      ──► Search Service (update rating)
```

---

## 🚀 Hướng dẫn chạy hệ thống

### Yêu cầu
- **Docker** ≥ 24.0
- **Docker Compose** ≥ 2.20
- **RAM** ≥ 8GB (khuyến nghị)

### Bước 1 — Khởi động toàn bộ hệ thống

```bash
cd backend

# Build và chạy tất cả (lần đầu sẽ mất 5-10 phút)
docker-compose up --build

# Hoặc chạy nền
docker-compose up --build -d
```

### Bước 2 — Kiểm tra trạng thái

```bash
# Xem tất cả container
docker-compose ps

# Xem logs một service cụ thể
docker-compose logs -f auth-service
docker-compose logs -f payment-service
```

Mỗi service có endpoint `/health` trả về `{"status":"ok"}`.

### Bước 3 — Chạy Prisma migrate (nếu cần)

```bash
# Auth Service
docker-compose exec auth-service npx prisma migrate deploy

# Search, Order, Payment, Wallet
docker-compose exec search-service npx prisma db push
docker-compose exec order-service npx prisma db push
docker-compose exec payment-service npx prisma db push
docker-compose exec wallet-service npx prisma db push
```

---

## 🧪 Test API bằng Postman/curl

### 1. Health Check — kiểm tra mọi service hoạt động

```bash
# Qua API Gateway
curl http://localhost:3000/health

# Trực tiếp từng service
curl http://localhost:3001/health   # Auth
curl http://localhost:3002/health   # User
curl http://localhost:3003/health   # Course
curl http://localhost:3004/health   # Search
curl http://localhost:3005/health   # Order
curl http://localhost:3006/health   # Payment
curl http://localhost:3007/health   # Wallet
curl http://localhost:3008/health   # Learning
curl http://localhost:3009/health   # Certificate
curl http://localhost:3010/health   # Review
curl http://localhost:3011/health   # Notification
curl http://localhost:3012/health   # Admin
```

### 2. Đăng ký + Đăng nhập

```bash
# Đăng ký
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "Test@123456",
    "fullName": "Test Student",
    "role": "STUDENT"
  }'

# Đăng nhập → lấy token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "Test@123456"
  }'
# → Response: { "data": { "accessToken": "eyJhb..." } }
```

Lưu `accessToken` vào biến:
```bash
TOKEN="eyJhb..."
```

### 3. Tạo khóa học (Instructor)

```bash
# Đăng ký instructor
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "instructor@test.com",
    "password": "Test@123456",
    "fullName": "Test Instructor",
    "role": "INSTRUCTOR"
  }'

# Đăng nhập lấy token instructor
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "instructor@test.com", "password": "Test@123456"}'

INSTRUCTOR_TOKEN="eyJhb..."

# Tạo khóa học
curl -X POST http://localhost:3000/api/v1/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -d '{
    "title": "Node.js Microservices",
    "description": "Khóa học xây dựng hệ thống microservices",
    "price": 500000,
    "topicId": "web-dev"
  }'
```

### 4. Tìm kiếm

```bash
curl "http://localhost:3000/api/v1/search?keyword=Node&sortBy=price_asc"
```

### 5. Mua khóa học (Flow đầy đủ)

```bash
# Thêm vào giỏ
curl -X POST http://localhost:3000/api/v1/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"courseId": "COURSE_ID_HERE"}'

# Xem giỏ hàng
curl http://localhost:3000/api/v1/cart \
  -H "Authorization: Bearer $TOKEN"

# Checkout (dùng MOCK provider tự động thành công)
curl -X POST http://localhost:3000/api/v1/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"paymentProvider": "MOCK"}'

# Xem enrollment
curl http://localhost:3000/api/v1/learning/my-courses \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Kiểm tra Notification

```bash
# Xem thông báo (sẽ có ORDER_PAID + COURSE_ENROLLED)
curl http://localhost:3000/api/v1/notifications \
  -H "Authorization: Bearer $TOKEN"

# Số chưa đọc
curl http://localhost:3000/api/v1/notifications/unread-count \
  -H "Authorization: Bearer $TOKEN"

# Đọc tất cả
curl -X PUT http://localhost:3000/api/v1/notifications/read-all \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Đánh giá & Ví

```bash
# Tạo review
curl -X POST http://localhost:3000/api/v1/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"courseId": "COURSE_ID", "rating": 5, "comment": "Tuyệt vời!"}'

# Xem số dư ví instructor
curl http://localhost:3000/api/v1/wallet/balance \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN"
```

---

## 🗄 Quản trị RabbitMQ

Truy cập: http://localhost:15672
- **Username:** guest
- **Password:** guest

---

## ⚙️ Biến môi trường quan trọng

| Biến | Mô tả | Mặc định |
|---|---|---|
| `JWT_SECRET` | Secret key cho JWT | `super-secret-jwt-key...` |
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_test_...` |
| `MOMO_PARTNER_CODE` | MoMo partner code | Cần cấu hình |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Cần cấu hình |
| `PLATFORM_FEE_PERCENT` | Phí nền tảng (%) | `20` |

---

## 🛑 Dừng hệ thống

```bash
# Dừng tất cả
docker-compose down

# Dừng và xóa dữ liệu (reset hoàn toàn)
docker-compose down -v
```

---

## 📌 Lưu ý

- Lần đầu chạy, script `init-databases.sh` sẽ tự động tạo 5 database PostgreSQL
- Service Prisma (Auth, Search, Order, Payment, Wallet) sẽ tự chạy migration khi khởi động
- MOCK payment provider tự động thành công → dùng để test nhanh
- Stripe/MoMo cần cấu hình key thật trong `.env` để hoạt động
- Google Login cần `GOOGLE_CLIENT_ID` từ Google Cloud Console
