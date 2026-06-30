export const getLocalApiURL = () => {
  return process.env.NEXT_PUBLIC_LOCAL_API_URL || 'http://localhost:4000';
};

export const getRemoteApiURL = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'https://api.easystock.com';
};
