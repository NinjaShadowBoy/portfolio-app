export const environment = {
  production: true,
  // Staging API, same origin as the staging site (nginx proxies /portfolio/).
  apiBaseUrl: 'https://staging.alexabena.me/portfolio/v1',
  cloudinary: {
    cloudName: 'dct6fuenh',
    uploadPreset: 'portfolio_unsigned', // Create this in Cloudinary dashboard
  },
};
