-- CreateTable
CREATE TABLE "command_analytics" (
    "id" TEXT NOT NULL,
    "command_name" TEXT NOT NULL,
    "times_called" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "command_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "command_analytics_command_name_key" ON "command_analytics"("command_name");

-- CreateIndex
CREATE INDEX "command_analytics_command_name_idx" ON "command_analytics"("command_name");
