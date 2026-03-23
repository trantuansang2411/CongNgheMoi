require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

const Course = require('../src/models/mongoose/Course.model');
const Section = require('../src/models/mongoose/Section.model');
const Lesson = require('../src/models/mongoose/Lesson.model');
const InstructorProfile = require('../src/models/mongoose/InstructorProfile.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.COURSE_DB_NAME || 'course_db';
const LEARNING_DB_NAME = process.env.LEARNING_DB_NAME || 'learning_db';
const SEED_SYNC_LEARNING = String(process.env.SEED_SYNC_LEARNING || 'true').toLowerCase() !== 'false';

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
    orderIndex: { type: Number, default: 0 }
  }],
  lessons: [{
    _id: false,
    lessonId: { type: String, required: true },
    sectionId: { type: String, default: '' },
    title: { type: String, default: '' },
    orderIndex: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0 },
    isPreview: { type: Boolean, default: false },
    videoUrl: { type: String, default: '' }
  }],
  publishedAt: { type: Date }
}, {
  timestamps: true,
  collection: 'course_snapshots'
});

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildSlug(title, fallback) {
  const slug = slugify(String(title || ''), { lower: true, strict: true, trim: true });
  return slug || fallback;
}

function toDate(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function stripBom(text) {
  return typeof text === 'string' ? text.replace(/^\uFEFF/, '') : text;
}

async function upsertInstructors(seed) {
  const instructors = toArray(seed.instructors);
  for (const instructor of instructors) {
    if (!instructor || !instructor.instructorId) continue;
    await InstructorProfile.findOneAndUpdate(
      { instructorId: instructor.instructorId },
      {
        instructorId: instructor.instructorId,
        displayName: instructor.displayName || ''
      },
      { upsert: true, new: true }
    );
  }
  return instructors.length;
}

async function replaceCurriculum(courseId, sectionsInput) {
  await Lesson.deleteMany({ courseId });
  await Section.deleteMany({ courseId });

  const sections = [];
  const lessons = [];

  const normalizedSections = toArray(sectionsInput);
  normalizedSections.forEach((section, sectionIndex) => {
    const sectionId = section.sectionId || uuidv4();

    sections.push({
      courseId,
      sectionId,
      title: section.title || `Section ${sectionIndex + 1}`,
      orderIndex: toNumber(section.orderIndex, sectionIndex)
    });

    const sectionLessons = toArray(section.lessons);
    sectionLessons.forEach((lesson, lessonIndex) => {
      lessons.push({
        courseId,
        sectionId,
        lessonId: lesson.lessonId || uuidv4(),
        title: lesson.title || `Lesson ${lessonIndex + 1}`,
        orderIndex: toNumber(lesson.orderIndex, lessonIndex),
        videoUrl: lesson.videoUrl || '',
        durationSec: toNumber(lesson.durationSec, 0),
        isPreview: Boolean(lesson.isPreview)
      });
    });
  });

  const insertedSections = sections.length > 0
    ? await Section.insertMany(sections, { ordered: false })
    : [];
  const insertedLessons = lessons.length > 0
    ? await Lesson.insertMany(lessons, { ordered: false })
    : [];

  const totalDurationSec = lessons.reduce((sum, lesson) => sum + toNumber(lesson.durationSec, 0), 0);

  return {
    totalSections: sections.length,
    totalLessons: lessons.length,
    totalDurationSec,
    insertedSections,
    insertedLessons
  };
}

async function upsertCourses(seed) {
  const courses = toArray(seed.courses);
  let processed = 0;
  const publishedPayloads = [];

  for (const course of courses) {
    if (!course || !course.title || !course.instructorId) {
      continue;
    }

    const courseId = course.courseId || uuidv4();
    const slug = course.slug || buildSlug(course.title, `course-${courseId}`);
    const status = course.status || 'DRAFT';

    const stats = await replaceCurriculum(courseId, course.sections);

    const updateDoc = {
      courseId,
      instructorId: course.instructorId,
      instructorName: course.instructorName || '',
      title: course.title,
      slug,
      description: course.description || '',
      objectives: toArray(course.objectives),
      requirements: toArray(course.requirements),
      outcomes: toArray(course.outcomes),
      topicId: course.topicId || '',
      thumbnailUrl: course.thumbnailUrl || '',
      basePrice: toNumber(course.basePrice, 0),
      salePrice: toNumber(course.salePrice, 0),
      currency: course.currency || 'VND',
      status,
      totalSections: stats.totalSections,
      totalLessons: stats.totalLessons,
      totalDurationSec: stats.totalDurationSec,
      submittedAt: toDate(course.submittedAt),
      publishedAt: toDate(course.publishedAt),
      deletedAt: null
    };

    if (status === 'SUBMITTED' && !updateDoc.submittedAt) {
      updateDoc.submittedAt = new Date();
    }
    if (status === 'PUBLISHED' && !updateDoc.publishedAt) {
      updateDoc.publishedAt = new Date();
      if (!updateDoc.submittedAt) {
        updateDoc.submittedAt = updateDoc.publishedAt;
      }
    }

    await Course.findOneAndUpdate(
      { courseId },
      { $set: updateDoc },
      { upsert: true, new: true }
    );

    if (status === 'PUBLISHED') {
      // Mirror the current course.published payload contract from course-service.
      publishedPayloads.push({
        courseId,
        title: updateDoc.title,
        slug: updateDoc.slug,
        description: updateDoc.description,
        instructorId: updateDoc.instructorId,
        instructorName: updateDoc.instructorName,
        topicId: updateDoc.topicId,
        basePrice: updateDoc.basePrice,
        salePrice: updateDoc.salePrice,
        currency: updateDoc.currency,
        totalSections: updateDoc.totalSections,
        totalLessons: updateDoc.totalLessons,
        totalDurationSec: updateDoc.totalDurationSec,
        thumbnailUrl: updateDoc.thumbnailUrl,
        publishedAt: updateDoc.publishedAt,
        sections: stats.insertedSections.map((s) => ({
          sectionId: s.sectionId || s._id.toString(),
          title: s.title,
          orderIndex: s.orderIndex
        })),
        lessons: stats.insertedLessons.map((l) => ({
          lessonId: l.lessonId || l._id.toString(),
          sectionId: l.sectionId || '',
          title: l.title,
          orderIndex: l.orderIndex,
          durationSec: l.durationSec || 0,
          isPreview: Boolean(l.isPreview),
          videoUrl: l.videoUrl || ''
        }))
      });
    }

    processed += 1;
  }

  return { processed, publishedPayloads };
}

async function syncLearningSnapshots(learningConnection, publishedPayloads) {
  const CourseSnapshot = learningConnection.model('CourseSnapshot', courseSnapshotSchema);
  for (const payload of publishedPayloads) {
    await CourseSnapshot.findOneAndUpdate(
      { courseId: payload.courseId },
      {
        courseId: payload.courseId,
        title: payload.title || '',
        slug: payload.slug || '',
        instructorId: payload.instructorId || '',
        totalLessons: payload.totalLessons || 0,
        totalDurationSec: payload.totalDurationSec || 0,
        publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : new Date(),
        sections: toArray(payload.sections).map((s) => ({
          sectionId: s.sectionId,
          title: s.title || '',
          orderIndex: toNumber(s.orderIndex, 0)
        })),
        lessons: toArray(payload.lessons).map((l) => ({
          lessonId: l.lessonId,
          sectionId: l.sectionId || '',
          title: l.title || '',
          orderIndex: toNumber(l.orderIndex, 0),
          durationSec: toNumber(l.durationSec, 0),
          isPreview: Boolean(l.isPreview),
          videoUrl: l.videoUrl || ''
        }))
      },
      { upsert: true, new: true }
    );
  }

  return publishedPayloads.length;
}

async function run() {
  const inputPath = process.argv[2] || path.join(process.cwd(), 'seed-courses.json');
  const absoluteInputPath = path.resolve(inputPath);

  if (!fs.existsSync(absoluteInputPath)) {
    throw new Error(`Seed file not found: ${absoluteInputPath}`);
  }

  const raw = fs.readFileSync(absoluteInputPath, 'utf8');
  const seed = JSON.parse(stripBom(raw));

  await mongoose.connect(`${MONGO_URI}/${DB_NAME}`);
  console.log(`[seed] Connected to ${MONGO_URI}/${DB_NAME}`);

  const instructorCount = await upsertInstructors(seed);
  const { processed: courseCount, publishedPayloads } = await upsertCourses(seed);

  console.log(`[seed] Upserted instructors: ${instructorCount}`);
  console.log(`[seed] Upserted courses: ${courseCount}`);

  if (SEED_SYNC_LEARNING) {
    const learningConnection = await mongoose.createConnection(`${MONGO_URI}/${LEARNING_DB_NAME}`).asPromise();
    console.log(`[seed] Connected to ${MONGO_URI}/${LEARNING_DB_NAME}`);
    const snapshotCount = await syncLearningSnapshots(learningConnection, publishedPayloads);
    console.log(`[seed] Upserted learning snapshots: ${snapshotCount}`);
    await learningConnection.close();
  }
}

run()
  .then(async () => {
    await mongoose.disconnect();
    console.log('[seed] Done');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[seed] Failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
