import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({path: path.join(__dirname, '../.env')});

import {ApplicationConfig, LmsBackendApplication} from './application';

export * from './application';

export async function main(options: ApplicationConfig = {}) {
  const app = new LmsBackendApplication(options);
  await app.boot();
  await app.start();

  const url = app.restServer.url;
  console.log(`🚀 LMS Backend Server is running at ${url}`);
  console.log(`📖 OpenAPI Explorer available at ${url}/explorer`);

  return app;
}

if (require.main === module) {
  // Run the application
  const config = {
    rest: {
      port: +(process.env.PORT ?? 3000),
      host: process.env.HOST || '127.0.0.1',
      gracePeriodForClose: 5000,
      openApiSpec: {
        setServersFromRequest: true,
      },
    },
  };
  main(config).catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });
}
