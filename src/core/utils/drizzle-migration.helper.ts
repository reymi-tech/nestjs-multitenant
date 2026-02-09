import { existsSync } from 'node:fs';
import path from 'node:path';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { AdminDatabaseType } from '../providers/admin-database.provider';

export interface DrizzleMigrationOptions {
  /**
   * Nombre de la carpeta de migraciones dentro del paquete
   * Ej: 'drizzle'
   */
  migrationsDirName?: string;

  /**
   * Si es false, no ejecuta migraciones
   */
  enabled: boolean;
}

/**
 * Ejecuta migraciones Drizzle usando paths compatibles con build (dist)
 */
export async function runDrizzleMigrations(
  db: AdminDatabaseType,
  options: DrizzleMigrationOptions,
): Promise<void> {
  if (!options.enabled) {
    return;
  }

  const migrationsDirName = options.migrationsDirName ?? 'drizzle';

  /**
   * __dirname apunta a dist/core/utils en runtime
   * Subimos hasta dist/
   */
  const migrationsPath = path.join(
    __dirname,
    '..', // core
    '..', // dist root
    migrationsDirName,
  );

  if (!existsSync(migrationsPath)) {
    throw new Error(
      `[Drizzle] Migrations folder not found at: ${migrationsPath}`,
    );
  }

  await migrate(db, {
    migrationsFolder: migrationsPath,
  });
}
