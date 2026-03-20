# FRONTEND AI IMPLEMENTATION GUIDE

Tài liệu này dùng để prompt AI tạo giao diện frontend bám sát backend microservices hiện tại.
Mục tiêu là giảm refactor, tránh lệch field, và tránh bug khi nối API qua API Gateway.
## Tech Stack Foundation
- Core: React 18,TypeScript , Vite
- Styling: Tailwind CSS (Sử dụng utility classes)
- UI Components: Shadcn UI (Radix Primitives)
- State Management: Zustand (cho global store)
- Data Fetching: Axios + TanStack React Query v5
- Routing: React Router v6
- Form Validation: React Hook Form + Zod

## 1. Scope

- Base API: `/api/v1/*` qua API Gateway.
- Response envelope chuẩn:

```ts
type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    stack?: string; // chỉ có thể xuất hiện ở dev
  };
};

type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

- Header auth:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

## 1.1 Frontend Architecture Blueprint (Bắt buộc)

Trước khi generate UI, AI phải tạo cấu trúc thư mục rõ ràng để tách UI khỏi data và phân quyền route.

```txt
src/
  services/            # hoac api/ core/
    httpClient.ts
    interceptors.ts
    auth.service.ts
    course.service.ts
    order.service.ts
    payment.service.ts
    learning.service.ts
    review.service.ts
    wallet.service.ts
    notification.service.ts
  components/          # shared/dumb UI components
    ui/
      Button.tsx
      Input.tsx
      Modal.tsx
      Table.tsx
      EmptyState.tsx
      ErrorState.tsx
      LoadingSkeleton.tsx
  routes/
    index.tsx
    ProtectedRoute.tsx
    RoleGuard.tsx
  store/
    auth.store.ts
    session.store.ts
    ui.store.ts
  layouts/
    PublicLayout.tsx
    AuthLayout.tsx
    LearningLayout.tsx
    DashboardLayout.tsx
```

### services/ (hoac api/core) - Tram trung chuyen du lieu

- Chua toan bo HTTP calls, khong viet request truc tiep trong page/component.
- Co `httpClient` trung tam voi `baseURL` tro toi API Gateway.
- Co request interceptor de dinh kem `Authorization` token.
- Co response interceptor de:
  - xu ly refresh token khi het han
  - map loi 401/403/500 ve `UiError`
  - phat thong bao loi toan cuc khi can

### components/ (Shared UI) - Design System

- Chiua dumb components, khong goi API, khong chua business logic.
- Components chi nhan props va render UI.
- Toan bo theme, color token, spacing, typography duoc dung nhat quan.

### routes/ - Dieu huong va phan quyen

- Dinh nghia route map + route guard.
- Bat buoc co `ProtectedRoute` de chan nguoi chua dang nhap.
- Bat buoc co `RoleGuard` de kiem soat `STUDENT/INSTRUCTOR/ADMIN`.
- Bat buoc lazy load page-level routes de giam initial bundle.

### store/ (Global state)

- Chiua state dung chung toan app, khong chua feature state chi cuc bo.
- Toi thieu gom:
  - auth/session state (user, token, roles)
  - ui state chung (theme, sidebar open, locale)
- Feature state (cart, review draft, checkout form) dat trong feature modules.

### layouts/ - Bo khung trinh bay

- Chia layout theo nhom trang:
  - `PublicLayout`
  - `AuthLayout`
  - `LearningLayout`
  - `DashboardLayout`
- Page nghiep vu chi render noi dung, khong lap lai shell/header/sidebar.

### Definition check cho architecture

Mot frontend duoc xem la dat architecture baseline khi:

- Co day du 5 nhom: `services`, `components`, `routes`, `store`, `layouts`.
- Khong co API call truc tiep trong shared components.
- Khong co role-check rải rác trong page ma khong qua route guard.
- Co lazy loading cho route cap page.
- Co global store cho auth/session va UI state chung.

## 2. Non-Negotiable Rules (Bắt buộc)

### Rule 1: Define Data Contract trước khi generate UI

AI phải tạo model TypeScript trước.

```ts
type Course = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  salePrice?: number;
  instructorId?: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'HIDDEN';
};
```

### Rule 2: UI chỉ bind vào Frontend Model

Component chỉ đọc field đã normalize.
Không bind trực tiếp field thô backend như `_id` hay tên lẫn lộn.

### Rule 3: Naming Convention thống nhất

- Dùng camelCase.
- Dùng tên tổng quát: `title`, `description`, `thumbnail`, `createdAt`.
- Không dùng naming backend-specific trong component props.

### Rule 4: Tách component theo data shape

Không tạo một page component quá lớn.
Mỗi data contract có component rõ ràng.

Ví dụ:

- `CourseCard`
- `CourseList`
- `CourseFilter`
- `OrderSummary`
- `ReviewList`

### Rule 5: State rõ ràng cho mọi page

Bắt buộc có:

- Loading state (skeleton/spinner)
- Empty state
- Error state
- Success feedback (toast/banner)

### Rule 6: API-ready list

Mọi danh sách có phân trang phải support:

- `page`
- `limit`
- `total`

Hiển thị tổng bản ghi khi backend trả `total`.

### Rule 7: Event-driven UI

Mọi hành động phải define event + side effect:

- `onClickAddToCart` -> `POST /api/v1/cart`
- `onSubmitCheckout` -> `POST /api/v1/checkout`
- `onSubmitReview` -> `POST /api/v1/reviews`

### Rule 8: Normalize ID duy nhất

Do backend có nơi trả `id`, có nơi trả `_id`, cần normalize:

```ts
const normalizeId = (item: any) => item.id ?? item._id ?? '';
```

### Rule 9: Không hardcode role logic ở UI

UI chỉ dùng role từ token/user profile:

- `STUDENT`
- `INSTRUCTOR`
- `ADMIN`

Nếu thiếu quyền, frontend vẫn hiển thị thông báo thân thiện khi gặp `401/403`.

### Rule 10: Không trust dữ liệu tính toán từ client

- Progress học tập: không tự tính total lessons ở client để gửi lên server.
- Checkout amount: luôn hiển thị amount từ backend trả về.

## 3. Frontend Models Khuyến nghị

```ts
type User = {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  bio?: string;
  roles: Array<'STUDENT' | 'INSTRUCTOR' | 'ADMIN'>;
};

