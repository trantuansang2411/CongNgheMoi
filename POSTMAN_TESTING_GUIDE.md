# 🧪 Hướng Dẫn Test API Bằng Postman — Đầy Đủ

> **Base URL qua Gateway:** `http://localhost:3000`  
> **Base URL trực tiếp:** `http://localhost:<port>`  
> **Content-Type:** `application/json` (cho mọi request có body)

---

## 📋 Quy ước

- 🔓 = Không cần token (Public)
- 🔑 = Cần token (`Authorization: Bearer {{token}}`)
- 🎓 = Cần role INSTRUCTOR
- 👑 = Cần role ADMIN
- `{{variable}}` = Giá trị lấy từ response trước đó

---

## 🔧 Thiết Lập Postman

### Tạo Environment Variables
Trong Postman → Environments → tạo environment **"Backend Dev"** với các biến:

| Variable | Initial Value |
|---|---|
| `base_url` | `http://localhost:3000` |
| `student_token` | *(để trống, sẽ fill sau)* |
| `instructor_token` | *(để trống)* |
| `admin_token` | *(để trống)* |
| `course_id` | *(để trống)* |
| `section_id` | *(để trống)* |
| `lesson_id` | *(để trống)* |
| `order_id` | *(để trống)* |
| `payment_id` | *(để trống)* |
| `review_id` | *(để trống)* |
| `refresh_token` | *(để trống)* |

### Auto-save token
Trong tab **Tests** (hoặc Scripts → Post-response) của request Login, thêm:
```js
const res = pm.response.json();
if (res.success && res.data.accessToken) {
    pm.environment.set("student_token", res.data.accessToken);
    pm.environment.set("refresh_token", res.data.refreshToken);
}
```

---

## 1️⃣ AUTH SERVICE — Xác thực (`:3001`)

### 1.1 Đăng ký tài khoản (mặc định STUDENT)
🔓 **POST** `{{base_url}}/api/v1/auth/register`
```json
{
    "email": "student@test.com",
    "password": "Test@123456"
}
```
**Kết quả mong đợi:** `201 Created` với roles = `["STUDENT"]`
```json
{
    "success": true,
    "data": {
        "user": { "id": "...", "email": "student@test.com", "roles": ["STUDENT"] },
        "accessToken": "eyJhb...",
        "refreshToken": "abc123..."
    }
}
```
> Lưu `accessToken` vào biến `student_token`

**Test thêm — Email trùng:**
```json
{ "email": "student@test.com", "password": "Test@123456" }
```
**Kết quả mong đợi:** `409 Conflict` — `"Email already registered"`

**Test thêm — Thiếu field:**
```json
{ "email": "bad@test.com" }
```
**Kết quả mong đợi:** `400 Bad Request`

**Test thêm — Password quá ngắn:**
```json
{ "email": "short@test.com", "password": "123" }
```
**Kết quả mong đợi:** `400 Bad Request`

---

### 1.2 Đăng ký tài khoản thứ 2 (sẽ làm Instructor sau)
🔓 **POST** `{{base_url}}/api/v1/auth/register`
```json
{
    "email": "instructor@test.com",
    "password": "Test@123456"
}
```
**Kết quả mong đợi:** `201 Created` — roles = `["STUDENT"]` (ban đầu ai cũng là STUDENT)
> Lưu `accessToken` vào biến `instructor_token`
> Sau đó phải: **Apply Instructor** (§2.3) → **Admin duyệt** (§12) → mới có role INSTRUCTOR

---

### 1.3 Đăng ký tài khoản Admin
🔓 **POST** `{{base_url}}/api/v1/auth/register`
```json
{
    "email": "admin@test.com",
    "password": "Test@123456"
}
```
> ⚠️ Admin được tạo thủ công bằng cách thêm role ADMIN trực tiếp vào database.
> Đăng ký xong sẽ là STUDENT, cần chạy SQL:
> ```sql
> INSERT INTO account_roles (account_id, role_id)
> VALUES ('<account_id>', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14');
> ```
> Hoặc qua API nội bộ nếu có.

---

