# Tài Liệu Flow Nghiệp Vụ Mua Khóa Học

## 📋 Tổng Quan

Hệ thống xử lý nghiệp vụ mua khóa học sử dụng kiến trúc microservices với 4 service chính:
- **Order Service**: Quản lý đơn hàng và giỏ hàng
- **Payment Service**: Xử lý thanh toán
- **Wallet Service**: Quản lý ví điện tử và phân chia doanh thu
- **Learning Service**: Quản lý enrollment (ghi danh khóa học)

## 🔄 Các Phương Thức Giao Tiếp

### 1. REST API
- Client → API Gateway → Services
- Sử dụng cho các thao tác CRUD cơ bản
- Port mặc định: 3005 (Order), 3006 (Payment), 3007 (Wallet), 3008 (Learning)

### 2. gRPC (Remote Procedure Call)
- Giao tiếp đồng bộ giữa các service
- Sử dụng Protocol Buffers (`.proto` files)
- Port mặc định: 50056 (Payment), 50058 (Learning)
- **Use cases:**
  - Order Service → Course Service: Lấy thông tin giá khóa học
  - Order Service → Payment Service: Tạo payment intent
  - Các service khác → Learning Service: Kiểm tra enrollment

### 3. RabbitMQ (Message Queue)
- Giao tiếp bất đồng bộ qua events
- Pattern: Publish-Subscribe
- **Events quan trọng:**
  - `payment.succeeded` - Thanh toán thành công
  - `payment.failed` - Thanh toán thất bại
  - `order.paid` - Đơn hàng đã được thanh toán
  - `topup.succeeded` - Nạp tiền thành công
  - `course.enrolled` - Ghi danh khóa học thành công
  - `course.completed` - Hoàn thành khóa học

---

## 🛒 Flow Chi Tiết: Mua Khóa Học

### Phase 1: Thêm Khóa Học Vào Giỏ Hàng

```
Client → Order Service: POST /api/v1/cart
│
├─→ Order Service → Course Service (gRPC): getCourseBasicInfo(courseId)
│   └─ Response: { courseId, title, price, instructorId }
│
└─→ Order Service: Lưu vào giỏ hàng (cart) trong database
    └─ Response: Cart đã cập nhật
```

**APIs:**
- `POST /api/v1/cart` - Thêm khóa học vào giỏ
- `GET /api/v1/cart` - Xem giỏ hàng
- `DELETE /api/v1/cart/:courseId` - Xóa khỏi giỏ

---

### Phase 2: Checkout (Thanh Toán)

```
Client → Order Service: POST /api/v1/orders/checkout
{
  "couponCode": "SALE20",
  "couponCourseId": "course_123",
  "paymentProvider": "STRIPE" // hoặc MOMO, MOCK
}
```

#### Chi Tiết Các Bước:

**Bước 1: Order Service - Validate và Tính Giá**

```javascript
// 1. Lấy giỏ hàng
const cart = await orderRepo.getCart(studentId);

// 2. Lấy giá thật từ Course Service cho từng item (qua gRPC)
for (item in cart.items) {
  priceInfo = await grpcClients.getCoursePrice({ courseId: item.courseId });
  item.originalPrice = priceInfo.salePrice || priceInfo.basePrice;
  item.finalPrice = item.originalPrice;
}

// 3. Validate và áp dụng coupon (nếu có)
if (couponCode && couponCourseId) {
  coupon = await grpcClients.validateCoupon({ courseId, code });
  // Áp dụng discount cho course cụ thể
  if (coupon.discountType === 'PERCENT') {
    discountAmount = originalPrice * discountValue / 100;
  } else {
    discountAmount = discountValue;
  }
  targetItem.finalPrice = originalPrice - discountAmount;
}

// 4. Tính tổng tiền
total = sum(items.map(i => i.finalPrice));

// 5. Tạo order trong database với status = PENDING
order = await orderRepo.createOrder({
  studentId, total, couponCode, discountAmount, items
});
```

**Bước 2: Order Service → Payment Service (gRPC)**

```javascript
// Gọi gRPC đến Payment Service để tạo payment intent
const paymentResult = await grpcClients.createPaymentIntent({
  type: 'ORDER_PAY',
  studentId,
  orderId: order.id,
  amount: total,
  currency: 'VND',
  provider: 'STRIPE', // hoặc MOMO, MOCK
  idempotencyKey: `order_${order.id}` // Đảm bảo không tạo duplicate
});

// Response từ Payment Service:
{
  paymentIntentId: "pi_xxx",
  status: "PENDING" hoặc "SUCCEEDED",
  checkoutUrl: "https://stripe.com/checkout/xxx", // URL để redirect user
  providerIntentId: "stripe_session_xxx"
}
```

