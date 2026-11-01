import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { SELF_HOSTED } from '@/api/backend';
import { createSelfHostedClient } from '@/api/selfhostedClient';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Con VITE_BACKEND=selfhosted (despliegue con Docker, ver docs/) la aplicación usa la API propia;
// en cualquier otro caso se comporta exactamente como antes, con Base44.
export const base44 = SELF_HOSTED
  ? createSelfHostedClient()
  : createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: '',
      requiresAuth: false,
      appBaseUrl
    });