type Pagination<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

type CartItem = {
  courseId: string;
  titleSnapshot: string;
  priceSnapshot: number;
  instructorId?: string | null;
};

type Cart = {
  studentId: string;
  items: CartItem[];
  updatedAt?: string;
};

type OrderItem = {
  courseId: string;
  instructorId?: string | null;
  titleSnapshot: string;
  originalPrice?: number;
  finalPrice: number;
};

type Order = {
  id: string;
  studentId: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  total: number;
  paymentIntentId?: string | null;
  paidAt?: string | null;
  items: OrderItem[];
  createdAt?: string;
};

type CheckoutResult = {
  order: Order;
  paymentIntentId: string;
  checkoutUrl: string | null;
};

type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

type LearningEnrollment = {
  id: string;
  studentId: string;
  courseId: string;
  instructorId?: string;
  titleSnapshot: string;
  status: 'ACTIVE' | 'COMPLETED';
  progressPercent: number;
  enrolledAt?: string;
  completedAt?: string;
};

type LessonProgress = {
  lessonId: string;
  completed: boolean;
  completedAt?: string;
  watchTimeSec?: number;
};

type Review = {
  id: string;
  studentId: string;
  courseId: string;
  rating: number;
  comment: string;
  status?: 'ACTIVE' | 'HIDDEN';
  createdAt?: string;
  updatedAt?: string;
};

type ReviewStats = {
  ratingAvg: number;
  ratingCount: number;
};

type Certificate = {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentId?: string;
  certificateNo: string;
  verificationUrl?: string;
  issuedAt?: string;
};

type WalletBalance = {
  balance: number;
  currency?: string;
};

type WalletTransaction = {
  id: string;
  amount: number;
  type: 'TOPUP' | 'ORDER_PAY' | 'EARNING' | 'WITHDRAWAL';
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  description?: string;
  createdAt?: string;
};

type NotificationItem = {
  id: string;
  title?: string;
  message: string;
  read: boolean;
  createdAt?: string;
};
```

## 4. API Client Rules

- Tạo 1 `apiClient` chung xử lý:
  - inject token
  - parse `ApiResponse<T>`
  - convert lỗi thành dạng dùng cho UI
- Tạo mapper mỗi domain:
  - `mapCourseResponse`
  - `mapOrderResponse`
  - `mapReviewResponse`

```ts
type UiError = {
  status?: number;
  code: string;
  message: string;
};
```

Map lỗi tối thiểu:

- `401` -> yêu cầu đăng nhập
- `403` -> không đủ quyền
- `404` -> không tìm thấy dữ liệu
- `409` -> xung đột dữ liệu (vd đã review rồi)
- `500` -> lỗi hệ thống

## 5. Route Map cho Frontend

- `/` Home
- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/search`
- `/courses/:courseId`
- `/cart`
- `/checkout`
- `/payment/result`
- `/learning`
- `/learning/:courseId`
- `/wallet`
- `/orders`, `/orders/:orderId`
- `/certificates`, `/certificates/verify/:certificateId`
- `/notifications`
- `/instructor/*`
- `/admin/*`

## 6. Page-by-Page Rules

## 6.1 Home + Search

