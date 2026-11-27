import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { createBackupFile } from '../backup';
import type { DriveBackupSettings, StoreData } from '../types';

export const DRIVE_BACKUP_SETTINGS_KEY = '@trama/drive-backup-settings-v1';
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export const DEFAULT_DRIVE_BACKUP_SETTINGS: DriveBackupSettings = {
  enabled: false,
  time: '21:00',
  accountEmail: null,
  lastBackupAt: null,
  lastBackupError: null,
};

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
type GoogleSignInModule = typeof import('react-native-nitro-google-signin');
let googleSignInModule: GoogleSignInModule | null = null;
let googleSignInConfigured = false;

function isValidTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isValidTimestamp(value: unknown): value is string | null {
  return value === null
    || (typeof value === 'string' && !Number.isNaN(new Date(value).getTime()));
}

function isDriveBackupSettings(value: unknown): value is DriveBackupSettings {
  return isRecord(value)
    && typeof value.enabled === 'boolean'
    && typeof value.time === 'string'
    && isValidTime(value.time)
    && isNullableString(value.accountEmail)
    && isValidTimestamp(value.lastBackupAt)
    && isNullableString(value.lastBackupError);
}

export function isGoogleDriveConfigured() {
  return Constants.appOwnership !== 'expo'
    && Platform.OS !== 'web'
    && Boolean(GOOGLE_WEB_CLIENT_ID)
    && (Platform.OS !== 'ios' || Boolean(GOOGLE_IOS_CLIENT_ID));
}

async function getGoogleSignInModule() {
  if (Constants.appOwnership === 'expo') {
    throw new Error('O backup no Google Drive exige um development build; o Expo Go não inclui o módulo nativo necessário.');
  }
  if (!isGoogleDriveConfigured()) {
    throw new Error(
      'Configure os IDs OAuth do Google no ambiente de build antes de conectar o Drive. Consulte a orientação exibida nesta tela.',
    );
  }

  googleSignInModule ??= await import('react-native-nitro-google-signin');
  if (!googleSignInConfigured) {
    googleSignInModule.GoogleOneTapSignIn.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
    });
    googleSignInConfigured = true;
  }
  return googleSignInModule;
}

export async function readDriveBackupSettings(): Promise<DriveBackupSettings> {
  const saved = await AsyncStorage.getItem(DRIVE_BACKUP_SETTINGS_KEY);
  if (saved === null) return DEFAULT_DRIVE_BACKUP_SETTINGS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    throw new Error('As configurações salvas do backup estão corrompidas. Reconfigure o backup automático.');
  }
  if (!isDriveBackupSettings(parsed)) {
    throw new Error('As configurações salvas do backup são inválidas. Reconfigure o backup automático.');
  }
  return parsed;
}

export async function saveDriveBackupSettings(settings: DriveBackupSettings) {
  if (!isDriveBackupSettings(settings)) {
    throw new Error('O horário ou as configurações do backup são inválidos.');
  }
  await AsyncStorage.setItem(DRIVE_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
}

export function isDailyDriveBackupDue(settings: DriveBackupSettings, now = new Date()) {
  if (!settings.enabled) return false;
  const [hours, minutes] = settings.time.split(':').map(Number);
  if (now.getHours() * 60 + now.getMinutes() < hours * 60 + minutes) return false;
  if (!settings.lastBackupAt) return true;

  const lastBackupDate = new Date(settings.lastBackupAt);
  return Number.isNaN(lastBackupDate.getTime())
    || lastBackupDate.getFullYear() !== now.getFullYear()
    || lastBackupDate.getMonth() !== now.getMonth()
    || lastBackupDate.getDate() !== now.getDate();
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getDriveAccessToken() {
  const { GoogleOneTapSignIn } = await getGoogleSignInModule();
  const currentUser = GoogleOneTapSignIn.getCurrentUser();
  if (!currentUser) {
    throw new Error('Conecte novamente sua conta Google para continuar fazendo backups.');
  }
  if (!currentUser.scopes.includes(DRIVE_FILE_SCOPE)) {
    throw new Error('A permissão para criar backups no Google Drive foi removida. Conecte a conta novamente.');
  }
  return GoogleOneTapSignIn.getTokens();
}

async function responseError(response: Response) {
  const body = await response.text();
  if (body) {
    try {
      const parsed: unknown = JSON.parse(body);
      if (isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.message === 'string') {
        return parsed.error.message;
      }
    } catch {
      return body.slice(0, 400);
    }
    return body.slice(0, 400);
  }
  return response.statusText || `HTTP ${response.status}`;
}

async function createUploadSession(accessToken: string, fileName: string, fileSize: number) {
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/json',
        'X-Upload-Content-Length': String(fileSize),
      },
      body: JSON.stringify({ name: fileName, mimeType: 'application/json' }),
    },
  );
  if (!response.ok) {
    const message = await responseError(response);
    throw new DriveUploadError(response.status, `Não foi possível iniciar o envio ao Google Drive: ${message}`);
  }
  const uploadUrl = response.headers.get('Location');
  if (!uploadUrl) throw new Error('O Google Drive não retornou o endereço de envio do backup.');
  return uploadUrl;
}

