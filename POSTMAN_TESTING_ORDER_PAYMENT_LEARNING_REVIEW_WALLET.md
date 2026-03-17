# Postman API Test Guide (Order, Payment, Learning, Review, Wallet)

Base URL (Gateway): `{{base_url}}` (example: `http://localhost:3000`)

## 1. Environment Variables
Use the environment variables you already have:

- `base_url`
- `student_token`
- `instructor_token`
- `admin_token`
- `course_id`
- `section_id`
- `lesson_id`
- `order_id`
- `payment_id`
- `review_id`
- `refresh_token`

## 2. Common Headers
For authenticated endpoints:

- `Authorization: Bearer {{student_token}}`
- `Content-Type: application/json`

## 3. Suggested Collection Structure
Create 5 folders in one Postman collection:

1. `Order`
2. `Payment`
3. `Wallet`
4. `Learning`
5. `Review`

## 4. ORDER SERVICE
Service routes are exposed via gateway as:

- `GET /api/v1/cart`
- `POST /api/v1/cart`
- `DELETE /api/v1/cart/:courseId`
- `POST /api/v1/checkout`
- `GET /api/v1/orders`
- `GET /api/v1/orders/:orderId`

### 4.1 Add course to cart
`POST {{base_url}}/api/v1/cart`

Body:
```json
{
  "courseId": "{{course_id}}"
}
```

Expected:

- Status `200`
- `success = true`
- `data.courseId = {{course_id}}`

Note:

- API currently uses upsert for cart item, so adding same course again is not `409`; it updates existing item.

### 4.2 Get cart
`GET {{base_url}}/api/v1/cart`

Expected:

- Status `200`
- `data.items` is array

### 4.3 Remove from cart
`DELETE {{base_url}}/api/v1/cart/{{course_id}}`

Expected:

- Status `200`
- `success = true`

### 4.4 Checkout
`POST {{base_url}}/api/v1/checkout`

Body (quick test with mock provider):
```json
{
  "paymentProvider": "MOCK"
}
```

Body (with coupon):
```json
{
  "paymentProvider": "MOCK",
  "couponCode": "SUMMER2024",
  "couponCourseId": "{{course_id}}"
}
```

Expected:

- Status `201`
- `data.order.id` exists
- `data.paymentIntentId` exists
- With `MOCK`, order status is usually `PAID` immediately

Post-response script (save IDs):
```javascript
pm.test('Checkout returns order + payment intent', function () {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body.success).to.eql(true);
  pm.expect(body.data).to.have.property('order');
  pm.expect(body.data.order).to.have.property('id');
  pm.expect(body.data).to.have.property('paymentIntentId');

  pm.environment.set('order_id', body.data.order.id);
  pm.environment.set('payment_id', body.data.paymentIntentId);
});
```

Negative case:

- Cart empty -> Status `400`, message usually `Cart is empty`.

### 4.5 Get my orders
`GET {{base_url}}/api/v1/orders?page=1&limit=20`

Expected:

- Status `200`
- `data.items` is array

### 4.6 Get order detail
`GET {{base_url}}/api/v1/orders/{{order_id}}`

Expected:

- Status `200`
- `data.id = {{order_id}}`

Negative case:

- Another user token querying this order -> `404` (`Order not found`).

## 5. PAYMENT SERVICE
Service routes via gateway:

- `POST /api/v1/payments/topup`
- `POST /api/v1/payments/order`
- `GET /api/v1/payments/:paymentIntentId/status`
- `POST /api/v1/payments/webhook/:provider`

### 5.1 Wallet topup
`POST {{base_url}}/api/v1/payments/topup`

Body:
```json
{
  "amount": 100000,
  "currency": "VND",
  "provider": "MOCK",
  "idempotencyKey": "topup-{{course_id}}-1"
}
```

Expected:

- Status `201`
- `data.id` exists
- `data.status` is usually `SUCCEEDED` for `MOCK`

Optional script (save payment id from topup):
```javascript
pm.test('Topup created', function () {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body.success).to.eql(true);
  pm.environment.set('payment_id', body.data.id);
});
```

### 5.2 Pay order
`POST {{base_url}}/api/v1/payments/order`

Body:
```json
{
  "orderId": "{{order_id}}",
  "amount": 100000,
  "currency": "VND",
  "provider": "MOCK",
  "idempotencyKey": "order-pay-{{order_id}}"
}
```