### 1.4 Đăng nhập
🔓 **POST** `{{base_url}}/api/v1/auth/login`
```json
{
    "email": "student@test.com",
    "password": "Test@123456"
}
```
**Kết quả mong đợi:** `200 OK`
```json
{
    "success": true,
    "data": {
        "accessToken": "eyJhb...",
        "refreshToken": "abc123..."
    }
}
```

**Test thêm — Sai mật khẩu:**
```json
{
    "email": "student@test.com",
    "password": "wrongpassword"
}
```
**Kết quả mong đợi:** `401 Unauthorized`

**Test thêm — Email không tồn tại:**
```json
{
    "email": "nobody@test.com",
    "password": "Test@123456"
}
```
**Kết quả mong đợi:** `401 Unauthorized` hoặc `404 Not Found`

---

### 1.5 Google Login
🔓 **POST** `{{base_url}}/api/v1/auth/google`
```json
{
    "idToken": "GOOGLE_ID_TOKEN_FROM_CLIENT"
}
```
> ⚠️ Cần `GOOGLE_CLIENT_ID` thật trong `.env`

---

### 1.6 Refresh Token
🔓 **POST** `{{base_url}}/api/v1/auth/refresh-token`
```json
{
    "refreshToken": "{{refresh_token}}"
}
```
**Kết quả mong đợi:** `200 OK` với `accessToken` mới

**Test thêm — Token không hợp lệ:**
```json
{
    "refreshToken": "invalid-token-here"
}
```
**Kết quả mong đợi:** `401 Unauthorized`

---

### 1.7 Logout
🔓 **POST** `{{base_url}}/api/v1/auth/logout`
```json
{
    "refreshToken": "{{refresh_token}}"
}
```
**Kết quả mong đợi:** `200 OK` — `"Logged out successfully"`

---

### 1.8 Quên mật khẩu
🔓 **POST** `{{base_url}}/api/v1/auth/forgot-password`
```json
{
    "email": "student@test.com"
}
```
**Kết quả mong đợi:** `200 OK` với reset token

---

### 1.9 Reset mật khẩu
🔓 **POST** `{{base_url}}/api/v1/auth/reset-password`
```json
{
    "token": "RESET_TOKEN_FROM_FORGOT_PASSWORD",
    "newPassword": "NewPass@123"
}
```

---

## 2️⃣ USER SERVICE — Profile (`:3002`)

### 2.1 Xem profile
🔑 **GET** `{{base_url}}/api/v1/users/me`

Headers:
```
Authorization: Bearer {{student_token}}
```
**Kết quả mong đợi:** `200 OK` với thông tin user

**Test thêm — Không có token:**
**GET** `{{base_url}}/api/v1/users/me` (không có Header)
**Kết quả mong đợi:** `401 Unauthorized`

**Test thêm — Token hết hạn/sai:**
```
Authorization: Bearer invalid-token-here
```
**Kết quả mong đợi:** `401 Unauthorized`

---

### 2.2 Cập nhật profile
🔑 **PUT** `{{base_url}}/api/v1/users/me`

Headers: `Authorization: Bearer {{student_token}}`
```json
{
    "fullName": "Nguyễn Văn A",
    "phone": "0901234567",
    "bio": "Tôi là học viên"
}
```
**Kết quả mong đợi:** `200 OK` với profile đã cập nhật

---

### 2.3 Đăng ký làm Instructor
🔑 **POST** `{{base_url}}/api/v1/users/instructor/apply`

Headers: `Authorization: Bearer {{instructor_token}}`
```json
{
    "headline": "Senior Developer",
    "bio": "10 năm kinh nghiệm lập trình",
    "expertise": ["Node.js", "React", "Microservices"]
}
```
**Kết quả mong đợi:** `201 Created`

---

### 2.4 Xem trạng thái đơn Instructor
🔑 **GET** `{{base_url}}/api/v1/users/instructor/application`

Headers: `Authorization: Bearer {{instructor_token}}`

---

### 2.5 Xem profile Instructor (Public)
🔓 **GET** `{{base_url}}/api/v1/users/instructor/{{instructor_user_id}}`

---

## 3️⃣ COURSE SERVICE — Khóa học (`:3003`)

### 3.1 Tạo khóa học (Instructor)
🔑🎓 **POST** `{{base_url}}/api/v1/courses`

