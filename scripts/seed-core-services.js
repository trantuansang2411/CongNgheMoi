#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const ROOT_DIR = path.resolve(__dirname, '..');

function serviceRequire(serviceName) {
  return createRequire(path.join(ROOT_DIR, serviceName, 'package.json'));
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function stripBom(text) {
  return typeof text === 'string' ? text.replace(/^\uFEFF/, '') : text;
}

function formatMoney(v) {
  return Math.round(toNumber(v, 0));
}

function getEnv(name, fallback) {
  return process.env[name] || fallback;
}

const CONFIG = {
  mongoUri: getEnv('MONGO_URI', 'mongodb://localhost:27017'),
  authDbUrl: getEnv('SEED_AUTH_DATABASE_URL', 'postgresql://postgres:postgres123@localhost:5432/auth_db?schema=public'),
  searchDbUrl: getEnv('SEED_SEARCH_DATABASE_URL', 'postgresql://postgres:postgres123@localhost:5432/search_db?schema=public'),
  defaultPassword: getEnv('SEED_DEFAULT_PASSWORD', 'password123'),
  totalCourses: toNumber(getEnv('SEED_TOTAL_COURSES', 20), 20),
};

const ACCOUNTS = [
  { key: 'admin1', email: 'admin@example.com', role: 'ADMIN', fullName: 'Admin Seed', kind: 'ADMIN' },
  { key: 'instructor1', email: 'ins1@example.com', role: 'INSTRUCTOR', fullName: 'Lê Hữu Đạt', kind: 'INSTRUCTOR' },
  { key: 'instructor2', email: 'ins2@example.com', role: 'INSTRUCTOR', fullName: 'Nguyễn Công Tuấn', kind: 'INSTRUCTOR' },
  { key: 'student1', email: 'stu1@example.com', role: 'STUDENT', fullName: 'Mai Hoàng Tuấn', kind: 'STUDENT' },
  { key: 'student2', email: 'stu2@example.com', role: 'STUDENT', fullName: 'Trần Tuấn Sang', kind: 'STUDENT' },
  { key: 'student3', email: 'stu3@example.com', role: 'STUDENT', fullName: 'Huy Trọng Béo Ú', kind: 'STUDENT' },
  { key: 'student4', email: 'stu4@example.com', role: 'STUDENT', fullName: 'Student Four', kind: 'STUDENT' },
];

async function seedAuth() {
  const authRequire = serviceRequire('auth-service');
  const bcrypt = authRequire('bcryptjs');
  const { PrismaClient } = authRequire('@prisma/client');

  process.env.DATABASE_URL = CONFIG.authDbUrl;
  const prisma = new PrismaClient();

  try {
    console.log('[auth] Seeding roles and accounts...');

    const roleMap = {};
    for (const roleName of ['ADMIN', 'INSTRUCTOR', 'STUDENT']) {
      roleMap[roleName] = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
    }

    const passwordHash = await bcrypt.hash(CONFIG.defaultPassword, 10);
    const accountsByKey = {};

    for (const fixture of ACCOUNTS) {
      const account = await prisma.account.upsert({
        where: { email: fixture.email },
        update: {
          status: 'ACTIVE',
          provider: 'LOCAL',
          passwordHash,
        },
        create: {
          email: fixture.email,
          passwordHash,
          provider: 'LOCAL',
          status: 'ACTIVE',
        },
      });

      await prisma.accountRole.upsert({
        where: {
          accountId_roleId: {
            accountId: account.id,
            roleId: roleMap[fixture.role].id,
          },
        },
        update: {},
        create: {
          accountId: account.id,
          roleId: roleMap[fixture.role].id,
        },
      });

      accountsByKey[fixture.key] = {
        ...fixture,
        id: account.id,
      };
    }

    console.log(`[auth] Done. Seeded ${Object.keys(accountsByKey).length} accounts.`);
    return accountsByKey;
  } finally {
    await prisma.$disconnect();
  }
}

async function seedUser(accountsByKey) {
  const userRequire = serviceRequire('user-service');
  const mongoose = userRequire('mongoose');

  const userProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    phone: { type: String, default: '' },
    bio: { type: String, default: '' },
  }, { timestamps: true, collection: 'user_profiles' });

  const instructorProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    headline: { type: String, default: '' },
    payoutInfo: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
    },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  }, { timestamps: true, collection: 'instructor_profiles' });

  await mongoose.connect(`${CONFIG.mongoUri}/user_db`);

  try {
    console.log('[user] Upserting user profiles and instructor profiles...');

    const UserProfile = mongoose.model('SeedUserProfile', userProfileSchema, 'user_profiles');
    const InstructorProfile = mongoose.model('SeedInstructorProfile', instructorProfileSchema, 'instructor_profiles');

    for (const account of Object.values(accountsByKey)) {
      const name = account.fullName || account.email.split('@')[0];
      await UserProfile.updateOne(
        { userId: account.id },
        {
          $set: {
            userId: account.id,
            fullName: name,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            phone: '',
            bio: `${name} seeded profile`,
          },
        },
        { upsert: true }
      );

      if (account.kind === 'INSTRUCTOR') {
        await InstructorProfile.updateOne(
          { userId: account.id },
          {
            $set: {
              userId: account.id,
              displayName: name,
              headline: 'Software Engineering Instructor',
              payoutInfo: {
                bankName: 'Vietcombank',
                accountNumber: `1000${account.id.replace(/-/g, '').slice(0, 8)}`,
                accountHolder: name.toUpperCase(),
              },
              status: 'ACTIVE',
            },
          },
          { upsert: true }
        );
      }
    }

    console.log('[user] Done.');
  } finally {
    await mongoose.disconnect();
  }
}