**Bước 3: Payment Service - Xử Lý Payment Intent**

```javascript
// Payment Service nhận request qua gRPC
async function createPaymentIntent({ type, studentId, orderId, amount, provider, ... }) {
  
  // 1. Kiểm tra idempotency (tránh duplicate)
  existing = await paymentRepo.findByIdempotencyKey(idempotencyKey);
  if (existing) return existing;
  
  // 2. Tạo payment intent trong database
  intent = await paymentRepo.createPaymentIntent({
    type: 'ORDER_PAY',
    studentId,
    orderId,
    amount,
    provider,
    status: 'PENDING'
  });
  
  // 3. Gọi provider adapter (STRIPE, MOMO, hoặc MOCK)
  const providerAdapter = providers[provider]; // STRIPE, MOMO, MOCK
  
  // === Provider: STRIPE ===
  if (provider === 'STRIPE') {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'vnd',
          product_data: { name: `Order ${orderId}` },
          unit_amount: amount
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: 'http://localhost:3000/payment/success',
      cancel_url: 'http://localhost:3000/payment/cancel',
      metadata: { paymentIntentId: intent.id, orderId }
    });
    
    return {
      providerIntentId: session.id,
      checkoutUrl: session.url, // URL để redirect user
      autoSucceed: false // Cần webhook để confirm
    };
  }
  
  // === Provider: MOMO ===
  if (provider === 'MOMO') {
    // Tạo chữ ký HMAC-SHA256
    const signature = crypto.createHmac('sha256', MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest('hex');
    
    // Gọi API MoMo
    const response = await axios.post(MOMO_ENDPOINT + '/create', {
      partnerCode, orderId, amount, orderInfo,
      redirectUrl, ipnUrl, signature, ...
    });
    
    return {
      providerIntentId: response.data.orderId,
      checkoutUrl: response.data.payUrl, // URL thanh toán MoMo
      autoSucceed: false
    };
  }
  
  // === Provider: MOCK (Auto-succeed) ===
  if (provider === 'MOCK') {
    // Mock provider tự động thành công (dùng để test)
    return {
      providerIntentId: `mock_${uuid()}`,
      checkoutUrl: null,
      autoSucceed: true // ← Tự động thành công
    };
  }
  
  // 4. Cập nhật intent với thông tin từ provider
  await paymentRepo.updatePaymentIntentStatus(intent.id, 'PENDING', {
    providerIntentId: result.providerIntentId,
    checkoutUrl: result.checkoutUrl
  });
  
  // 5. Nếu MOCK (autoSucceed), xử lý luôn
  if (result.autoSucceed) {
    await paymentRepo.updatePaymentIntentStatus(intent.id, 'SUCCEEDED');
    
    // Publish event: payment.succeeded
    await publishEvent('payment.succeeded', {
      orderId,
      paymentIntentId: intent.id,
      studentId,
      amount
    });
  }
  
  return intent;
}
```

**Bước 4: Order Service - Xử Lý Response Từ Payment**

```javascript
// Nhận response từ Payment Service (qua gRPC)
const paymentResult = { paymentIntentId, status, checkoutUrl };

// Cập nhật order status
if (paymentResult.status === 'SUCCEEDED') {
  // Trường hợp MOCK - Thanh toán thành công ngay
  await orderRepo.updateOrderStatus(order.id, 'PAID', {
    paymentIntentId,
    paidAt: new Date()
  });
  
  // Xóa giỏ hàng
  await orderRepo.clearCart(studentId);
  
  // Publish event: order.paid
  await publishEvent('order.paid', {
    orderId: order.id,
    studentId,
    total,
    items: items.map(i => ({
      courseId: i.courseId,
      instructorId: i.instructorId,
      titleSnapshot: i.titleSnapshot,
      finalPrice: i.finalPrice
    }))
  });
  
} else {
  // Trường hợp STRIPE/MOMO - Chờ webhook
  await orderRepo.updateOrderStatus(order.id, 'PENDING', {
    paymentIntentId
  });
}

// Response về client
return {
  order: { ...order, status: paymentResult.status === 'SUCCEEDED' ? 'PAID' : 'PENDING' },
  paymentIntentId,
  checkoutUrl // Client sẽ redirect user đến URL này nếu có
};
```

