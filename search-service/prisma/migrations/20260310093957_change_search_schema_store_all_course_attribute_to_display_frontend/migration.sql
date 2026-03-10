/*
  Warnings:

  - You are about to drop the column `price` on the `course_index` table. All the data in the column will be lost.
  - Added the required column `base_price` to the `course_index` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sale_price` to the `course_index` table without a default value. This is not possible if the table is not empty.
  - Made the column `instructor_id` on table `course_index` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instructor_name` on table `course_index` required. This step will fail if there are existing NULL values in that column.
  - Made the column `published_at` on table `course_index` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "course_index" DROP COLUMN "price",
ADD COLUMN     "base_price" DECIMAL(12,0) NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'VND',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "sale_price" DECIMAL(12,0) NOT NULL,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "thumbnail_url" TEXT,
ADD COLUMN     "total_duration_sec" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_lessons" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_sections" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "instructor_id" SET NOT NULL,
ALTER COLUMN "instructor_name" SET NOT NULL,
ALTER COLUMN "published_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "course_index_topic_id_idx" ON "course_index"("topic_id");

-- CreateIndex
CREATE INDEX "course_index_published_at_idx" ON "course_index"("published_at");

-- CreateIndex
CREATE INDEX "course_index_rating_avg_idx" ON "course_index"("rating_avg");

-- CreateIndex
CREATE INDEX "course_index_sale_price_idx" ON "course_index"("sale_price");
