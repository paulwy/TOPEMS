import i18n from '@/i18n';
/**
 * Service Port Registry — Single Source of Truth
 * Synced with: config/services.yaml, docker/docker-compose.yml, deploy/nginx/topems.conf
 *
 * Any port change MUST update all three locations above.
 */

export interface ServicePort {
  name: string;
  port: number;
  description: string;
  category: string;
}