function normalizeSeedCourse(rawCourse, idx, instructor) {
  const now = new Date();
  const sections = toArray(rawCourse.sections).map((section, sectionIdx) => ({
    sectionId: section.sectionId,
    title: section.title || `Section ${sectionIdx + 1}`,
    orderIndex: toNumber(section.orderIndex, sectionIdx),
    lessons: toArray(section.lessons).map((lesson, lessonIdx) => ({
      lessonId: lesson.lessonId,
      title: lesson.title || `Lesson ${lessonIdx + 1}`,
      orderIndex: toNumber(lesson.orderIndex, lessonIdx),
      durationSec: toNumber(lesson.durationSec, 0),
      isPreview: Boolean(lesson.isPreview),
      videoUrl: lesson.videoUrl || '',
    })),
  }));

  const lessonList = sections.flatMap((s) => s.lessons.map((l) => ({ ...l, sectionId: s.sectionId })));
  const totalDurationSec = lessonList.reduce((sum, l) => sum + toNumber(l.durationSec, 0), 0);

  return {
    courseId: rawCourse.courseId,
    title: rawCourse.title,
    slug: rawCourse.slug,
    description: rawCourse.description || '',
    objectives: toArray(rawCourse.objectives),
    requirements: toArray(rawCourse.requirements),
    outcomes: toArray(rawCourse.outcomes),
    topicId: rawCourse.topicId || '',
    thumbnailUrl: rawCourse.thumbnailUrl || '',
    basePrice: formatMoney(rawCourse.basePrice),
    salePrice: formatMoney(rawCourse.salePrice),
    currency: rawCourse.currency || 'VND',
    status: 'PUBLISHED',
    instructorId: instructor.id,
    instructorName: instructor.fullName,
    submittedAt: rawCourse.submittedAt ? new Date(rawCourse.submittedAt) : now,
    publishedAt: rawCourse.publishedAt ? new Date(rawCourse.publishedAt) : now,
    totalSections: sections.length,
    totalLessons: lessonList.length,
    totalDurationSec,
    sections,
  };
}