---

### Phase 3: Xử Lý Webhook Từ Payment Provider

**Khi User thanh toán xong trên Stripe/MoMo:**

```
Stripe/MoMo → Payment Service: POST /api/v1/payments/webhook/:provider
│
├─→ Payment Service: Verify signature (bảo mật)
│
├─→ Payment Service: Parse event
│   ├─ Event: checkout.session.completed (Stripe)
│   └─ Event: resultCode = 0 (MoMo)
│
├─→ Payment Service: Cập nhật payment intent status = SUCCEEDED
│
└─→ Payment Service: Publish event qua RabbitMQ
    └─ Event: "payment.succeeded"
       {
         orderId,
         paymentIntentId,
         studentId,
         amount
       }
```

**Code xử lý webhook:**

```javascript
// Payment Service - Webhook Handler
async function handleWebhook(provider, body, headers) {
  
  // 1. Verify webhook từ provider
  if (provider === 'STRIPE') {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(
      body, 
      headers['stripe-signature'], 
      STRIPE_WEBHOOK_SECRET
    );
    eventType = event.type; // 'checkout.session.completed'
    data = event.data.object;
    paymentIntentId = data.metadata.paymentIntentId;
  }
  
  if (provider === 'MOMO') {
    eventType = body.resultCode === 0 ? 'payment.succeeded' : 'payment.failed';
    const extraData = JSON.parse(Buffer.from(body.extraData, 'base64'));
    paymentIntentId = extraData.paymentIntentId;
  }
  
  // 2. Tìm payment intent
  const intent = await paymentRepo.findPaymentIntentById(paymentIntentId);
  if (!intent || intent.status !== 'PENDING') return; // Đã xử lý rồi
  
  // 3. Cập nhật status và tạo transaction
  if (eventType.includes('succeeded')) {
    await paymentRepo.updatePaymentIntentStatus(intent.id, 'SUCCEEDED');
    await paymentRepo.createTransaction({
      paymentIntentId: intent.id,
      providerTxId: data.id,
      amount: intent.amount,
      status: 'SUCCEEDED'
    });
    
    // 4. Publish event
    await publishEvent('payment.succeeded', {
      orderId: intent.orderId,
      paymentIntentId: intent.id,
      studentId: intent.studentId,
      amount: intent.amount
    });
    
  } else {
    // Thanh toán thất bại
    await paymentRepo.updatePaymentIntentStatus(intent.id, 'FAILED');
    await publishEvent('payment.failed', {
      orderId: intent.orderId,
      paymentIntentId: intent.id
    });
  }
}
```

---

### Phase 4: Order Service Nhận Event "payment.succeeded"

```
RabbitMQ: payment.succeeded
│
└─→ Order Service: handlePaymentSucceeded()
    │
    ├─→ Cập nhật order status: PENDING → PAID
    │   └─ Lưu: paymentIntentId, paidAt
    │
    ├─→ Xóa giỏ hàng của student
    │
    └─→ Publish event: "order.paid"
        {
          orderId,
          studentId,
          total,
          items: [
            { courseId, instructorId, titleSnapshot, finalPrice },
            ...
          ]
        }
```

**Code:**

```javascript
// Order Service - Event Handler
async function handlePaymentSucceeded(data) {
  const { orderId, paymentIntentId, studentId, amount } = data;
  
  // 1. Tìm order
  const order = await orderRepo.findOrderById(orderId);
  if (!order || order.status === 'PAID') return; // Đã xử lý
  
  // 2. Cập nhật order
  const updated = await orderRepo.updateOrderStatus(orderId, 'PAID', {
    paymentIntentId,
    paidAt: new Date()
  });
  
  // 3. Xóa giỏ hàng
  await orderRepo.clearCart(order.studentId);
  
  // 4. Publish event: order.paid
  await publishEvent('order.paid', {
    orderId,
    studentId: order.studentId,
    total: Number(order.total),
    items: updated.items.map(i => ({
      courseId: i.courseId,
      instructorId: i.instructorId,
      titleSnapshot: i.titleSnapshot,
      finalPrice: Number(i.finalPrice)
    }))
  });
  
  logger.info(`Order ${orderId} paid via webhook`);
}
```

---

### Phase 5: Learning Service Nhận Event "order.paid"

