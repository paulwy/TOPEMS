export const sizeTokens = {
  containerMobile: '100%',
  formControlSm: '120px',
  formControlMd: '240px',
  formControlLg: '360px',
  drawerSm: '240px',
  drawerMd: '320px',
  inputHeightSm: '32px',
  inputHeightMd: '40px',
  inputHeightLg: '48px',
  cardHeight: '200px',
  tableHeaderHeight: '56px',
  modalWidthSm: '480px',
  modalWidthMd: '720px',
  modalWidthLg: '960px',
  sidebarWidth: '260px',
  sidebarWidthCollapsed: '72px',
  mobileToolbarHeight: '56px',
} as const;

export type SizeTokens = typeof sizeTokens;