Headers: `Authorization: Bearer {{instructor_token}}`
```json
{
    "title": "Node.js Microservices Masterclass",
    "description": "Khóa học xây dựng hệ thống microservices với Node.js, Docker, RabbitMQ",
    "price": 500000,
    "topicId": "web-development",
    "thumbnail": "https://example.com/thumbnail.jpg",
    "requirements": ["JavaScript cơ bản", "Biết dùng Terminal"],
    "objectives": ["Xây dựng microservices", "Deploy với Docker"]
}
```
**Kết quả mong đợi:** `201 Created` → Lưu `_id` hoặc `id` vào `{{course_id}}`

**Test thêm — Không có token:**
**Kết quả mong đợi:** `401 Unauthorized`

**Test thêm — Student tạo khóa học (role sai):**
Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `403 Forbidden`

---

### 3.2 Danh sách khóa học đã xuất bản (Public)
🔓 **GET** `{{base_url}}/api/v1/courses/published`

**Kết quả mong đợi:** `200 OK` với mảng courses

🔓 **GET** `{{base_url}}/api/v1/courses/published?page=1&limit=10`

---

### 3.3 Chi tiết khóa học (Public)
🔓 **GET** `{{base_url}}/api/v1/courses/{{course_id}}`

**Kết quả mong đợi:** `200 OK` với đầy đủ thông tin course

**Test thêm — ID không tồn tại:**
🔓 **GET** `{{base_url}}/api/v1/courses/000000000000000000000000`
**Kết quả mong đợi:** `404 Not Found`

---

### 3.4 Khóa học của tôi (Instructor)
🔑🎓 **GET** `{{base_url}}/api/v1/courses/instructor/mine`

Headers: `Authorization: Bearer {{instructor_token}}`

---

### 3.5 Cập nhật khóa học (Instructor)
🔑🎓 **PUT** `{{base_url}}/api/v1/courses/{{course_id}}`

Headers: `Authorization: Bearer {{instructor_token}}`
```json
{
    "title": "Node.js Microservices Masterclass (Updated)",
    "price": 399000
}
```
**Kết quả mong đợi:** `200 OK`

---

### 3.6 Submit khóa học để duyệt
🔑🎓 **POST** `{{base_url}}/api/v1/courses/{{course_id}}/submit`

Headers: `Authorization: Bearer {{instructor_token}}`

---

### 3.7 Preview khóa học
🔑🎓 **GET** `{{base_url}}/api/v1/courses/{{course_id}}/preview`

Headers: `Authorization: Bearer {{instructor_token}}`

---

### 3.8 Xóa khóa học
🔑🎓 **DELETE** `{{base_url}}/api/v1/courses/{{course_id}}`

Headers: `Authorization: Bearer {{instructor_token}}`
> ⚠️ Test sau cùng vì sẽ xóa data

---

## 3️⃣.A SECTION — Chương trong khóa học

### 3A.1 Tạo Section
🔑🎓 **POST** `{{base_url}}/api/v1/courses/{{course_id}}/sections`

Headers: `Authorization: Bearer {{instructor_token}}`
```json
{
    "title": "Chương 1: Giới thiệu Microservices",
    "order": 1
}
```
**Kết quả mong đợi:** `201 Created` → Lưu `_id` vào `{{section_id}}`

---

### 3A.2 Danh sách Section
🔓 **GET** `{{base_url}}/api/v1/courses/{{course_id}}/sections`

---

### 3A.3 Cập nhật Section
🔑🎓 **PUT** `{{base_url}}/api/v1/courses/{{course_id}}/sections/{{section_id}}`

Headers: `Authorization: Bearer {{instructor_token}}`
```json
{
    "title": "Chương 1: Tổng quan Microservices (Updated)"
}
```

---

### 3A.4 Xóa Section
🔑🎓 **DELETE** `{{base_url}}/api/v1/courses/{{course_id}}/sections/{{section_id}}`

Headers: `Authorization: Bearer {{instructor_token}}`

---

## 3️⃣.B LESSON — Bài học

### 3B.1 Tạo Lesson
🔑🎓 **POST** `{{base_url}}/api/v1/courses/{{course_id}}/sections/{{section_id}}/lessons`