```
RabbitMQ: order.paid
│
└─→ Learning Service: handleOrderPaid()
    │
    └─→ For each item in order.items:
        │
        ├─→ Kiểm tra enrollment đã tồn tại chưa
        │
        ├─→ Tạo Enrollment mới
        │   └─ {
        │       studentId,
        │       courseId,
        │       instructorId,
        │       titleSnapshot,
        │       status: 'ACTIVE',
        │       progressPercent: 0,
        │       enrolledAt: now
        │     }
        │
        └─→ Publish event: "course.enrolled"
            {
              studentId,
              courseId,
              title
            }
```

**Code:**

```javascript
// Learning Service - Event Handler
async function handleOrderPaid(data) {
  const { studentId, items } = data;
  
  for (const item of items) {
    // 1. Kiểm tra đã enrolled chưa
    const existing = await Enrollment.findOne({
      studentId,
      courseId: item.courseId
    });
    
    if (existing) {
      logger.warn(`Already enrolled: student=${studentId}, course=${item.courseId}`);
      continue;
    }
    
    // 2. Tạo enrollment mới
    await Enrollment.create({
      studentId,
      courseId: item.courseId,
      instructorId: item.instructorId,
      titleSnapshot: item.titleSnapshot,
      status: 'ACTIVE',
      progressPercent: 0,
      enrolledAt: new Date()
    });
    
    // 3. Publish event
    await publishEvent('course.enrolled', {
      studentId,
      courseId: item.courseId,
      title: item.titleSnapshot
    });
    
    logger.info(`Student ${studentId} enrolled in course ${item.courseId}`);
  }
}
```

---

### Phase 6: Wallet Service Nhận Event "order.paid"

```
RabbitMQ: order.paid
│
└─→ Wallet Service: handleOrderPaid()
    │
    └─→ For each item in order.items:
        │
        ├─→ Tính phí platform (mặc định 20%)
        │   platformFee = finalPrice * 20%
        │   instructorEarning = finalPrice - platformFee
        │
        └─→ Credit vào ví instructor
            └─ walletRepo.credit(
                 instructorId,
                 instructorEarning,
                 description: "Course sold: {title}",
                 type: 'INSTRUCTOR_EARNING',
                 referenceId: orderId
               )
```

**Code:**

```javascript
// Wallet Service - Event Handler
async function handleOrderPaid(data) {
  const { orderId, studentId, total, items } = data;
  const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT || 20);
  
  for (const item of items) {
    // 1. Tính earning cho instructor và platform fee
    const instructorEarning = Math.floor(
      item.finalPrice * (100 - platformFeePercent) / 100
    );
    const platformFee = item.finalPrice - instructorEarning;
    
    // 2. Credit vào ví instructor
    await walletRepo.credit(
      item.instructorId,
      instructorEarning,
      `Course sold: ${item.titleSnapshot}`,
      'INSTRUCTOR_EARNING',
      orderId
    );
    
    // 3. Tạo transaction record trong wallet
    // { userId: instructorId, amount: +instructorEarning, type: 'CREDIT', ... }
    
    logger.info(
      `Instructor ${item.instructorId} earned ${instructorEarning} ` +
      `for course ${item.courseId} (platform fee: ${platformFee})`
    );
  }
}
```

---

## 📊 Sequence Diagram Tổng Thể

```
Client          Order Service    Payment Service    Order Service    Learning Service    Wallet Service
  │                  │                  │                 │                  │                  │
  │──POST /checkout→│                  │                 │                  │                  │
  │                  │                  │                 │                  │                  │
  │                  │──gRPC: getCoursePrice()──→ Course Service             │                  │
  │                  │←─────price info──────────────────────                │                  │
  │                  │                  │                 │                  │                  │
  │                  │──gRPC: createPaymentIntent()──→    │                  │                  │
  │                  │                  │                 │                  │                  │
  │                  │                  │ (STRIPE)        │                  │                  │
  │                  │                  │──Create Session→Stripe API         │                  │
  │                  │                  │←─session.url────┘                  │                  │
  │                  │                  │                 │                  │                  │
  │                  │←─paymentIntentId, checkoutUrl──    │                  │                  │
  │                  │                  │                 │                  │                  │
  │←Response: checkoutUrl──            │                 │                  │                  │
  │                  │                  │                 │                  │                  │
  │──Redirect to Stripe──→ User pays on Stripe           │                  │                  │
  │                  │                  │                 │                  │                  │
Stripe────Webhook────────────→ Payment Service           │                  │                  │
  │                  │                  │                 │                  │                  │
  │                  │                  │──Update status→ DB                 │                  │
  │                  │                  │                 │                  │                  │
  │                  │                  │──Publish: payment.succeeded─→ RabbitMQ               │
  │                  │                  │                 │                  │                  │
  │                  │←────Subscribe────────────────payment.succeeded        │                  │
  │                  │                  │                 │                  │                  │
  │                  │──Update order status: PAID        │                  │                  │
  │                  │──Clear cart      │                 │                  │                  │
  │                  │                  │                 │                  │                  │
  │                  │──Publish: order.paid──────────→ RabbitMQ──────→ Learning Service        │
  │                  │                  │                 │                  │                  │
  │                  │                  │                 │                  │──Create Enrollment
  │                  │                  │                 │                  │──Publish: course.enrolled
  │                  │                  │                 │                  │                  │
  │                  │──Publish: order.paid──────────→ RabbitMQ──────────────────→ Wallet Service
  │                  │                  │                 │                  │                  │
  │                  │                  │                 │                  │         Credit instructor wallet
  │                  │                  │                 │                  │         Create transaction
```

