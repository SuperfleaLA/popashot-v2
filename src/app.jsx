import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  Target, 
  AlertCircle, 
  ChevronRight, 
  DollarSign, 
  TrendingDown, 
  User as UserIcon,
  Flag
} from 'lucide-react';

const ENTRY_FEE = 10;
const HOUSE_RAKE = 0.10;
const INITIAL_PLAYERS = 50;

const App = () => {
  const [currentHole, setCurrentHole] = useState(1);
  const [gameState, setGameState] = useState('lobby'); // 'lobby', 'playing', 'cut_reveal', 'finished'
  const [players, setPlayers] = useState([]);
  const [tournamentLog, setTournamentLog] = useState([]);

  // Initialize 50 players
  const initGame = () => {
    const newPlayers = Array.from({ length: INITIAL_PLAYERS }, (_, i) => ({
      id: i + 1,
      name: `Player ${i + 1}`,
      scores: [], 
      totalScore: 0,
      isEliminated: false,
      eliminatedAt: null,
      rank: 0,
      tiebreakerSeed: Math.random() 
    }));
    setPlayers(newPlayers);
    setCurrentHole(1);
    setGameState('playing');
  };

  const playHole = () => {
    const updatedPlayers = players.map(p => {
      if (p.isEliminated) return p;
      const holeScore = Math.floor(Math.random() * 4) + 3; 
      const newScores = [...p.scores, holeScore];
      return {
        ...p,
        scores: newScores,
        totalScore: newScores.reduce((a, b) => a + b, 0)
      };
    });

    const rankedPlayers = calculateRanks(updatedPlayers);
    setPlayers(rankedPlayers);
    setGameState('cut_reveal');
  };

  const calculateRanks = (playerList) => {
    return [...playerList].sort((a, b) => {
      if (a.isEliminated && !b.isEliminated) return 1;
      if (!a.isEliminated && b.isEliminated) return -1;
      if (a.totalScore !== b.totalScore) return a.totalScore - b.totalScore;
      const lastIdx = a.scores.length - 1;
      if (a.scores[lastIdx] !== b.scores[lastIdx]) return a.scores[lastIdx] - b.scores[lastIdx];
      return a.tiebreakerSeed - b.tiebreakerSeed;
    });
  };

  const processElimination = () => {
    let remainingActive = players.filter(p => !p.isEliminated);
    let eliminatedThisRound = [];
    
    let cutCount = 0;
    if (currentHole === 2) {
      cutCount = Math.floor(remainingActive.length / 2);
    } else if (currentHole > 2) {
      cutCount = Math.max(1, Math.ceil(remainingActive.length / (10 - currentHole)));
    }

    const newPlayers = players.map((p, index) => {
      const activeRank = players.filter(pl => !pl.isEliminated).indexOf(p);
      const isCurrentlyActive = !p.isEliminated;
      const shouldBeCut = isCurrentlyActive && (activeRank >= (remainingActive.length - cutCount));

      if (shouldBeCut) {
        eliminatedThisRound.push(p.name);
        return { ...p, isEliminated: true, eliminatedAt: currentHole };
      }
      return p;
    });

    setPlayers(newPlayers);
    setTournamentLog(prev => [...prev, { hole: currentHole, cut: eliminatedThisRound }]);

    if (currentHole === 9 || newPlayers.filter(p => !p.isEliminated).length <= 1) {
      setGameState('finished');
    } else {
      setCurrentHole(prev => prev + 1);
      setGameState('playing');
    }
  };

  const activePlayers = players.filter(p => !p.isEliminated);
  const prizePool = INITIAL_PLAYERS * ENTRY_FEE * (1 - HOUSE_RAKE);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Trophy className="text-yellow-500" />} label="Prize Pool" value={`$${prizePool.toFixed(2)}`} />
          <StatCard icon={<Users className="text-blue-500" />} label="Players Left" value={`${activePlayers.length}/${INITIAL_PLAYERS}`} />
          <StatCard icon={<Flag className="text-green-500" />} label="Current Hole" value={gameState === 'finished' ? 'Final' : currentHole} />
          <StatCard icon={<DollarSign className="text-emerald-500" />} label="Entry Fee" value={`$${ENTRY_FEE}`} />
        </div>

        {gameState === 'lobby' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <h1 className="text-4xl font-bold mb-4">Elimination Golf</h1>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              50 players enter. 2 holes of safety. Then, the bottom 50% are cut. 
            </p>
            <div className="flex flex-col gap-4 items-center">
              <button 
                onClick={initGame}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105"
              >
                Start Tournament
              </button>
              <a href="/basketball_game.html" className="text-orange-500 hover:underline text-sm font-bold uppercase tracking-widest mt-4">
                Switch to Basketball Court →
              </a>
            </div>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'cut_reveal') && (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold">Hole {currentHole} Leaderboard</h2>
              </div>
              <button 
                onClick={gameState === 'playing' ? playHole : processElimination}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  gameState === 'playing' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {gameState === 'playing' ? `Finish Hole ${currentHole}` : `Confirm Cut`}
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                {players.map((player, idx) => (
                  <div key={player.id} className={`grid grid-cols-12 p-4 items-center border-b border-slate-800 ${player.isEliminated ? 'opacity-40' : ''}`}>
                    <div className="col-span-1">{idx + 1}</div>
                    <div className="col-span-5 flex items-center gap-2">
                      <UserIcon size={16} />
                      <span>{player.name}</span>
                    </div>
                    <div className="col-span-3 text-center font-bold">{player.totalScore}</div>
                    <div className="col-span-3 text-right">
                      {player.isEliminated ? 'OUT' : 'ACTIVE'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
            <Trophy size={64} className="mx-auto text-yellow-500 mb-6" />
            <h1 className="text-4xl font-bold mb-4">Champion: {activePlayers[0]?.name}</h1>
            <p className="text-2xl text-emerald-400 font-mono mb-8">${prizePool.toFixed(2)}</p>
            <button onClick={() => setGameState('lobby')} className="bg-slate-800 px-8 py-3 rounded-xl">Play Again</button>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
    <div className="p-3 bg-slate-950 rounded-xl">{icon}</div>
    <div>
      <p className="text-xs text-slate-500 font-bold uppercase">{label}</p>
      <p className="text-xl font-mono font-bold">{value}</p>
    </div>
  </div>
);

export default App;