Headers: `Authorization: Bearer {{instructor_token}}`
```json
{
    "title": "Bài 1: Monolith vs Microservices",
    "type": "VIDEO",
    "content": "https://example.com/video1.mp4",
    "duration": 1200,
    "order": 1,
    "isFree": true
}
```
**Kết quả mong đợi:** `201 Created` → Lưu `_id` vào `{{lesson_id}}`

---

### 3B.2 Danh sách Lesson
🔓 **GET** `{{base_url}}/api/v1/courses/{{course_id}}/sections/{{section_id}}/lessons`

---

### 3B.3 Cập nhật Lesson
🔑🎓 **PUT** `{{base_url}}/api/v1/courses/{{course_id}}/sections/{{section_id}}/lessons/{{lesson_id}}`

Headers: `Authorization: Bearer {{instructor_token}}`
```json
{
    "title": "Bài 1: Monolith vs Microservices (Cập nhật)",
    "duration": 1500
}
```

---

### 3B.4 Xóa Lesson
🔑🎓 **DELETE** `{{base_url}}/api/v1/courses/{{course_id}}/sections/{{section_id}}/lessons/{{lesson_id}}`

---

### 3B.5 Thêm Resource vào Lesson
🔑🎓 **POST** `{{base_url}}/api/v1/courses/{{course_id}}/sections/{{section_id}}/lessons/{{lesson_id}}/resources`

Headers: `Authorization: Bearer {{instructor_token}}`
```json
{
    "title": "Slide bài giảng",
    "type": "PDF",
    "url": "https://example.com/slide1.pdf"
}
```

---

### 3B.6 Danh sách Resource
🔓 **GET** `{{base_url}}/api/v1/courses/{{course_id}}/sections/{{section_id}}/lessons/{{lesson_id}}/resources`

---

### 3B.7 Xóa Resource
🔑🎓 **DELETE** `{{base_url}}/api/v1/courses/{{course_id}}/sections/{{section_id}}/lessons/{{lesson_id}}/resources/{{resource_id}}`

---

## 3️⃣.C COUPON — Mã giảm giá

### 3C.1 Tạo Coupon
🔑🎓 **POST** `{{base_url}}/api/v1/courses/{{course_id}}/coupons`

Headers: `Authorization: Bearer {{instructor_token}}`
```json
{
    "code": "SUMMER2024",
    "discountPercent": 30,
    "maxUses": 100,
    "expiresAt": "2025-12-31T23:59:59.000Z"
}
```
**Kết quả mong đợi:** `201 Created`

---

### 3C.2 Danh sách Coupon
🔑🎓 **GET** `{{base_url}}/api/v1/courses/{{course_id}}/coupons`

Headers: `Authorization: Bearer {{instructor_token}}`

---

### 3C.3 Xóa Coupon
🔑🎓 **DELETE** `{{base_url}}/api/v1/courses/{{course_id}}/coupons/{{coupon_id}}`

Headers: `Authorization: Bearer {{instructor_token}}`

---

## 4️⃣ SEARCH SERVICE — Tìm kiếm (`:3004`)

### 4.1 Tìm kiếm khóa học
🔓 **GET** `{{base_url}}/api/v1/search?keyword=Node`

**Kết quả mong đợi:** `200 OK` với danh sách course matching

### 4.2 Tìm kiếm nâng cao
🔓 **GET** `{{base_url}}/api/v1/search?keyword=Node&topicId=web-development&minPrice=0&maxPrice=1000000&sortBy=price_asc&page=1&limit=10`

### 4.3 Tìm kiếm không kết quả
🔓 **GET** `{{base_url}}/api/v1/search?keyword=xyznotexist`
**Kết quả mong đợi:** `200 OK` với mảng rỗng

### 4.4 Lọc theo giá
🔓 **GET** `{{base_url}}/api/v1/search?minPrice=100000&maxPrice=500000`

### 4.5 Sort theo rating
🔓 **GET** `{{base_url}}/api/v1/search?sortBy=rating_desc`

---

## 5️⃣ ORDER SERVICE — Đơn hàng (`:3005`)

### 5.1 Thêm vào giỏ hàng
🔑 **POST** `{{base_url}}/api/v1/cart`

Headers: `Authorization: Bearer {{student_token}}`
```json
{
    "courseId": "{{course_id}}"
}
```
**Kết quả mong đợi:** `200 OK` hoặc `201 Created`