---

## 🔍 Chi Tiết Các Service

### 1. Order Service

**Responsibilities:**
- Quản lý giỏ hàng (cart)
- Tạo và quản lý đơn hàng
- Tính toán giá và áp dụng coupon
- Điều phối flow thanh toán

**Database: PostgreSQL**
```sql
-- Bảng carts
carts {
  id
  studentId
  items: JSON[] // [{ courseId, titleSnapshot, priceSnapshot, instructorId }]
  createdAt
  updatedAt
}

-- Bảng orders
orders {
  id
  studentId
  total
  couponCode
  discountAmount
  status // PENDING, PAID, CANCELLED
  paymentIntentId
  paidAt
  items: JSON[] // [{ courseId, instructorId, titleSnapshot, originalPrice, finalPrice }]
  createdAt
  updatedAt
}
```

**gRPC Clients:**
- Course Service: `getCoursePrice()`, `getCourseBasicInfo()`, `validateCoupon()`
- Payment Service: `createPaymentIntent()`, `getPaymentStatus()`

**RabbitMQ:**
- **Subscribe:**
  - `payment.succeeded` → `handlePaymentSucceeded()`
  - `payment.failed` → `handlePaymentFailed()`
- **Publish:**
  - `order.paid` (after successful payment)

**REST APIs:**
```
GET    /api/v1/cart                    # Xem giỏ hàng
POST   /api/v1/cart                    # Thêm vào giỏ (body: { courseId })
DELETE /api/v1/cart/:courseId          # Xóa khỏi giỏ
POST   /api/v1/orders/checkout         # Checkout (body: { couponCode?, couponCourseId?, paymentProvider })
GET    /api/v1/orders                  # Danh sách orders (query: page, limit)
GET    /api/v1/orders/:orderId         # Chi tiết order
```

---

### 2. Payment Service

**Responsibilities:**
- Tạo payment intent
- Tích hợp với payment providers (Stripe, MoMo, Mock)
- Xử lý webhook từ providers
- Quản lý transaction history

**Database: PostgreSQL**
```sql
-- Bảng payment_intents
payment_intents {
  id
  type // TOPUP, ORDER_PAY
  studentId
  orderId
  amount
  currency
  provider // STRIPE, MOMO, MOCK
  status // PENDING, SUCCEEDED, FAILED
  providerIntentId
  checkoutUrl
  idempotencyKey // Tránh duplicate
  createdAt
  updatedAt
}

-- Bảng transactions
transactions {
  id
  paymentIntentId
  providerTxId
  amount
  status
  rawResponse: JSON
  createdAt
}

-- Bảng webhook_logs
webhook_logs {
  id
  provider
  eventType
  payload: JSON
  createdAt
}
```

**gRPC Server:**
```proto
service PaymentService {
  rpc CreatePaymentIntent(PaymentIntentRequest) returns (PaymentIntentResponse);
  rpc GetPaymentStatus(PaymentStatusRequest) returns (PaymentStatusResponse);
}
```

**RabbitMQ:**
- **Publish:**
  - `payment.succeeded` (from webhook)
  - `payment.failed` (from webhook)
  - `topup.succeeded` (for wallet top-up)

