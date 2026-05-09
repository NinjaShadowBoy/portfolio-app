export const environment = {
  production: true,
  // Cloudflare Tunnel (valid SSL) - Note: Temporary URL, will change on restart
  apiBaseUrl: 'https://rod-gospel-interactive-miller.trycloudflare.com/portfolio/api/v1',
  cloudinary: {
    cloudName: 'dct6fuenh',
    uploadPreset: 'portfolio_unsigned', // Create this in Cloudinary dashboard
  },
};