**Test thêm — Thêm trùng:**
```json
{
    "courseId": "{{course_id}}"
}
```
**Kết quả mong đợi:** `409 Conflict` — `"Course already in cart"`

---

### 5.2 Xem giỏ hàng
🔑 **GET** `{{base_url}}/api/v1/cart`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK` với danh sách items trong giỏ

---

### 5.3 Xóa khỏi giỏ hàng
🔑 **DELETE** `{{base_url}}/api/v1/cart/{{course_id}}`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK`

---

### 5.4 Checkout (Thanh toán giỏ hàng)
🔑 **POST** `{{base_url}}/api/v1/checkout`

Headers: `Authorization: Bearer {{student_token}}`
```json
{
    "paymentProvider": "MOCK"
}
```
**Kết quả mong đợi:** `200 OK` với `orderId` và `paymentIntentId`

> ℹ️ Dùng `"paymentProvider": "MOCK"` để test nhanh (auto thành công)  
> Dùng `"STRIPE"` hoặc `"MOMO"` cần key thật

**Test thêm — Giỏ rỗng:**
**Kết quả mong đợi:** `400 Bad Request` — `"Cart is empty"`

**Test thêm — Có mã giảm giá:**
```json
{
    "paymentProvider": "MOCK",
    "couponCode": "SUMMER2024"
}
```

---

### 5.5 Danh sách đơn hàng
🔑 **GET** `{{base_url}}/api/v1/orders`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK` → Lưu `id` đơn hàng vào `{{order_id}}`

---

### 5.6 Chi tiết đơn hàng
🔑 **GET** `{{base_url}}/api/v1/orders/{{order_id}}`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK` với status `"PAID"` (nếu dùng MOCK)

---

## 6️⃣ PAYMENT SERVICE — Thanh toán (`:3006`)

### 6.1 Nạp tiền ví (Top-up)
🔑 **POST** `{{base_url}}/api/v1/payments/topup`

Headers: `Authorization: Bearer {{student_token}}`
```json
{
    "amount": 1000000,
    "provider": "MOCK"
}
```
**Kết quả mong đợi:** `200 OK` với `paymentIntentId`

**Test thêm — Số tiền âm:**
```json
{
    "amount": -100,
    "provider": "MOCK"
}
```
**Kết quả mong đợi:** `400 Bad Request`

---

### 6.2 Thanh toán đơn hàng
🔑 **POST** `{{base_url}}/api/v1/payments/order`

Headers: `Authorization: Bearer {{student_token}}`
```json
{
    "orderId": "{{order_id}}",
    "provider": "MOCK"
}
```
**Kết quả mong đợi:** `200 OK` → Lưu `id` vào `{{payment_id}}`

---

### 6.3 Trạng thái thanh toán
🔑 **GET** `{{base_url}}/api/v1/payments/{{payment_id}}/status`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK` với status `"SUCCEEDED"` (MOCK provider)

---

### 6.4 Webhook (Stripe/MoMo callback)
🔓 **POST** `{{base_url}}/api/v1/payments/webhook/stripe`
```json
{
    "type": "payment_intent.succeeded",
    "data": {
        "object": {
            "id": "pi_xxx",
            "status": "succeeded"
        }
    }
}
```
> ⚠️ Webhook thực tế cần đúng format và signature từ provider

---

## 7️⃣ WALLET SERVICE — Ví điện tử (`:3007`)

### 7.1 Xem số dư
🔑 **GET** `{{base_url}}/api/v1/wallet/balance`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK` với `balance`

🔑 **GET** `{{base_url}}/api/v1/wallet/balance`
Headers: `Authorization: Bearer {{instructor_token}}`
**Kết quả mong đợi:** `200 OK` — sau khi student mua khóa, instructor sẽ có earnings

---

### 7.2 Lịch sử giao dịch
🔑 **GET** `{{base_url}}/api/v1/wallet/transactions`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK` với mảng transactions

🔑 **GET** `{{base_url}}/api/v1/wallet/transactions?page=1&limit=5`

---

## 8️⃣ LEARNING SERVICE — Học tập (`:3008`)

> ⚠️ Trước khi test phần này, student phải đã mua khóa học (qua Cart → Checkout → Order PAID)

### 8.1 Khóa học đã đăng ký
🔑 **GET** `{{base_url}}/api/v1/learning/enrollments`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK` với danh sách courses đã enrolled

