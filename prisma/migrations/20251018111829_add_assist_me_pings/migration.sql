/*
  Warnings:

  - Added the required column `assist_me_pings` to the `ranked_solo_matches` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ranked_solo_matches" ADD COLUMN     "assist_me_pings" INTEGER NOT NULL;