Expected:

- Status `201`
- `data.id` exists
- `data.type = ORDER_PAY`

Important:

- `amount` should match order total in practice.

### 5.3 Payment status
`GET {{base_url}}/api/v1/payments/{{payment_id}}/status`

Expected:

- Status `200`
- `data.id = {{payment_id}}`
- `data.status` in `PENDING | SUCCEEDED | FAILED`

### 5.4 Webhook endpoint (manual test)
`POST {{base_url}}/api/v1/payments/webhook/momo`

Expected:

- Usually `200` with `{ "received": true }` if payload valid
- Can return `400` for invalid payload/signature depending on provider

## 6. WALLET SERVICE
Service routes via gateway:

- `GET /api/v1/wallet/balance`
- `GET /api/v1/wallet/transactions`

### 6.1 Get wallet balance
`GET {{base_url}}/api/v1/wallet/balance`

Expected:

- Status `200`
- `data.balance` is number

### 6.2 Get transactions
`GET {{base_url}}/api/v1/wallet/transactions?page=1&limit=20`

Expected:

- Status `200`
- `data.items` is array

## 7. LEARNING SERVICE
Service routes via gateway:

- `GET /api/v1/learning/enrollments`
- `GET /api/v1/learning/enrollments/:courseId`
- `GET /api/v1/learning/my-courses`
- `GET /api/v1/learning/:courseId/progress`
- `POST /api/v1/learning/:courseId/complete`
- `POST /api/v1/learning/:courseId/watch-session` *(mới)*

Precondition:

- Student phải mua khoá học trước (checkout + event `order.paid` được xử lý).
- Course phải được publish (event `course.published` → `CourseSnapshot` đã được lưu trong learning-service).

### 7.1 Get enrollments
`GET {{base_url}}/api/v1/learning/enrollments`

Expected:

- Status `200`
- `data.items` chứa danh sách khoá học đã ghi danh, có `courseId` trùng với khoá đã mua

### 7.2 Get one enrollment
`GET {{base_url}}/api/v1/learning/enrollments/{{course_id}}`

Expected:

- Status `200` nếu đã ghi danh
- `404` nếu chưa ghi danh

### 7.3 Mark lesson complete
`POST {{base_url}}/api/v1/learning/{{course_id}}/complete`

Body:
```json
{
  "lessonId": "{{lesson_id}}"
}
```

Note:

- `totalLessons` được lấy từ `CourseSnapshot` (lưu local trong learning-service, **không còn gọi gRPC** đến course-service).
- Idempotent: gọi nhiều lần cùng `lessonId` thì `progressPercent` không thay đổi.

Expected:

- Status `200`
- `data.progressPercent` là số nguyên 0–100
- `data.completed` là `true` nếu đã hoàn thành khoá học (cần đủ cả 2 điều kiện: lesson ≥ 90% + watch time ≥ 70%)

Negative cases:

- `lessonId` bỏ trống → `400`
- Chưa ghi danh → `404`
- `CourseSnapshot` chưa tồn tại (khoá học chưa publish) → `404 Course structure not found`

### 7.4 Record watch session (heartbeat)
`POST {{base_url}}/api/v1/learning/{{course_id}}/watch-session`

Mô tả: Client gọi mỗi ~30 giây khi người dùng đang xem video để cộng dồn thời gian xem thực tế. Sau khi tích lũy đủ watch time, hệ thống tự động kiểm tra và đánh dấu hoàn thành khoá học.

Body:
```json
{
  "lessonId": "{{lesson_id}}",
  "deltaWatchSec": 30
}
```

Anti-cheat rules (server-side):

- `deltaWatchSec` bị **cap tối đa 35 giây** — gửi 100s vẫn chỉ được cộng 35s
- Sử dụng `$inc` atomic — không race condition dù nhiều request đồng thời

Expected (bình thường):

- Status `200`
- `data.recorded` = số giây thực tế được cộng (≤ 35)

Negative cases:

- `deltaWatchSec <= 0` → `400`
- `lessonId` thiếu → `400`
- Chưa ghi danh → `404`

Test script (kiểm tra cap 35s):
```javascript
pm.test('Watch session recorded with cap', function () {
  pm.response.to.have.status(200);
  const body = pm.response.json();
  pm.expect(body.success).to.eql(true);
  pm.expect(body.data.recorded).to.be.at.most(35);
});
```

