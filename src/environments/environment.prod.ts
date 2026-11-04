export const environment = {
  production: true,
  // Production API, same origin as the site (nginx proxies /portfolio/ to
  // the backend), so the browser never needs a CORS preflight.
  apiBaseUrl: 'https://alexabena.me/portfolio/v1',
  cloudinary: {
    cloudName: 'dct6fuenh',
    uploadPreset: 'portfolio_unsigned', // Create this in Cloudinary dashboard
  },
};
