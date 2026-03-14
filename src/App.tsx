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
          <>
            <p className="text-sm text-gray-400 mb-4">
              Find out how many points each driver and constructor needs to score in the next race to rise in price.
            </p>
            <PricesTable
              drivers={drivers}
              constructors={constructors}
              races={season.races}
            />

            {/* Formula explanation */}
            <section className="mt-8 border border-gray-800 rounded-xl bg-gray-900/50 px-4 py-5 text-xs text-gray-400 space-y-4">
              <h2 className="text-sm font-semibold text-gray-200">How price changes are calculated</h2>

              <p>
                After each race, every driver and constructor's price changes based on their recent performance.
                The game computes an <strong className="text-gray-300">Average Points Per Million</strong> using the last 3 races:
              </p>

              <pre className="bg-gray-950 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-300 overflow-x-auto">
{`Average Points Per Million = average(last 3 race points) ÷ current price`}
              </pre>

              <p>
                That ratio is then compared against four performance thresholds to decide how much the price moves:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="text-gray-300 border-b border-gray-700">
                      <th className="text-left py-1.5 pr-4">Performance</th>
                      <th className="text-left py-1.5 pr-4">Avg Pts / Million</th>
                      <th className="text-right py-1.5 pr-4">Price ≥ 18.5M</th>
                      <th className="text-right py-1.5">Price &lt; 18.5M</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-800">
                      <td className="py-1 pr-4 text-green-400">Great</td>
                      <td className="py-1 pr-4">≥ 1.195</td>
                      <td className="py-1 pr-4 text-right text-green-400">+0.3M</td>
                      <td className="py-1 text-right text-green-400">+0.6M</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-1 pr-4 text-green-400">Good</td>
                      <td className="py-1 pr-4">≥ 0.900</td>
                      <td className="py-1 pr-4 text-right text-green-400">+0.1M</td>
                      <td className="py-1 text-right text-green-400">+0.2M</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-1 pr-4 text-red-400">Poor</td>
                      <td className="py-1 pr-4">≥ 0.605</td>
                      <td className="py-1 pr-4 text-right text-red-400">−0.1M</td>
                      <td className="py-1 text-right text-red-400">−0.2M</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-4 text-red-400">Terrible</td>
                      <td className="py-1 pr-4">&lt; 0.605</td>
                      <td className="py-1 pr-4 text-right text-red-400">−0.3M</td>
                      <td className="py-1 text-right text-red-400">−0.6M</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                The <strong className="text-gray-300">"Pts needed"</strong> columns in the tables above show exactly how many points
                are required in the next race to reach each threshold — calculated as:
              </p>

              <pre className="bg-gray-950 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-300 overflow-x-auto">
{`Points needed = (threshold × current price × window size) − sum of recent race points`}
              </pre>

              <p className="text-gray-500">
                The window is the last 3 races (or fewer at the start of the season). A negative or zero value means the threshold is already met.
              </p>
            </section>
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
