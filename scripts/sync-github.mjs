import { syncGitHubData } from '../src/services/portfolioData.js';

syncGitHubData()
  .then(() => {
    console.log('[sync] Concluído com sucesso.');
  })
  .catch((err) => {
    console.error('[sync] Erro:', err);
    process.exit(1);
  });
