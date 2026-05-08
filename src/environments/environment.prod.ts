export const environment = {
  production: true,
  // VPS backend with /portfolio prefix
  apiBaseUrl: 'https://ec2-13-51-63-171.eu-north-1.compute.amazonaws.com/portfolio/api/v1',
  cloudinary: {
    cloudName: 'dct6fuenh',
    uploadPreset: 'portfolio_unsigned', // Create this in Cloudinary dashboard
  },
};
