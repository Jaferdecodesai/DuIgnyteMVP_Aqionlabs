import { createRuntime } from "@/lib/runtime";
import { getConfig } from "@/lib/security";
import { SqliteStore } from "@/lib/storage";
import { MysqlStore } from "@/lib/storage-mysql";
import type { Workspace } from "@/lib/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createRuntime(
  (config) =>
    config.storage === "mysql"
      ? new MysqlStore<Workspace>(config.mysql)
      : new SqliteStore<Workspace>(config.sqlitePath),
  getConfig,
);
export const POST = GET;
