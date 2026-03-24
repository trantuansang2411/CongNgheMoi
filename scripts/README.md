# Core Seed Scripts

This folder contains centralized seed scripts at the same level as service folders.

## Script

- `seed-core-services.js`

## What it seeds

1. `auth-service`
- 7 accounts total
- 4 students, 2 instructors, 1 admin
- Roles are upserted: `STUDENT`, `INSTRUCTOR`, `ADMIN`

2. `user-service`
- `user_profiles` for all 7 accounts
- `instructor_profiles` for 2 instructors

3. `course-service`
- Upserts around 20 courses (default: 20) from `course-service/seed-courses.json`
- Re-maps all courses to the 2 seeded instructors
- Replaces curriculum (`sections`, `lessons`) for seeded course IDs

4. `learning-service`
- Upserts `course_snapshots` to mirror `course.published` projection

5. `review-service`
- Upserts deterministic reviews from 4 students on seeded courses

6. `search-service`
- Upserts `course_index` to mirror `course.published` projection
- Includes rating stats computed from seeded reviews

## Run

From `CongNgheMoi` root:

```bash
node scripts/seed-core-services.js
```

## Environment variables (optional)

- `MONGO_URI` (default: `mongodb://localhost:27017`)
- `SEED_AUTH_DATABASE_URL` (default: `postgresql://postgres:postgres123@localhost:5432/auth_db?schema=public`)
- `SEED_SEARCH_DATABASE_URL` (default: `postgresql://postgres:postgres123@localhost:5432/search_db?schema=public`)
- `SEED_DEFAULT_PASSWORD` (default: `password123`)
- `SEED_TOTAL_COURSES` (default: `20`)

## Seeded test accounts

- admin.seed@example.com (ADMIN)
- instructor1.seed@example.com (INSTRUCTOR)
- instructor2.seed@example.com (INSTRUCTOR)
- student1.seed@example.com (STUDENT)
- student2.seed@example.com (STUDENT)
- student3.seed@example.com (STUDENT)
- student4.seed@example.com (STUDENT)

All accounts use the same password from `SEED_DEFAULT_PASSWORD`.
