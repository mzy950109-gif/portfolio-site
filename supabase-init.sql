-- 创建 Category 表
CREATE TABLE "Category" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- 创建唯一索引
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- 创建 Work 表
CREATE TABLE "Work" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "categoryId" TEXT NOT NULL,
    "tags" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- 创建外键
ALTER TABLE "Work" ADD CONSTRAINT "Work_categoryId_fkey" 
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 创建 SiteSettings 表
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "siteName" TEXT NOT NULL DEFAULT 'Portfolio',
    "tagline" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- 插入默认分类
INSERT INTO "Category" ("id", "name", "slug", "sortOrder", "updatedAt") VALUES
    ('clv1a2b3c4d5e6f7g8h9i0j1', '全部', 'all', 0, CURRENT_TIMESTAMP),
    ('clv2a2b3c4d5e6f7g8h9i0j2', '品牌设计', 'branding', 1, CURRENT_TIMESTAMP),
    ('clv3a2b3c4d5e6f7g8h9i0j3', '海报设计', 'poster', 2, CURRENT_TIMESTAMP),
    ('clv4a2b3c4d5e6f7g8h9i0j4', '插画', 'illustration', 3, CURRENT_TIMESTAMP),
    ('clv5a2b3c4d5e6f7g8h9i0j5', 'UI/UX', 'uiux', 4, CURRENT_TIMESTAMP);

-- 插入默认设置
INSERT INTO "SiteSettings" ("id", "siteName", "updatedAt") VALUES
    ('default', 'Portfolio', CURRENT_TIMESTAMP);
