# Configurar o backup no Google Drive

O backup diário usa a API do Google Drive e requer uma configuração OAuth própria do aplicativo. Os IDs OAuth são identificadores públicos; não coloque senhas, chaves privadas ou client secrets no app.

## Google Cloud

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ative a **Google Drive API** e configure a tela de consentimento OAuth.
3. Crie um cliente OAuth do tipo **Web application** e copie o ID para `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
4. Crie um cliente OAuth **Android** com o package `com.anonymous.trama`. Cadastre o SHA-1 da assinatura usada no build; para distribuição, inclua também o SHA-1 da chave de release ou da assinatura do Google Play.
5. Crie um cliente OAuth **iOS** com o bundle identifier `com.anonymous.trama` e copie o ID para `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
6. Copie `.env.example` para `.env` e preencha os IDs. O arquivo `.env` é ignorado pelo Git.

O app solicita a permissão mínima `drive.file` quando a pessoa conecta a conta e cria os arquivos de backup no Drive dessa conta. Nenhum client secret é necessário no aplicativo.

## Gerar os binários nativos

O Google Sign-In usa código nativo e não funciona no Expo Go. Depois de configurar os IDs, regenere os projetos nativos e faça um novo build:

```powershell
npx expo prebuild
npx expo run:android
```

Para iOS, use `npx expo run:ios` em um Mac. Alterações nos IDs OAuth ou na assinatura também exigem um novo build.

## Limites de execução

O horário escolhido é uma preferência, não um alarme exato. O sistema tenta executar a tarefa periódica após o horário configurado, mas Android e iOS podem atrasá-la ou adiá-la conforme rede, bateria, uso do app e políticas do fabricante. Se a pessoa forçar o encerramento do app, o Android pode suspender as tarefas até o app ser aberto novamente.