async function seedCourse(accountsByKey) {
  const courseRequire = serviceRequire('course-service');
  const mongoose = courseRequire('mongoose');

  const courseSchema = new mongoose.Schema({
    courseId: { type: String, unique: true, index: true },
    instructorId: { type: String, required: true, index: true },
    title: String,
    slug: String,
    description: String,
    objectives: [{ type: String }],
    requirements: [{ type: String }],
    outcomes: [{ type: String }],
    topicId: String,
    thumbnailUrl: String,
    basePrice: Number,
    salePrice: Number,
    currency: String,
    status: String,
    submittedAt: Date,
    publishedAt: Date,
    totalSections: Number,
    totalLessons: Number,
    totalDurationSec: Number,
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    instructorName: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
  }, { timestamps: true, collection: 'courses' });

  const sectionSchema = new mongoose.Schema({
    courseId: { type: String, index: true },
    sectionId: { type: String, unique: true, index: true },
    title: String,
    orderIndex: Number,
  }, { timestamps: true, collection: 'sections' });

  const lessonSchema = new mongoose.Schema({
    courseId: { type: String, index: true },
    sectionId: { type: String, index: true },
    lessonId: { type: String, unique: true, index: true },
    title: String,
    orderIndex: Number,
    videoUrl: String,
    durationSec: Number,
    isPreview: Boolean,
  }, { timestamps: true, collection: 'lessons' });

  const instructorCacheSchema = new mongoose.Schema({
    instructorId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, default: '' },
  }, { timestamps: true, collection: 'instructor_profiles' });

  const sourcePath = path.join(ROOT_DIR, 'course-service', 'seed-courses.json');
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const source = JSON.parse(stripBom(raw));

  const instructorA = accountsByKey.instructor1;
  const instructorB = accountsByKey.instructor2;
  const mappedInstructors = [instructorA, instructorB];

  const pickedCourses = toArray(source.courses).slice(0, CONFIG.totalCourses);
  const preparedCourses = pickedCourses.map((course, idx) => {
    const inst = mappedInstructors[idx % mappedInstructors.length];
    return normalizeSeedCourse(course, idx, inst);
  });

  await mongoose.connect(`${CONFIG.mongoUri}/course_db`);

  try {
    console.log(`[course] Upserting ${preparedCourses.length} courses with curriculum...`);

    const Course = mongoose.model('SeedCourse', courseSchema, 'courses');
    const Section = mongoose.model('SeedSection', sectionSchema, 'sections');
    const Lesson = mongoose.model('SeedLesson', lessonSchema, 'lessons');
    const InstructorCache = mongoose.model('SeedInstructorCache', instructorCacheSchema, 'instructor_profiles');

    for (const inst of mappedInstructors) {
      await InstructorCache.updateOne(
        { instructorId: inst.id },
        { $set: { instructorId: inst.id, displayName: inst.fullName } },
        { upsert: true }
      );
    }

    for (const course of preparedCourses) {
      await Section.deleteMany({ courseId: course.courseId });
      await Lesson.deleteMany({ courseId: course.courseId });

      const sectionDocs = [];
      const lessonDocs = [];

      for (const section of course.sections) {
        sectionDocs.push({
          courseId: course.courseId,
          sectionId: section.sectionId,
          title: section.title,
          orderIndex: section.orderIndex,
        });

        for (const lesson of section.lessons) {
          lessonDocs.push({
            courseId: course.courseId,
            sectionId: section.sectionId,
            lessonId: lesson.lessonId,
            title: lesson.title,
            orderIndex: lesson.orderIndex,
            videoUrl: lesson.videoUrl,
            durationSec: lesson.durationSec,
            isPreview: lesson.isPreview,
          });
        }
      }

      if (sectionDocs.length > 0) {
        await Section.insertMany(sectionDocs, { ordered: false });
      }
      if (lessonDocs.length > 0) {
        await Lesson.insertMany(lessonDocs, { ordered: false });
      }

      await Course.updateOne(
        { courseId: course.courseId },
        {
          $set: {
            courseId: course.courseId,
            instructorId: course.instructorId,
            title: course.title,
            slug: course.slug,
            description: course.description,
            objectives: course.objectives,
            requirements: course.requirements,
            outcomes: course.outcomes,
            topicId: course.topicId,
            thumbnailUrl: course.thumbnailUrl,
            basePrice: course.basePrice,
            salePrice: course.salePrice,
            currency: course.currency,
            status: 'PUBLISHED',
            submittedAt: course.submittedAt,
            publishedAt: course.publishedAt,
            totalSections: course.totalSections,
            totalLessons: course.totalLessons,
            totalDurationSec: course.totalDurationSec,
            deletedAt: null,
            instructorName: course.instructorName,
          },
        },
        { upsert: true }
      );
    }

    console.log('[course] Done.');
    return preparedCourses;
  } finally {
    await mongoose.disconnect();
  }
}

