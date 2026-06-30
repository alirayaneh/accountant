import { IS_SERVER_BUILD } from '@/lib/build-config';

export const getLocalApiURL = () => {
  return process.env.NEXT_PUBLIC_LOCAL_API_URL || 'http://localhost:4000';
};

/** Online / remote API base URL (no trailing slash). */
export const getRemoteApiURL = () => {
  // Server deploy: frontend + API on same domain (nginx → :4000)
  if (IS_SERVER_BUILD && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://api.easystock.com';
};