API:

- `GET /api/v1/courses/published`
- `GET /api/v1/search?keyword=&topicId=&minPrice=&maxPrice=&sortBy=`

Components:

- `HeroBanner`
- `CourseFilter`
- `CourseGrid`
- `CourseCard`

State rules:

- Loading: skeleton card grid
- Empty: "Không tìm thấy khóa học phù hợp"
- Error: retry button

Event rules:

- `onSearchSubmit` -> update query params + call search API
- `onClickCourseCard` -> navigate course detail

## 6.2 Course Detail

API:

- `GET /api/v1/courses/:courseId`
- `GET /api/v1/courses/:courseId/sections`
- `GET /api/v1/reviews/course/:courseId?page=1&limit=10`
- `GET /api/v1/reviews/course/:courseId/stats`

Components:

- `CourseHero`
- `BuyBox`
- `CurriculumPreview`
- `ReviewSummary`
- `ReviewList`

Event rules:

- `onClickAddToCart` -> `POST /api/v1/cart`
- `onClickBuyNow` -> add cart (nếu cần) rồi chuyển checkout

Validation rules:

- Không cho submit review ở trang này nếu chưa enroll (điều kiện business, có thể kiểm bằng enrollments).

## 6.3 Cart

API:

- `GET /api/v1/cart`
- `POST /api/v1/cart`
- `DELETE /api/v1/cart/:courseId`

Components:

- `CartItemRow`
- `CartSummary`
- `CouponInput`

State rules:

- Empty cart cần CTA về trang khám phá khóa học.

Event rules:

- `onRemoveItem(courseId)` -> delete cart item
- `onApplyCoupon` chỉ lưu local state coupon, backend validate ở checkout

## 6.4 Checkout

API:

- `POST /api/v1/checkout`

Body contract:

```ts
type CheckoutPayload = {
  paymentProvider: 'MOCK' | 'STRIPE' | 'MOMO';
  couponCode?: string;
  couponCourseId?: string;
};
```

Rules:

- Disable submit khi đang xử lý.
- Chống double-submit bằng lock UI và idempotent UX.
- Nếu `checkoutUrl` có giá trị -> redirect provider.
- Nếu provider `MOCK` có thể nhận ngay trạng thái `PAID`.

Error-specific UI:

- `Cart is empty` -> hiện banner và nút quay lại `/cart`.
- `Invalid coupon` -> highlight coupon field.

## 6.5 Payment Result + Order Tracking

API:

- `GET /api/v1/payments/:paymentIntentId/status`
- `GET /api/v1/orders/:orderId`

Rules:

- Poll trạng thái payment theo chu kỳ ngắn (2-5s) tối đa 60-90s.
- Nếu `SUCCEEDED` -> điều hướng về `learning` hoặc order detail.
- Nếu `FAILED` -> hiển thị retry CTA.

## 6.6 Orders

API:

- `GET /api/v1/orders?page=&limit=`
- `GET /api/v1/orders/:orderId`

Components:

- `OrderTable`
- `OrderStatusBadge`
- `OrderDetailDrawer`

Rules:

- Dùng màu trạng thái nhất quán:
  - `PENDING` = warning
  - `PAID` = success
  - `CANCELLED` = danger

## 6.7 Learning Dashboard

API:

- `GET /api/v1/learning/my-courses?page=&limit=`
- `GET /api/v1/learning/enrollments`

Components:

- `LearningCourseCard`
- `ProgressBar`
- `ContinueLearningButton`

Rules:

- Progress lấy từ backend (`progressPercent`), không tự tính từ client list lessons.

## 6.8 Course Player

API:

- `GET /api/v1/learning/enrollments/:courseId`
- `GET /api/v1/learning/:courseId/progress`
- `POST /api/v1/learning/:courseId/complete` body `{ lessonId }`
- `POST /api/v1/learning/:courseId/watch-session` body `{ lessonId, deltaWatchSec }`
- `GET /api/v1/courses/:courseId/sections`
- `GET /api/v1/courses/:courseId/sections/:sectionId/lessons`

Rules:

- Heartbeat watch-time gửi mỗi ~30s.
- Cap gửi client-side `deltaWatchSec <= 35` để khớp anti-cheat server.
- Chỉ cho gọi complete khi có `lessonId` hợp lệ.
- UI hoàn thành khóa học dựa trên enrollment `status === 'COMPLETED'`.

## 6.9 Reviews

API:

- `POST /api/v1/reviews`
- `PUT /api/v1/reviews/:reviewId`
- `DELETE /api/v1/reviews/:reviewId`
- `GET /api/v1/reviews/course/:courseId?page=&limit=`
- `GET /api/v1/reviews/course/:courseId/stats`

Rules:

