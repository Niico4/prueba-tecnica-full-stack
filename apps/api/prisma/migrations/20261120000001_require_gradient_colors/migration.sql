-- Prisma models lists as required but generates nullable PostgreSQL arrays.
ALTER TABLE "agents" ALTER COLUMN "background_gradient_colors" SET NOT NULL;
