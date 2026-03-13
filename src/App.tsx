import { useState } from 'react';
import { useSeasonData } from './hooks/useSeasonData';
import DriversTable from './components/DriversTable';
import ConstructorsTable from './components/ConstructorsTable';
import PricesTable from './components/PricesTable';
import type { TabId } from './types';

const tabs: { id: TabId; label: string }[] = [
  { id: 'prices', label: 'Prices' },
  { id: 'drivers', label: 'Drivers' },
  { id: 'constructors', label: 'Constructors' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('prices');
  const { season, drivers, constructors, loading, error } = useSeasonData();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-bold text-lg">F1</span>
              <h1 className="text-base sm:text-lg font-semibold text-white">
                Fantasy Points Tracker
              </h1>
            </div>
            {season && (
              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                {season.year}
              </span>
            )}
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-1 mt-3 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white border-b-2 border-red-500'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading season data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && season && (
          <>
            {activeTab === 'drivers' && (
              <DriversTable drivers={drivers} races={season.races} />
            )}
            {activeTab === 'constructors' && (
              <ConstructorsTable constructors={constructors} races={season.races} />
            )}
            {activeTab === 'prices' && (
              <PricesTable
                drivers={drivers}
                constructors={constructors}
                races={season.races}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 mt-auto">
        <p className="text-center text-xs text-gray-500">
          Data sourced from{' '}
          <a
            href="https://fantasy.formula1.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white underline"
          >
            F1 Fantasy
          </a>
          {' · '}Not affiliated with Formula 1
        </p>
      </footer>
    </div>
  );
}
