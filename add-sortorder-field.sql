-- 添加 sortOrder 字段到 Category 表
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;

-- 添加 sortOrder 字段到 Work 表
ALTER TABLE "Work" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER DEFAULT 0;
