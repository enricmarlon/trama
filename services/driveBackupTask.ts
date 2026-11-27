import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { isStoreData } from '../backup';
import { STORAGE_KEY } from '../constants';
import { normalizeStoreData } from '../storeData';
import type { DriveBackupSettings } from '../types';
import {
  createDriveBackup,
  isDailyDriveBackupDue,
  readDriveBackupSettings,
  saveDriveBackupSettings,
} from './googleDriveBackup';

export const DAILY_DRIVE_BACKUP_TASK = 'trama-daily-drive-backup';

TaskManager.defineTask(DAILY_DRIVE_BACKUP_TASK, async ({ error }) => {
  if (error) {
    console.error('A tarefa de backup em segundo plano falhou:', error.message);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }

  let settings: DriveBackupSettings | undefined;
  try {
    settings = await readDriveBackupSettings();
    const now = new Date();
    if (!isDailyDriveBackupDue(settings, now)) return BackgroundTask.BackgroundTaskResult.Success;

    const savedData = await AsyncStorage.getItem(STORAGE_KEY);
    if (!savedData) throw new Error('Não há dados salvos para incluir no backup.');

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(savedData);
    } catch {
      throw new Error('Os dados salvos do Trama não são um JSON válido.');
    }
    if (!isStoreData(parsedData)) {
      throw new Error('Os dados salvos do Trama estão incompletos e não podem ser enviados.');
    }

    await createDriveBackup(normalizeStoreData(parsedData), now);
    await saveDriveBackupSettings({
      ...settings,
      lastBackupAt: now.toISOString(),
      lastBackupError: null,
    });
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (taskError) {
    const message = taskError instanceof Error ? taskError.message : 'Erro inesperado ao enviar o backup.';
    console.error('Não foi possível concluir o backup diário no Google Drive:', message);
    try {
      settings = settings ?? await readDriveBackupSettings();
      await saveDriveBackupSettings({ ...settings, lastBackupError: message });
    } catch (saveError) {
      console.error('Não foi possível salvar o erro do backup diário:', saveError);
    }
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function ensureDailyDriveBackupTask() {
  if (!(await TaskManager.isAvailableAsync())) {
    throw new Error('O backup em segundo plano não está disponível nesta plataforma.');
  }
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    throw new Error('O sistema restringiu tarefas em segundo plano neste dispositivo.');
  }
  if (!(await TaskManager.isTaskRegisteredAsync(DAILY_DRIVE_BACKUP_TASK))) {
    await BackgroundTask.registerTaskAsync(DAILY_DRIVE_BACKUP_TASK, { minimumInterval: 15 });
  }
}

export async function unregisterDailyDriveBackupTask() {
  if (await TaskManager.isTaskRegisteredAsync(DAILY_DRIVE_BACKUP_TASK)) {
    await BackgroundTask.unregisterTaskAsync(DAILY_DRIVE_BACKUP_TASK);
  }
}
