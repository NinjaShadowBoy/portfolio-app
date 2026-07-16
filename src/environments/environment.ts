export const environment = {
  production: false,
  // Local dev backend URL. Update if your dev server differs.
  apiBaseUrl: 'http://localhost:8081/portfolio/v1',
  cloudinary: {
    cloudName: 'dct6fuenh',
    uploadPreset: 'portfolio_unsigned', // Create this in Cloudinary dashboard
  },
};
