-- 添加 thumbnailUrl 字段到 Work 表
ALTER TABLE "Work" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;

-- 更新现有数据：thumbnailUrl 默认为 imageUrl
UPDATE "Work" SET "thumbnailUrl" = "imageUrl" WHERE "thumbnailUrl" IS NULL;
