export const environment = {
  production: true,
  // Cloudflare Tunnel (valid SSL) - Note: Temporary URL, will change on restart
  apiBaseUrl: 'https://vps.alexabena.me/portfolio',
  cloudinary: {
    cloudName: 'dct6fuenh',
    uploadPreset: 'portfolio_unsigned', // Create this in Cloudinary dashboard
  },
};
