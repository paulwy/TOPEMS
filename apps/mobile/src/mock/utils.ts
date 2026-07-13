import Dexie from 'dexie';

export function clearMockData(): void {
  console.log('[Mock] Clearing all mock data...');
}

export function resetMockData(): void {
  console.log('[Mock] Resetting mock data to initial state...');
}

export async function clearDatabase(): Promise<void> {
  try {
    const db = new Dexie('TOPEMS_Mobile');
    const tables = db.tables;
    for (const table of tables) {
      await table.clear();
    }
    await db.close();
    console.log('[Mock] Database cleared successfully');
  } catch (error) {
    console.error('[Mock] Failed to clear database:', error);
  }
}

export function getMockStats(): Record<string, unknown> {
  return {
    scanRecords: 5,
    approvalTasks: 6,
    attendanceRecords: 7,
    tasks: 6,
    dashboardStats: 1,
  };
}