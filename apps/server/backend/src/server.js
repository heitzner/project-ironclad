import { createApp } from './app.js';
import { config } from './config.js';

createApp().listen(config.port, () => {
  console.log(`IronClad booking API listening on port ${config.port}`);
});
