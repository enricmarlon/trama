module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins = [...(config.plugins ?? [])];

  if (iosClientId) {
    if (!iosClientId.endsWith('.apps.googleusercontent.com')) {
      throw new Error('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID precisa ser um ID OAuth do Google válido.');
    }
    const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`;
    plugins.push(['react-native-nitro-google-signin', { iosUrlScheme }]);
  }

  return { ...config, plugins };
};
