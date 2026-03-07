-- CreateTable
CREATE TABLE IF NOT EXISTS "course_index" (
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructor_id" TEXT,
    "instructor_name" TEXT,
    "topic_id" TEXT,
    "price" DECIMAL(12,0) NOT NULL,
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "course_index_pkey" PRIMARY KEY ("course_id")
);