- Rating chỉ nhận `1..5`.
- Khi gặp `409` với message đã review -> chuyển sang mode edit review.
- Sau create/update/delete phải refresh list + stats.

## 6.10 Certificates

API:

- `GET /api/v1/certificates`
- `GET /api/v1/certificates/verify/:certificateId`

Compatibility rule quan trọng:

- Backend verify hiện lookup theo `certificateId` (Mongo ObjectId).
- Không dùng `certificateNo` cho route verify cho đến khi backend đổi contract.

Components:

- `CertificateCard`
- `VerifyCertificateResult`

States:

- Verify success: badge `Valid`
- Verify fail (404): badge `Invalid / Not found`

## 6.11 Wallet

API:

- `GET /api/v1/wallet/balance`
- `GET /api/v1/wallet/transactions?page=&limit=`
- `POST /api/v1/payments/topup`

Rules:

- Mọi số tiền hiển thị phải format currency VND.
- Sau topup thành công phải refetch balance + transactions.

## 6.12 Notifications

API:

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `PUT /api/v1/notifications/:notificationId/read`
- `PUT /api/v1/notifications/read-all`

Rules:

- Optimistic UI cho mark read nhưng phải rollback nếu API fail.
- Badge unread count luôn sync với server sau thao tác read/read-all.

## 6.13 Profile + Instructor Apply

API:

- `GET /api/v1/users/me`
- `PUT /api/v1/users/me`
- `POST /api/v1/users/instructor/apply`
- `GET /api/v1/users/instructor/application`
- `GET /api/v1/users/instructor/:userId`

Rules:

- Form profile có validation tối thiểu trước submit.
- Màn instructor application cần state `PENDING | APPROVED | REJECTED`.

## 6.14 Instructor Dashboard

API chính:

- `GET /api/v1/courses/instructor/mine`
- `POST /api/v1/courses`
- `PUT /api/v1/courses/:courseId`
- `DELETE /api/v1/courses/:courseId`
- `POST /api/v1/courses/:courseId/submit`
- Section/Lesson/Coupon CRUD theo course

Rules:

- Tách màn hình thành modules: CourseInfo, Curriculum, Coupons.
- Không gửi field rỗng không cần thiết khi update.
- Sau reorder section/lesson phải refetch để đồng bộ thứ tự thật từ backend.

## 6.15 Admin Dashboard

API:

- `GET /api/v1/admin/applications`
- `GET /api/v1/admin/courses/submitted`
- `GET /api/v1/admin/courses/:courseId/review-detail`
- `POST /api/v1/admin/courses/:courseId/publish`
- `POST /api/v1/admin/courses/:courseId/needs-fixes`
- `POST /api/v1/admin/instructors/:userId/approve`
- `POST /api/v1/admin/instructors/:userId/reject`
- `POST /api/v1/admin/instructors/:userId/ban`
- `POST /api/v1/admin/instructors/:userId/unban`

Rules:

- Mọi action destructive phải có confirmation modal.
- Sau moderation action phải invalidate list query.

## 7. Layout Rules

- Public layout:
  - Header: logo, search, cart, notifications, auth menu
  - Footer: legal + help
- Learning layout:
  - Top progress bar + lesson sidebar + content area
- Dashboard layout:
  - Sidebar cố định + breadcrumb + content

Responsive:

- Mobile <= 768: sidebar chuyển drawer
- Tablet: 2 cột card
- Desktop: 3-4 cột card

## 8. Prompt Template cho AI Generate UI

Dùng prompt khung sau để giảm bug:

```txt
Build a production-ready frontend page for [PAGE_NAME] using React + TypeScript.

Hard constraints:
1) Define and use TypeScript data contracts first.
2) API response follows { success: boolean, data?: T, error?: { code, message } }.
3) Use camelCase normalized frontend models.
4) Include loading, empty, error, and success states.
5) Support pagination (page, limit, total) where list endpoint provides it.
6) Every user action must map to a concrete API endpoint and payload.
7) Avoid backend-specific raw fields in UI components; add mapping layer.

Page API contracts:
- [LIST ENDPOINTS]
- [DETAIL ENDPOINTS]
- [ACTION ENDPOINTS]

Required components:
- [COMPONENT A]
- [COMPONENT B]

Required events:
- onLoad
- onSubmit...
- onClick...

Return:
- Page container
- Reusable components
- API client functions
- Mapper functions
- Error handling and toasts
```

## 9. Definition of Done

Một page được coi là done khi đạt đủ:

- Có model TS và mapper từ API raw -> frontend model
- Không dùng field raw backend trực tiếp trong JSX
- Đủ 4 state: loading/empty/error/success
- Đã bind đúng endpoint, method, payload
- Có xử lý 401/403/404/409/500
- Có responsive cơ bản
- Có test tay flow chính không lỗi console