**REST APIs:**
```
POST   /api/v1/payments/topup                    # Top-up ví
POST   /api/v1/payments/order                    # Thanh toán order
GET    /api/v1/payments/:paymentIntentId         # Trạng thái payment
POST   /api/v1/payments/webhook/:provider        # Webhook endpoint (Stripe, MoMo)
```

**Payment Providers:**

| Provider | Auto-succeed | Checkout URL | Webhook Required |
|----------|--------------|--------------|-----------------|
| MOCK     | ✅ Yes       | ❌ No        | ❌ No           |
| STRIPE   | ❌ No        | ✅ Yes       | ✅ Yes          |
| MOMO     | ❌ No        | ✅ Yes       | ✅ Yes          |

---

### 3. Wallet Service

**Responsibilities:**
- Quản lý số dư ví
- Xử lý top-up (nạp tiền)
- Phân chia doanh thu cho instructor (platform fee)
- Lưu lịch sử transactions

**Database: PostgreSQL**
```sql
-- Bảng wallets
wallets {
  id
  userId
  balance // Số dư hiện tại
  createdAt
  updatedAt
}

-- Bảng wallet_transactions
wallet_transactions {
  id
  walletId
  userId
  amount
  type // CREDIT (+), DEBIT (-)
  category // TOPUP, INSTRUCTOR_EARNING, WITHDRAWAL, REFUND
  description
  referenceType // ORDER, PAYMENT_INTENT
  referenceId
  balanceBefore
  balanceAfter
  createdAt
}
```

**RabbitMQ:**
- **Subscribe:**
  - `topup.succeeded` → `handleTopupSucceeded()` (Credit student wallet)
  - `order.paid` → `handleOrderPaid()` (Credit instructor wallets)

**REST APIs:**
```
GET /api/v1/wallet/balance              # Xem số dư
GET /api/v1/wallet/transactions         # Lịch sử transactions (query: page, limit)
```

**Platform Fee:**
- Mặc định: 20% (config qua `PLATFORM_FEE_PERCENT`)
- Instructor nhận: 80%
- Platform giữ lại: 20%

**Ví dụ:**
```
Course price: 1,000,000 VND
├─ Instructor earning: 800,000 VND (80%)
└─ Platform fee:       200,000 VND (20%)
```

---

### 4. Learning Service

**Responsibilities:**
- Quản lý enrollment (ghi danh)
- Tracking tiến độ học tập
- Quản lý lesson progress
- Cấp certificate khi hoàn thành

**Database: MongoDB**
```javascript
// Collection: enrollments
{
  _id: ObjectId,
  studentId: String,
  courseId: String,
  instructorId: String,
  titleSnapshot: String,
  status: "ACTIVE" | "COMPLETED" | "CANCELLED",
  progressPercent: Number, // 0-100
  enrolledAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Collection: lesson_progress
{
  _id: ObjectId,
  studentId: String,
  courseId: String,
  lessonId: String,
  completed: Boolean,
  completedAt: Date,
  timeSpent: Number, // seconds
  createdAt: Date,
  updatedAt: Date
}
```

**gRPC Server:**
```proto
service LearningService {
  rpc HasEnrollment(EnrollmentRequest) returns (EnrollmentResponse);
  rpc GetStudentsByCourse(StudentsRequest) returns (StudentsResponse);
}
```

**RabbitMQ:**
- **Subscribe:**
  - `order.paid` → `handleOrderPaid()` (Create enrollments)
- **Publish:**
  - `course.enrolled` (after enrollment created)
  - `course.completed` (when progress reaches 100%)

**REST APIs:**
```
GET    /api/v1/learning/my-courses                      # Danh sách khóa học đã mua
GET    /api/v1/learning/courses/:courseId               # Chi tiết enrollment
GET    /api/v1/learning/courses/:courseId/progress      # Tiến độ học tập
POST   /api/v1/learning/courses/:courseId/lessons/:lessonId/complete   # Đánh dấu hoàn thành bài học
```

---

## 🎯 Edge Cases & Error Handling

### 1. Idempotency (Tránh Duplicate)
**Problem:** User click "Pay" nhiều lần
**Solution:**
```javascript
// Payment Service sử dụng idempotencyKey
idempotencyKey = `order_${orderId}`;
const existing = await paymentRepo.findByIdempotencyKey(idempotencyKey);
if (existing) {
  return existing; // Trả về payment intent cũ
}
```

### 2. Webhook Replay
**Problem:** Provider gửi webhook nhiều lần
**Solution:**
```javascript
// Kiểm tra status trước khi xử lý
if (intent.status !== 'PENDING') {
  logger.warn(`Intent already processed: ${paymentIntentId}`);
  return;
}
```

