import { I18nProvider } from '@/i18n';
import { PlayerStatsPage } from '@/pages/player-stats-page';

import './styles.css';

export default function App() {
  return (
    <I18nProvider>
      <PlayerStatsPage />
    </I18nProvider>
  );
}