async function seedLearning(coursePayloads) {
  const learningRequire = serviceRequire('learning-service');
  const mongoose = learningRequire('mongoose');

  const courseSnapshotSchema = new mongoose.Schema({
    courseId: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: '' },
    slug: { type: String, default: '' },
    instructorId: { type: String, default: '' },
    totalLessons: { type: Number, default: 0 },
    totalDurationSec: { type: Number, default: 0 },
    sections: [{
      _id: false,
      sectionId: { type: String, required: true },
      title: { type: String, default: '' },
      orderIndex: { type: Number, default: 0 },
    }],
    lessons: [{
      _id: false,
      lessonId: { type: String, required: true },
      sectionId: { type: String, default: '' },
      title: { type: String, default: '' },
      orderIndex: { type: Number, default: 0 },
      durationSec: { type: Number, default: 0 },
      isPreview: { type: Boolean, default: false },
      videoUrl: { type: String, default: '' },
    }],
    publishedAt: { type: Date },
  }, { timestamps: true, collection: 'course_snapshots' });

  await mongoose.connect(`${CONFIG.mongoUri}/learning_db`);

  try {
    console.log('[learning] Upserting course snapshots (course.published projection)...');
    const CourseSnapshot = mongoose.model('SeedCourseSnapshot', courseSnapshotSchema, 'course_snapshots');

    for (const course of coursePayloads) {
      await CourseSnapshot.updateOne(
        { courseId: course.courseId },
        {
          $set: {
            courseId: course.courseId,
            title: course.title,
            slug: course.slug,
            instructorId: course.instructorId,
            totalLessons: course.totalLessons,
            totalDurationSec: course.totalDurationSec,
            publishedAt: course.publishedAt,
            sections: course.sections.map((s) => ({
              sectionId: s.sectionId,
              title: s.title,
              orderIndex: s.orderIndex,
            })),
            lessons: course.sections.flatMap((s) => s.lessons.map((l) => ({
              lessonId: l.lessonId,
              sectionId: s.sectionId,
              title: l.title,
              orderIndex: l.orderIndex,
              durationSec: l.durationSec,
              isPreview: l.isPreview,
              videoUrl: l.videoUrl,
            }))),
          },
        },
        { upsert: true }
      );
    }

    console.log('[learning] Done.');
  } finally {
    await mongoose.disconnect();
  }
}

function buildReviewPlan(coursePayloads, studentIds) {
  const reviews = [];
  for (let i = 0; i < coursePayloads.length; i += 1) {
    const course = coursePayloads[i];

    for (let s = 0; s < studentIds.length; s += 1) {
      if ((i + s) % 2 !== 0) continue;

      const rating = ((i + s) % 5) + 1;
      reviews.push({
        studentId: studentIds[s],
        courseId: course.courseId,
        rating,
        comment: `Seed review ${rating}/5 for ${course.title}`,
        status: 'ACTIVE',
      });
    }
  }

  return reviews;
}

function aggregateRatings(reviews) {
  const stats = new Map();
  for (const review of reviews) {
    const current = stats.get(review.courseId) || { sum: 0, count: 0 };
    current.sum += review.rating;
    current.count += 1;
    stats.set(review.courseId, current);
  }

  const output = new Map();
  for (const [courseId, value] of stats.entries()) {
    output.set(courseId, {
      ratingCount: value.count,
      ratingAvg: Number((value.sum / value.count).toFixed(2)),
    });
  }

  return output;
}

async function seedReviewAndRatings(coursePayloads, accountsByKey) {
  const reviewRequire = serviceRequire('review-service');
  const mongoose = reviewRequire('mongoose');

  const reviewSchema = new mongoose.Schema({
    studentId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 2000 },
    status: { type: String, enum: ['ACTIVE', 'HIDDEN'], default: 'ACTIVE' },
  }, { timestamps: true, collection: 'reviews' });

  const studentIds = [
    accountsByKey.student1.id,
    accountsByKey.student2.id,
    accountsByKey.student3.id,
    accountsByKey.student4.id,
  ];

  const plannedReviews = buildReviewPlan(coursePayloads, studentIds);
  const ratingStats = aggregateRatings(plannedReviews);

  await mongoose.connect(`${CONFIG.mongoUri}/review_db`);

  try {
    console.log(`[review] Upserting ${plannedReviews.length} reviews...`);
    const Review = mongoose.model('SeedReview', reviewSchema, 'reviews');

    for (const review of plannedReviews) {
      await Review.updateOne(
        { studentId: review.studentId, courseId: review.courseId },
        { $set: review },
        { upsert: true }
      );
    }

    console.log('[review] Done.');
  } finally {
    await mongoose.disconnect();
  }

  return ratingStats;
}

