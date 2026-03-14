import { useSeasonData } from './hooks/useSeasonData';
import PricesTable from './components/PricesTable';

export default function App() {
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
                Fantasy Grid Notes
              </h1>
            </div>
            {season && (
              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                {season.year}
              </span>
            )}
          </div>


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
          <PricesTable
            drivers={drivers}
            constructors={constructors}
            races={season.races}
          />
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