### 3. Already Enrolled
**Problem:** User mua lại khóa học đã có
**Solution:**
```javascript
// Learning Service check trước khi tạo enrollment
const existing = await Enrollment.findOne({ studentId, courseId });
if (existing) {
  logger.warn('Already enrolled');
  continue; // Skip
}
```

### 4. Payment Failed
**Flow:**
```
1. Payment webhook → payment.failed event
2. Order Service subscribe → handlePaymentFailed()
3. Update order status: PENDING → CANCELLED
4. Giỏ hàng GIỮ NGUYÊN (user có thể retry)
```

### 5. Course Price Changed
**Solution:** Snapshot giá tại thời điểm checkout
```javascript
// Order lưu originalPrice và finalPrice cho từng item
items: [
  {
    courseId: "course_123",
    titleSnapshot: "Node.js Advanced",
    originalPrice: 1000000, // ← Price tại thời điểm checkout
    finalPrice: 800000       // ← Sau khi áp dụng coupon
  }
]
```

---

## 🚀 Testing Flow

### Test Case 1: Mua Khóa Học Thành Công (MOCK Provider)

```bash
# 1. Login và lấy access token
POST /api/v1/auth/login
{ "email": "student@test.com", "password": "password123" }
# → accessToken: "eyJhbGc..."

# 2. Thêm khóa học vào giỏ
POST /api/v1/cart
Headers: { Authorization: "Bearer {accessToken}" }
Body: { "courseId": "course_123" }
# → { success: true, data: { id, items: [...] } }

# 3. Checkout với MOCK provider
POST /api/v1/orders/checkout
Headers: { Authorization: "Bearer {accessToken}" }
Body: { "paymentProvider": "MOCK" }
# → {
#   order: { id, status: "PAID", total, items },
#   paymentIntentId: "pi_xxx",
#   checkoutUrl: null
# }

# 4. Kiểm tra enrollment
GET /api/v1/learning/my-courses
Headers: { Authorization: "Bearer {accessToken}" }
# → { items: [{ courseId: "course_123", status: "ACTIVE", ... }] }

# 5. Kiểm tra ví instructor
GET /api/v1/wallet/balance
Headers: { Authorization: "Bearer {instructorToken}" }
# → { balance: 800000 } // 80% của 1,000,000 VND
```

### Test Case 2: Mua Khóa Học Với Stripe

```bash
# 1-2. Same as above

# 3. Checkout với STRIPE
POST /api/v1/orders/checkout
Body: { "paymentProvider": "STRIPE" }
# → {
#   order: { id, status: "PENDING", ... },
#   paymentIntentId: "pi_xxx",
#   checkoutUrl: "https://checkout.stripe.com/pay/cs_xxx"
# }

# 4. Frontend redirect user to checkoutUrl
# User pays on Stripe → Stripe sends webhook

# 5. Polling cho order status
GET /api/v1/orders/{orderId}
# → Keep polling until status = "PAID"

# 6. Check enrollment (sau khi paid)
GET /api/v1/learning/my-courses
```

### Test Case 3: Áp Dụng Coupon

```bash
POST /api/v1/orders/checkout
Body: {
  "couponCode": "SALE20",
  "couponCourseId": "course_123",
  "paymentProvider": "MOCK"
}
# → Order với discountAmount = 200,000 VND (20%)
# → total = 800,000 VND
```

---

## 📚 Proto Files

### payment.proto
```protobuf
syntax = "proto3";
package payment;

service PaymentService {
  rpc CreatePaymentIntent(PaymentIntentRequest) returns (PaymentIntentResponse);
  rpc GetPaymentStatus(PaymentStatusRequest) returns (PaymentStatusResponse);
}

message PaymentIntentRequest {
  string type = 1;              // TOPUP, ORDER_PAY
  string studentId = 2;
  string orderId = 3;
  double amount = 4;
  string currency = 5;
  string provider = 6;          // STRIPE, MOMO, MOCK
  string idempotencyKey = 7;
}

message PaymentIntentResponse {
  string paymentIntentId = 1;
  string status = 2;            // PENDING, SUCCEEDED, FAILED
  string providerIntentId = 3;
  string checkoutUrl = 4;
}

message PaymentStatusRequest {
  string paymentIntentId = 1;
}

message PaymentStatusResponse {
  string paymentIntentId = 1;
  string status = 2;
  double amount = 3;
  string orderId = 4;
}
```