async function seedSearch(coursePayloads, ratingStats) {
  const searchRequire = serviceRequire('search-service');
  const { PrismaClient } = searchRequire('@prisma/client');

  process.env.DATABASE_URL = CONFIG.searchDbUrl;
  const prisma = new PrismaClient();

  try {
    console.log('[search] Upserting course index (course.published projection)...');

    for (const course of coursePayloads) {
      const rating = ratingStats.get(course.courseId) || { ratingAvg: 0, ratingCount: 0 };
      await prisma.courseIndex.upsert({
        where: { courseId: course.courseId },
        create: {
          courseId: course.courseId,
          title: course.title,
          slug: course.slug,
          description: course.description,
          instructorId: course.instructorId,
          instructorName: course.instructorName,
          topicId: course.topicId,
          basePrice: course.basePrice,
          salePrice: course.salePrice,
          currency: course.currency,
          totalSections: course.totalSections,
          totalLessons: course.totalLessons,
          totalDurationSec: course.totalDurationSec,
          thumbnailUrl: course.thumbnailUrl,
          publishedAt: course.publishedAt,
          ratingAvg: rating.ratingAvg,
          ratingCount: rating.ratingCount,
        },
        update: {
          title: course.title,
          slug: course.slug,
          description: course.description,
          instructorId: course.instructorId,
          instructorName: course.instructorName,
          topicId: course.topicId,
          basePrice: course.basePrice,
          salePrice: course.salePrice,
          currency: course.currency,
          totalSections: course.totalSections,
          totalLessons: course.totalLessons,
          totalDurationSec: course.totalDurationSec,
          thumbnailUrl: course.thumbnailUrl,
          publishedAt: course.publishedAt,
          ratingAvg: rating.ratingAvg,
          ratingCount: rating.ratingCount,
        },
      });
    }

    console.log('[search] Done.');
  } finally {
    await prisma.$disconnect();
  }
}

async function applyRatingsToCourseDb(ratingStats) {
  const courseRequire = serviceRequire('course-service');
  const mongoose = courseRequire('mongoose');

  const courseSchema = new mongoose.Schema({
    courseId: { type: String, unique: true, index: true },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  }, { timestamps: true, collection: 'courses' });

  await mongoose.connect(`${CONFIG.mongoUri}/course_db`);

  try {
    console.log('[course] Applying rating stats from seeded reviews...');
    const Course = mongoose.model('SeedCourseRating', courseSchema, 'courses');

    for (const [courseId, stats] of ratingStats.entries()) {
      await Course.updateOne(
        { courseId },
        { $set: { ratingAvg: stats.ratingAvg, ratingCount: stats.ratingCount } }
      );
    }

    console.log('[course] Ratings updated.');
  } finally {
    await mongoose.disconnect();
  }
}

function printSummary(accountsByKey, coursePayloads, ratingStats) {
  const students = Object.values(accountsByKey).filter((a) => a.kind === 'STUDENT').length;
  const instructors = Object.values(accountsByKey).filter((a) => a.kind === 'INSTRUCTOR').length;
  const admins = Object.values(accountsByKey).filter((a) => a.kind === 'ADMIN').length;

  console.log('');
  console.log('Seed completed successfully.');
  console.log(`- Accounts: ${Object.keys(accountsByKey).length} (students: ${students}, instructors: ${instructors}, admins: ${admins})`);
  console.log(`- Courses: ${coursePayloads.length}`);
  console.log(`- Course ratings: ${ratingStats.size} courses have reviews`);
  console.log(`- Default password for all accounts: ${CONFIG.defaultPassword}`);
}

async function run() {
  console.log('--- Core services seeding started ---');
  console.log(`Mongo URI: ${CONFIG.mongoUri}`);

  const accountsByKey = await seedAuth();
  await seedUser(accountsByKey);
  const coursePayloads = await seedCourse(accountsByKey);
  await seedLearning(coursePayloads);
  const ratingStats = await seedReviewAndRatings(coursePayloads, accountsByKey);
  await applyRatingsToCourseDb(ratingStats);
  await seedSearch(coursePayloads, ratingStats);

  printSummary(accountsByKey, coursePayloads, ratingStats);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