**Test thêm — Student chưa mua gì:**
(Tạo account mới, login, thử)
**Kết quả mong đợi:** `200 OK` với mảng rỗng

---

### 8.2 Cập nhật tiến độ
🔑 **POST** `{{base_url}}/api/v1/learning/{{course_id}}/progress`

Headers: `Authorization: Bearer {{student_token}}`
```json
{
    "lessonId": "{{lesson_id}}",
    "completed": true,
    "watchedSeconds": 1200
}
```
**Kết quả mong đợi:** `200 OK` với thông tin progress

---

### 8.3 Xem tiến độ theo khóa
🔑 **GET** `{{base_url}}/api/v1/learning/{{course_id}}/progress`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK` với danh sách lessons đã hoàn thành

---

## 9️⃣ CERTIFICATE SERVICE — Chứng chỉ (`:3009`)

> ⚠️ Chứng chỉ tự động tạo khi student hoàn thành 100% khóa học

### 9.1 Danh sách chứng chỉ
🔑 **GET** `{{base_url}}/api/v1/certificates`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK` với mảng certificates (có thể rỗng nếu chưa hoàn thành)

---

### 9.2 Xác minh chứng chỉ (Public)
🔓 **GET** `{{base_url}}/api/v1/certificates/verify/{{certificate_id}}`

**Kết quả mong đợi:** `200 OK` với thông tin chứng chỉ hoặc `404`

---

## 🔟 REVIEW SERVICE — Đánh giá (`:3010`)

> ⚠️ Student phải đã enrolled khóa học trước khi review

### 10.1 Tạo đánh giá
🔑 **POST** `{{base_url}}/api/v1/reviews`

Headers: `Authorization: Bearer {{student_token}}`
```json
{
    "courseId": "{{course_id}}",
    "rating": 5,
    "comment": "Khóa học rất hay, giảng viên nhiệt tình!"
}
```
**Kết quả mong đợi:** `201 Created` → Lưu `_id` vào `{{review_id}}`

**Test thêm — Rating ngoài khoảng:**
```json
{
    "courseId": "{{course_id}}",
    "rating": 6,
    "comment": "Test"
}
```
**Kết quả mong đợi:** `400 Bad Request`

**Test thêm — Thiếu rating:**
```json
{
    "courseId": "{{course_id}}",
    "comment": "Không có rating"
}
```
**Kết quả mong đợi:** `400 Bad Request`

---

### 10.2 Sửa đánh giá
🔑 **PUT** `{{base_url}}/api/v1/reviews/{{review_id}}`

Headers: `Authorization: Bearer {{student_token}}`
```json
{
    "rating": 4,
    "comment": "Cập nhật: Khóa học tốt nhưng cần thêm bài tập"
}
```
**Kết quả mong đợi:** `200 OK`

---

### 10.3 Xóa đánh giá
🔑 **DELETE** `{{base_url}}/api/v1/reviews/{{review_id}}`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK`

---

### 10.4 Đánh giá theo khóa học (Public)
🔓 **GET** `{{base_url}}/api/v1/reviews/course/{{course_id}}`

**Kết quả mong đợi:** `200 OK` với danh sách reviews

🔓 **GET** `{{base_url}}/api/v1/reviews/course/{{course_id}}?page=1&limit=10`

---

### 10.5 Thống kê đánh giá (Public)
🔓 **GET** `{{base_url}}/api/v1/reviews/course/{{course_id}}/stats`

**Kết quả mong đợi:** `200 OK` với `averageRating`, `totalReviews`, breakdown theo sao

---

## 1️⃣1️⃣ NOTIFICATION SERVICE — Thông báo (`:3011`)

### 11.1 Danh sách thông báo
🔑 **GET** `{{base_url}}/api/v1/notifications`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK` với mảng notifications

🔑 **GET** `{{base_url}}/api/v1/notifications?page=1&limit=20`

---

### 11.2 Số thông báo chưa đọc
🔑 **GET** `{{base_url}}/api/v1/notifications/unread-count`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK` với `{ "count": N }`

---

### 11.3 Đánh dấu đã đọc (1 thông báo)
🔑 **PUT** `{{base_url}}/api/v1/notifications/{{notification_id}}/read`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK`