### learning.proto
```protobuf
syntax = "proto3";
package learning;

service LearningService {
  rpc HasEnrollment(EnrollmentRequest) returns (EnrollmentResponse);
  rpc GetStudentsByCourse(StudentsRequest) returns (StudentsResponse);
}

message EnrollmentRequest {
  string studentId = 1;
  string courseId = 2;
}

message EnrollmentResponse {
  bool enrolled = 1;
  string enrollmentId = 2;
  string status = 3;
}

message StudentsRequest {
  string courseId = 1;
  int32 page = 2;
  int32 limit = 3;
}

message StudentsResponse {
  repeated Student students = 1;
  int32 total = 2;
}

message Student {
  string studentId = 1;
  string enrolledAt = 2;
  int32 progressPercent = 3;
}
```

---

## 🔐 Environment Variables

### Order Service
```env
ORDER_SERVICE_PORT=3005
COURSE_SERVICE_HOST=localhost
COURSE_GRPC_PORT=50053
PAYMENT_SERVICE_HOST=localhost
PAYMENT_GRPC_PORT=50056
RABBITMQ_URL=amqp://localhost:5672
DATABASE_URL=postgresql://user:pass@localhost:5432/order_db
```

### Payment Service
```env
PAYMENT_SERVICE_PORT=3006
PAYMENT_GRPC_PORT=50056
RABBITMQ_URL=amqp://localhost:5672
DATABASE_URL=postgresql://user:pass@localhost:5432/payment_db

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# MoMo
MOMO_PARTNER_CODE=xxx
MOMO_ACCESS_KEY=xxx
MOMO_SECRET_KEY=xxx
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api

# Webhook URL (for provider callbacks)
PAYMENT_WEBHOOK_URL=https://yourdomain.com
FRONTEND_URL=http://localhost:3000
```

### Wallet Service
```env
WALLET_SERVICE_PORT=3007
RABBITMQ_URL=amqp://localhost:5672
DATABASE_URL=postgresql://user:pass@localhost:5432/wallet_db
PLATFORM_FEE_PERCENT=20
```

### Learning Service
```env
LEARNING_SERVICE_PORT=3008
LEARNING_GRPC_PORT=50058
RABBITMQ_URL=amqp://localhost:5672
MONGO_URI=mongodb://localhost:27017
```

---

## 📝 Summary

### Workflow Tổng Quan:
1. **User thêm khóa học vào giỏ** → Order Service lưu cart
2. **User checkout** → Order Service:
   - Validate giá từ Course Service (gRPC)
   - Áp dụng coupon nếu có
   - Tạo order (status: PENDING)
   - Gọi Payment Service qua gRPC
3. **Payment Service:**
   - Tạo payment intent
   - Gọi provider (Stripe/MoMo/Mock)
   - Trả về checkoutUrl hoặc auto-succeed
4. **User thanh toán:**
   - MOCK: Tự động thành công ngay
   - Stripe/MoMo: Redirect → User pays → Webhook về
5. **Payment webhook** → Publish event: `payment.succeeded`
6. **Order Service nhận event:**
   - Cập nhật order: PENDING → PAID
   - Xóa giỏ hàng
   - Publish event: `order.paid`
7. **Learning Service nhận event:**
   - Tạo enrollment cho từng khóa học
   - Publish event: `course.enrolled`
8. **Wallet Service nhận event:**
   - Chia tiền cho instructor (80%)
   - Platform giữ lại fee (20%)

### Communication Patterns:
- **REST API**: Client ↔ Services (User-facing operations)
- **gRPC**: Service ↔ Service (Synchronous, fast internal calls)
- **RabbitMQ**: Service → Service (Asynchronous events, decoupling)

---

## 🎓 Best Practices

1. **Idempotency**: Luôn sử dụng idempotency key cho payment operations
2. **Event-driven**: Dùng message queue để decouple services
3. **Snapshot data**: Lưu snapshot (giá, tên) tại thời điểm transaction
4. **Error handling**: Graceful degradation, retry logic cho gRPC/webhook
5. **Logging**: Log đầy đủ cho audit trail
6. **Transaction**: Dùng database transaction khi cần consistency
7. **Webhook security**: Verify signature từ payment providers
8. **Status check**: Always check status before processing (avoid duplicate)

---

**Last Updated:** March 10, 2026
**Version:** 1.0
**Author:** Backend Team
