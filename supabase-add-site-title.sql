-- 添加 siteTitle 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SiteSettings' AND column_name = 'siteTitle'
  ) THEN
    ALTER TABLE "SiteSettings" ADD COLUMN "siteTitle" VARCHAR(255) NOT NULL DEFAULT '设计作品集';
  END IF;
END $$;