---

### 11.4 Đọc tất cả
🔑 **PUT** `{{base_url}}/api/v1/notifications/read-all`

Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `200 OK`

**Xác minh:** Gọi lại `unread-count` → phải trả `0`

---

## 1️⃣2️⃣ ADMIN SERVICE — Quản trị (`:3012`)

> ⚠️ Cần account với role `ADMIN` (phải thêm thủ công vào DB, xem §1.3)

### 12.1 Xem thông tin khóa học
🔑👑 **GET** `{{base_url}}/api/v1/admin/courses/{{course_id}}`

Headers: `Authorization: Bearer {{admin_token}}`
**Kết quả mong đợi:** `200 OK`

**Test thêm — Student gọi admin API:**
Headers: `Authorization: Bearer {{student_token}}`
**Kết quả mong đợi:** `403 Forbidden`

---

### 12.2 Duyệt xuất bản khóa học
🔑👑 **POST** `{{base_url}}/api/v1/admin/courses/{{course_id}}/publish`

Headers: `Authorization: Bearer {{admin_token}}`
**Kết quả mong đợi:** `200 OK`

---

### 12.3 Ẩn khóa học
🔑👑 **POST** `{{base_url}}/api/v1/admin/courses/{{course_id}}/hide`

Headers: `Authorization: Bearer {{admin_token}}`
**Kết quả mong đợi:** `200 OK`

---

### 12.4 ✅ Duyệt đơn đăng ký Instructor (MỚI)
🔑👑 **POST** `{{base_url}}/api/v1/admin/instructors/{{instructor_user_id}}/approve`

Headers: `Authorization: Bearer {{admin_token}}`
**Kết quả mong đợi:** `200 OK` — `"Instructor xxx approved successfully"`
> Sau khi approve, user sẽ có thêm role `INSTRUCTOR` trong JWT khi login lại.

**Xác minh:** Instructor login lại → check response có roles chứa `INSTRUCTOR`

---

### 12.5 ❌ Từ chối đơn đăng ký Instructor (MỚI)
🔑👑 **POST** `{{base_url}}/api/v1/admin/instructors/{{instructor_user_id}}/reject`

Headers: `Authorization: Bearer {{admin_token}}`
**Kết quả mong đợi:** `200 OK` — `"Instructor application xxx rejected"`

---

### 12.6 Cấm Instructor
🔑👑 **POST** `{{base_url}}/api/v1/admin/instructors/{{instructor_user_id}}/ban`

Headers: `Authorization: Bearer {{admin_token}}`
**Kết quả mong đợi:** `200 OK`

---

### 12.7 Mở cấm Instructor
🔑👑 **POST** `{{base_url}}/api/v1/admin/instructors/{{instructor_user_id}}/unban`

Headers: `Authorization: Bearer {{admin_token}}`
**Kết quả mong đợi:** `200 OK`

---

## 🏥 HEALTH CHECK — Kiểm tra tất cả services

| Service | URL | Kết quả |
|---|---|---|
| API Gateway | `GET http://localhost:3000/health` | `{"status":"ok","service":"api-gateway"}` |
| Auth | `GET http://localhost:3001/health` | `{"status":"ok","service":"auth-service"}` |
| User | `GET http://localhost:3002/health` | `{"status":"ok","service":"user-service"}` |
| Course | `GET http://localhost:3003/health` | `{"status":"ok","service":"course-service"}` |
| Search | `GET http://localhost:3004/health` | `{"status":"ok","service":"search-service"}` |
| Order | `GET http://localhost:3005/health` | `{"status":"ok","service":"order-service"}` |
| Payment | `GET http://localhost:3006/health` | `{"status":"ok","service":"payment-service"}` |
| Wallet | `GET http://localhost:3007/health` | `{"status":"ok","service":"wallet-service"}` |
| Learning | `GET http://localhost:3008/health` | `{"status":"ok","service":"learning-service"}` |
| Certificate | `GET http://localhost:3009/health` | `{"status":"ok","service":"certificate-service"}` |
| Review | `GET http://localhost:3010/health` | `{"status":"ok","service":"review-service"}` |
| Notification | `GET http://localhost:3011/health` | `{"status":"ok","service":"notification-service"}` |
| Admin | `GET http://localhost:3012/health` | `{"status":"ok","service":"admin-service"}` |