class DriveUploadError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DriveUploadError';
  }
}

async function uploadFileContent(
  accessToken: string,
  uploadUrl: string,
  file: File,
) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Range': `bytes 0-${file.size - 1}/${file.size}`,
    },
    body: file,
  });
  if (!response.ok) {
    const message = await responseError(response);
    throw new DriveUploadError(response.status, `Não foi possível enviar o backup ao Google Drive: ${message}`);
  }
}

async function uploadFileToDrive(file: File, fileName: string) {
  let { accessToken } = await getDriveAccessToken();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const uploadUrl = await createUploadSession(accessToken, fileName, file.size);
      await uploadFileContent(accessToken, uploadUrl, file);
      return;
    } catch (error) {
      if (!(error instanceof DriveUploadError) || error.status !== 401 || attempt > 0) throw error;
      const { GoogleOneTapSignIn } = await getGoogleSignInModule();
      await GoogleOneTapSignIn.clearCachedAccessToken(accessToken);
      ({ accessToken } = await getDriveAccessToken());
    }
  }
  throw new Error('Não foi possível renovar a autorização para o Google Drive.');
}

export async function connectGoogleDrive() {
  const {
    GoogleOneTapSignIn,
    isNoSavedCredentialFoundResponse,
    isSuccessResponse,
  } = await getGoogleSignInModule();
  await GoogleOneTapSignIn.checkPlayServices();

  let response = await GoogleOneTapSignIn.signIn();
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.createAccount();
  }
  if (!isSuccessResponse(response)) {
    throw new Error('A conexão com o Google Drive foi cancelada.');
  }

  const currentUser = GoogleOneTapSignIn.getCurrentUser();
  if (!currentUser) throw new Error('Não foi possível confirmar a conta Google selecionada.');
  if (!currentUser.scopes.includes(DRIVE_FILE_SCOPE)) {
    const authorization = await GoogleOneTapSignIn.requestScopes([DRIVE_FILE_SCOPE]);
    if (!authorization.accessToken) {
      throw new Error('A permissão para criar backups no Google Drive não foi concedida.');
    }
  }
  const authorizedUser = GoogleOneTapSignIn.getCurrentUser();
  if (!authorizedUser?.scopes.includes(DRIVE_FILE_SCOPE)) {
    throw new Error('A permissão para criar backups no Google Drive não foi concedida.');
  }
  if (!authorizedUser.user.email) {
    throw new Error('A conta Google não disponibilizou um endereço de e-mail para confirmar a conexão.');
  }
  return authorizedUser.user.email;
}

export async function getGoogleDriveAccountEmail() {
  if (!isGoogleDriveConfigured()) return null;
  const { GoogleOneTapSignIn } = await getGoogleSignInModule();
  return GoogleOneTapSignIn.getCurrentUser()?.user.email ?? null;
}

export async function disconnectGoogleDrive() {
  if (!isGoogleDriveConfigured()) return;
  const { GoogleOneTapSignIn } = await getGoogleSignInModule();
  const currentUser = GoogleOneTapSignIn.getCurrentUser();
  if (!currentUser) return;
  await GoogleOneTapSignIn.revokeAccess(currentUser.user.email ?? currentUser.user.id);
  await GoogleOneTapSignIn.signOut();
}

export async function createDriveBackup(data: StoreData, now = new Date()) {
  const file = await createBackupFile(data);
  try {
    await uploadFileToDrive(file, `Trama-backup-${localDateKey(now)}.json`);
  } finally {
    if (file.exists) {
      try {
        file.delete();
      } catch (error) {
        console.error('Não foi possível remover o arquivo temporário do backup:', error);
      }
    }
  }
}
