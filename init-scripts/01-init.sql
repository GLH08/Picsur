-- 初始化数据库（可选，TypeORM会自动创建表）
-- 这个脚本会在PostgreSQL容器首次启动时自动执行

-- 创建扩展（如果需要）
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 设置时区
SET timezone = 'UTC';

-- 创建必要的权限（可选）
-- GRANT ALL PRIVILEGES ON DATABASE picsur TO picsur;
-- GRANT ALL PRIVILEGES ON SCHEMA public TO picsur;