### 7.5 Get course progress
`GET {{base_url}}/api/v1/learning/{{course_id}}/progress`

Expected:

- Status `200`
- `data` là array các lesson progress, mỗi item có `lessonId`, `completed`, `watchTimeSec`, `lastHeartbeatAt`

### 7.6 Course completion logic (chống gian lận)
Khoá học được tự động đánh dấu `COMPLETED` khi **đồng thời** thoả mãn:

1. **Lesson progress ≥ 90%** (số bài đã `markLessonComplete` / `totalLessons`)
2. **Watch time ≥ 70% tổng thời lượng** (tổng `watchTimeSec` từ các heartbeat / `totalDurationSec` của khoá học)

Kiểm tra hoàn thành được trigger sau mỗi lần `markLessonComplete` hoặc `watch-session`. Khi đủ điều kiện:

- `Enrollment.status` → `COMPLETED`
- Event `course.completed` được publish

Test scenario hoàn thành khoá học:
1. Mark tất cả (hoặc ≥ 90%) bài học complete qua `POST /complete`
2. Gọi `POST /watch-session` đủ số lần để `totalWatchSec ≥ totalDurationSec × 0.7`
3. Gọi `GET /enrollments/{{course_id}}` → `data.status = "COMPLETED"`



## 8. REVIEW SERVICE
Service routes via gateway:

- `POST /api/v1/reviews`
- `PUT /api/v1/reviews/:reviewId`
- `DELETE /api/v1/reviews/:reviewId`
- `GET /api/v1/reviews/course/:courseId`
- `GET /api/v1/reviews/course/:courseId/stats`

### 8.1 Create review
`POST {{base_url}}/api/v1/reviews`

Body:
```json
{
  "courseId": "{{course_id}}",
  "rating": 5,
  "comment": "Great course"
}
```

Expected:

- Status `201`
- `data._id` exists

Post-response script (save review id):
```javascript
pm.test('Create review success', function () {
  pm.response.to.have.status(201);
  const body = pm.response.json();
  pm.expect(body.success).to.eql(true);
  pm.expect(body.data).to.have.property('_id');
  pm.environment.set('review_id', body.data._id);
});
```

Negative cases:

- `rating` outside `1..5` -> `400`
- Review same course twice by same user -> `409` (`You have already reviewed this course`)

### 8.2 Update review
`PUT {{base_url}}/api/v1/reviews/{{review_id}}`

Body:
```json
{
  "rating": 4,
  "comment": "Updated comment"
}
```

Expected:

- Status `200`
- `data._id = {{review_id}}`

### 8.3 Delete review
`DELETE {{base_url}}/api/v1/reviews/{{review_id}}`

Expected:

- Status `200`
- `data.deleted = true`

### 8.4 Get reviews by course
`GET {{base_url}}/api/v1/reviews/course/{{course_id}}?page=1&limit=10`

Expected:

- Status `200`
- `data.items` is array

### 8.5 Get review stats
`GET {{base_url}}/api/v1/reviews/course/{{course_id}}/stats`

Expected:

- Status `200`
- Current response fields are `ratingAvg` and `ratingCount`

## 9. End-to-End Smoke Flow (Recommended)
Run this sequence in Postman:

1. `POST /api/v1/cart` (add `course_id`)
2. `POST /api/v1/checkout` with `MOCK` (save `order_id`, `payment_id`)
3. `GET /api/v1/orders/{{order_id}}` (verify `PAID` when MOCK)
4. `GET /api/v1/learning/enrollments` (verify course appears)
5. `POST /api/v1/learning/{{course_id}}/complete` (mark one lesson)
6. `POST /api/v1/reviews` (save `review_id`)
7. `GET /api/v1/reviews/course/{{course_id}}/stats`
8. `POST /api/v1/payments/topup` with `MOCK`
9. `GET /api/v1/wallet/balance`
10. `GET /api/v1/wallet/transactions`

## 10. Debug Checklist
If a test fails, check:

- Service health endpoints:
- `http://localhost:3005/health`
- `http://localhost:3006/health`
- `http://localhost:3007/health`
- `http://localhost:3008/health`
- `http://localhost:3010/health`
- Gateway health: `http://localhost:3000/health`
- Token is valid and not expired (`student_token`)
- `course_id`, `order_id`, `payment_id`, `review_id` are set correctly in environment
- RabbitMQ is running (needed for enrollment and wallet event updates)
