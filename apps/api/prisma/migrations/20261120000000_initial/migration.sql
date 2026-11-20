-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maps" (
    "id" UUID NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "tactical_description" TEXT,
    "display_icon" TEXT,
    "splash" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_roles" (
    "id" UUID NOT NULL,
    "display_name" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "display_icon" TEXT,

    CONSTRAINT "agent_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "display_icon" TEXT,
    "full_portrait" TEXT,
    "background" TEXT,
    "background_gradient_colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_abilities" (
    "agent_id" UUID NOT NULL,
    "slot" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "display_icon" TEXT,

    CONSTRAINT "agent_abilities_pkey" PRIMARY KEY ("agent_id","slot")
);

-- CreateTable
CREATE TABLE "weapons" (
    "id" UUID NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "display_icon" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "cost" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "weapons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapon_damage_ranges" (
    "weapon_id" UUID NOT NULL,
    "range_start_meters" INTEGER NOT NULL,
    "range_end_meters" INTEGER NOT NULL,
    "head_damage" DOUBLE PRECISION NOT NULL,
    "body_damage" DOUBLE PRECISION NOT NULL,
    "leg_damage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "weapon_damage_ranges_pkey" PRIMARY KEY ("weapon_id","range_start_meters","range_end_meters")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "map_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "weapon_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "agents_role_id_idx" ON "agents"("role_id");

-- CreateIndex
CREATE INDEX "votes_map_id_agent_id_idx" ON "votes"("map_id", "agent_id");

-- CreateIndex
CREATE INDEX "votes_map_id_weapon_id_idx" ON "votes"("map_id", "weapon_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_user_id_map_id_key" ON "votes"("user_id", "map_id");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "agent_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_abilities" ADD CONSTRAINT "agent_abilities_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weapon_damage_ranges" ADD CONSTRAINT "weapon_damage_ranges_weapon_id_fkey" FOREIGN KEY ("weapon_id") REFERENCES "weapons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_weapon_id_fkey" FOREIGN KEY ("weapon_id") REFERENCES "weapons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Prisma cannot express CHECK constraints; preserve these when editing migrations.
ALTER TABLE "users" ADD CONSTRAINT "users_username_normalized"
  CHECK (username = lower(btrim(username)) AND length(username) > 0);
ALTER TABLE "users" ADD CONSTRAINT "users_email_normalized"
  CHECK (email = lower(btrim(email)) AND length(email) > 0);
ALTER TABLE "weapons" ADD CONSTRAINT "weapons_cost_nonnegative"
  CHECK (cost IS NULL OR cost >= 0);
ALTER TABLE "weapon_damage_ranges" ADD CONSTRAINT "weapon_damage_ranges_valid"
  CHECK (range_start_meters >= 0 AND range_end_meters > range_start_meters
    AND head_damage >= 0 AND head_damage < 'Infinity'::double precision
    AND body_damage >= 0 AND body_damage < 'Infinity'::double precision
    AND leg_damage >= 0 AND leg_damage < 'Infinity'::double precision);
