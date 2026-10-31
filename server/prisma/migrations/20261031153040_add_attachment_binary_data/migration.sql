/*
  Warnings:

  - Added the required column `data` to the `attachments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "data" BYTEA NOT NULL;