---

## 🔄 Kịch bản test End-to-End (E2E Flow)

### Flow 1: Trở thành Instructor (⭐ PHẢI CHẠY TRƯỚC)
```
1. POST /auth/register (email: instructor@test.com) → roles: ["CUSTOMER", "STUDENT"]
2. POST /auth/register (email: admin@test.com) → roles: ["CUSTOMER", "STUDENT"]
3. INSERT role ADMIN vào DB cho admin account (xem §1.3)
4. POST /auth/login (admin) → Lấy admin_token
5. PUT /users/me (instructor) → Cập nhật profile
6. POST /users/instructor/apply (instructor) → Nộp đơn
7. POST /admin/instructors/:userId/approve (admin) → Duyệt
8. POST /auth/login (instructor) → Login lại → Lấy instructor_token mới CÓ role INSTRUCTOR
```

### Flow 2: Instructor tạo khóa học
```
1. Hoàn thành Flow 1
2. POST /courses (instructor) → Lấy course_id
3. POST /courses/:id/sections → Lấy section_id
4. POST /courses/:id/sections/:id/lessons → Lấy lesson_id
5. POST /courses/:id/submit (instructor) → Nộp duyệt
6. POST /admin/courses/:id/publish (admin) → Duyệt xuất bản
```

### Flow 3: Student mua khóa học
```
1. POST /auth/register (email: student@test.com) → Lấy student_token
2. Hoàn thành Flow 2 (đã có khóa học published)
3. POST /cart (student, courseId)
4. GET /cart → Verify có course
5. POST /checkout (MOCK provider) → Lấy order_id
6. GET /orders/:id → Verify status = "PAID"
7. GET /learning/enrollments → Verify có course
8. GET /notifications → Verify có thông báo mua hàng
```

### Flow 4: Student học và nhận chứng chỉ
```
1. Hoàn thành Flow 3
2. POST /learning/:courseId/progress (complete lesson 1)
3. POST /learning/:courseId/progress (complete lesson 2...)
4. GET /learning/:courseId/progress → Verify 100%
5. GET /certificates → Verify có chứng chỉ
6. GET /certificates/verify/:id → Verify chứng chỉ hợp lệ
```

### Flow 5: Review sau khi mua
```
1. Hoàn thành Flow 3
2. POST /reviews (rating: 5) → Lấy review_id  
3. GET /reviews/course/:courseId → Verify có review
4. GET /reviews/course/:courseId/stats → Verify stats
5. PUT /reviews/:id (rating: 4) → Cập nhật
6. GET /search?keyword=... → Verify rating đã cập nhật
```

### Flow 6: Admin quản lý
```
1. GET /admin/courses/:id → Xem course
2. POST /admin/courses/:id/hide → Ẩn
3. GET /search?keyword=... → Verify course biến mất
4. POST /admin/courses/:id/publish → Hiện lại
5. POST /admin/instructors/:id/ban → Cấm instructor
6. POST /admin/instructors/:id/unban → Mở cấm
```

### Flow 5: Ví và nạp tiền
```
1. GET /wallet/balance → Verify balance = 0
2. POST /payments/topup (1000000, MOCK)
3. GET /wallet/balance → Verify balance = 1000000
4. GET /wallet/transactions → Verify có giao dịch CREDIT
5. POST /checkout (MOCK) → Mua khóa
6. GET /wallet/balance (instructor) → Verify có earnings
```

---

## ⚠️ Lưu ý khi test

1. **Thứ tự test**: Chạy theo Flow E2E ở trên để đảm bảo data phụ thuộc nhau
2. **MOCK provider**: Luôn dùng `"MOCK"` khi test thanh toán — nó auto succeed
3. **Stripe/MoMo**: Cần key thật trong `.env`, không test được trên local nếu không có
4. **Google Login**: Cần `GOOGLE_CLIENT_ID` thật + idToken từ Google
5. **Token hết hạn**: Mặc định `1h` — nếu hết hạn, gọi refresh-token hoặc login lại
6. **Reset data**: Dùng `docker-compose down -v` rồi `docker-compose up --build` để reset hoàn toàn
