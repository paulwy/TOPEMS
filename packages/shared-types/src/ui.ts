export interface MenuItem {
  id: string;
  path: string;
  name: string;
  icon?: string;
  component?: string;
  children?: MenuItem[];
  permissions?: string[];
  hidden?: boolean;
  external?: boolean;
}
