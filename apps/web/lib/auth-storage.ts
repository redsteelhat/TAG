import { AuthResponse } from './api-client';

export function getAccessToken() {
  return localStorage.getItem('tag.accessToken');
}

export function persistAuthSession(authResponse: AuthResponse) {
  localStorage.setItem('tag.accessToken', authResponse.data.accessToken);
  localStorage.setItem('tag.refreshToken', authResponse.data.refreshToken);

  if (authResponse.data.user) {
    localStorage.setItem('tag.user', JSON.stringify(authResponse.data.user));
  }
}
