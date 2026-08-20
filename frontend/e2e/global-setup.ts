import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Aquí podemos añadir código para inicializar emuladores localmente
  // si no estamos corriendo en CI.
  if (!process.env.CI) {
    console.log('Local run detected, ensure Firebase emulators are running.');
  }
}

export default globalSetup;
