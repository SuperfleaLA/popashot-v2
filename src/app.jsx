import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  Dribbble, 
  ChevronRight, 
  DollarSign, 
  TrendingDown, 
  User as UserIcon,
  Timer,
  CheckCircle2,
  X,
  Loader2,
  Zap,
  Play,
  ArrowRight,
  LogOut,
  Wallet,
  Star,
  Medal,
  AlertCircle
} from 'lucide-react';

const HOUSE_RAKE = 0.10;
const INITIAL_PLAYERS = 10;
const CONTEST_OPTIONS = [2, 5, 10, 20, 50];
const ROUND_START_TIMEOUT = 30;
const POST_ROUND_WAIT = 30;

const App = () => {
  const [balance, setBalance] = useState(1000.00);
  const [gameState, setGameState] = useState('selection'); 
  const [selectedBuyIn, setSelectedBuyIn] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [waitingPlayers, setWaitingPlayers] = useState(0);
  
  const [currentRound, setCurrentRound] = useState(1);
  const [players, setPlayers] = useState([]);
  const [postRoundTimer, setPostRoundTimer] = useState(POST_ROUND_WAIT);
  const [lobbyTimer, setLobbyTimer] = useState(ROUND_START_TIMEOUT);
  const [userReady, setUserReady] = useState(false);
  const [readyCount, setReadyCount] = useState(0);

  const userObject = players.find(p => p.name.includes("You"));
  const isUserEliminated = userObject?.isEliminated;
  const prizePool = INITIAL_PLAYERS * (selectedBuyIn || 0) * (1 - HOUSE_RAKE);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'GAME_COMPLETE') {
        finishShooting(event.data.score);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [players, currentRound, gameState]);

  useEffect(() => {
    let interval;
    if (gameState === 'waiting') {
      interval = setInterval(() => {
        setWaitingPlayers(prev => {
          if (prev >= INITIAL_PLAYERS) {
            clearInterval(interval);
            initGame();
            return prev;
          }
          return prev + 1;
        });
      }, 300); 
    }
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    let timer;
    if (gameState === 'standing') {
      setLobbyTimer(ROUND_START_TIMEOUT);
      timer = setInterval(() => {
        setLobbyTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            startBasketballRound();
            return 0;
          }
          return prev - 1;
        });
        setReadyCount(prev => (prev < INITIAL_PLAYERS - 1 && Math.random() > 0.7) ? prev + 1 : prev);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState]);

  useEffect(() => {
    let timer;
    if (gameState === 'post_round') {
      setPostRoundTimer(POST_ROUND_WAIT);
      timer = setInterval(() => {
        setPostRoundTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            proceedToNextRound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState]);

  const handleSelectContest = (amount) => {
    setSelectedBuyIn(amount);
    setShowConfirm(true);
  };

  const confirmJoin = () => {
    setBalance(prev => prev - selectedBuyIn);
    setShowConfirm(false);
    setWaitingPlayers(1); 
    setGameState('waiting');
  };

  const initGame = () => {
    const newPlayers = Array.from({ length: INITIAL_PLAYERS }, (_, i) => ({
      id: i + 1,
      name: i === 0 ? "You (User)" : `Baller ${i + 1}`,
      points: [], 
      totalPoints: 0,
      isEliminated: false,
      eliminatedAt: null
    }));
    setPlayers(newPlayers);
    setCurrentRound(1);
    setReadyCount(0);
    setUserReady(false);
    setGameState('standing');
  };

  const handleUserReady = () => {
    if (!userReady) {
      setUserReady(true);
      setReadyCount(INITIAL_PLAYERS); 
      setTimeout(() => startBasketballRound(), 500);
    }
  };

  const startBasketballRound = () => {
    if (isUserEliminated) {
      finishShooting();
    } else {
      setGameState('playing_game');
    }
  };

  const finishShooting = (userScore = null) => {
    setPlayers(currentPlayers => {
      const updatedPlayers = currentPlayers.map(p => {
        if (p.isEliminated) return p;
        let roundPoints = (p.name === "You (User)" && userScore !== null) 
          ? userScore 
          : Math.floor(Math.random() * 15) + 5; 

        const newPoints = [...p.points, roundPoints];
        return {
          ...p,
          points: newPoints,
          totalPoints: newPoints.reduce((a, b) => a + b, 0)
        };
      });

      setGameState('cut_reveal_delay');
      setTimeout(() => {
        processElimination(updatedPlayers);
      }, 1500);

      return updatedPlayers;
    });
  };

  const processElimination = (playersAtEndOfRound) => {
    const activePlayersBeforeCut = playersAtEndOfRound.filter(p => !p.isEliminated);
    const survivalTargets = { 1: 6, 2: 4, 3: 2, 4: 1 };
    const targetCount = survivalTargets[currentRound];
    
    // Sort descending by total score
    const sortedActive = [...activePlayersBeforeCut].sort((a, b) => b.totalPoints - a.totalPoints);

    // Determine the threshold score. 
    // If target is top 6, the score of the 6th person is the baseline.
    const thresholdPlayer = sortedActive[targetCount - 1];
    const thresholdScore = thresholdPlayer ? thresholdPlayer.totalPoints : 0;

    const finalPlayers = playersAtEndOfRound.map((p) => {
      if (p.isEliminated) return p;
      
      // RULE: All participants with a score equal to or higher than 
      // the lowest total score that moves on survive.
      const survives = p.totalPoints >= thresholdScore;

      if (!survives) {
        return { ...p, isEliminated: true, eliminatedAt: currentRound };
      }
      return p;
    });

    // Re-rank for display
    const rankedList = [...finalPlayers].sort((a, b) => {
      if (a.isEliminated && !b.isEliminated) return 1;
      if (!a.isEliminated && b.isEliminated) return -1;
      return b.totalPoints - a.totalPoints;
    });

    setPlayers(rankedList);

    const survivors = rankedList.filter(p => !p.isEliminated);
    
    // Game ends if we finished round 4 OR if only one person (or group of tied winners) is left.
    if (currentRound === 4 || survivors.length <= 1) {
      // Logic for split pots if there's a tie for first place at the very end
      const winners = survivors;
      if (winners.some(w => w.name.includes("You"))) {
        const share = prizePool / winners.length;
        setBalance(prev => prev + share);
      }
      setGameState('finished');
    } else {
      setGameState('post_round');
    }
  };

  const proceedToNextRound = () => {
    setCurrentRound(prev => prev + 1);
    setReadyCount(0); 
    setUserReady(false);
    setGameState('standing');
  };

  const exitToLobby = () => {
    setGameState('selection');
    setSelectedBuyIn(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* SELECTION UI */}
        {gameState === 'selection' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 py-6">
            <div className="flex justify-between items-center bg-neutral-900/50 border border-neutral-800 p-4 rounded-3xl mb-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                  <Wallet size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Account Balance</p>
                  <p className="text-xl font-black font-mono text-emerald-400">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
              </div>
            </div>

            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3 shadow-2xl shadow-orange-900/40">
                <Dribbble size={48} className="text-white" />
              </div>
              <h1 className="text-6xl font-black tracking-tighter italic uppercase mb-2 text-white">Elimination Golf</h1>
              <p className="text-neutral-500 font-bold tracking-widest uppercase text-xs">The High-Stakes Survival Tournament</p>
            </div>

            <div className="grid gap-4 max-w-md mx-auto">
              {CONTEST_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  disabled={balance < amount}
                  onClick={() => handleSelectContest(amount)}
                  className={`group bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 p-6 rounded-3xl flex justify-between items-center transition-all active:scale-95 ${balance < amount ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-neutral-950 rounded-xl flex items-center justify-center text-emerald-500">
                      <DollarSign size={24} />
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-black">${amount} Entry</p>
                      <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Prize: ${(amount * 10 * (1-HOUSE_RAKE)).toFixed(0)}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-neutral-700 group-hover:text-orange-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* WAITING ROOM */}
        {gameState === 'waiting' && (
          <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in duration-300">
            <div className="relative w-40 h-40 mb-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-neutral-900" />
                <circle 
                  cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="8" 
                  strokeDasharray={440} strokeDashoffset={440 - (440 * waitingPlayers) / 10}
                  className="text-orange-500 transition-all duration-300" strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black italic">{waitingPlayers}</span>
                <span className="text-[10px] text-neutral-500 font-black uppercase tracking-tighter">Players</span>
              </div>
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tight">Joining Lobby...</h2>
          </div>
        )}

        {/* STANDING ROOM */}
        {gameState === 'standing' && (
          <div className="animate-in fade-in duration-500">
            <div className="bg-neutral-900 border border-neutral-800 rounded-[40px] p-8 md:p-12 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Zap size={200} className="text-orange-500" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="text-center md:text-left">
                  <span className="bg-orange-600/20 text-orange-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-500/30 mb-4 inline-block">
                    Tournament Round {currentRound}
                  </span>
                  <h2 className="text-6xl font-black italic uppercase leading-none mb-2 tracking-tighter">
                    {isUserEliminated ? "Spectating" : "Standing Room"}
                  </h2>
                  <p className="text-neutral-400 font-medium">
                    {isUserEliminated ? "Watching the remaining survivors." : "Wait for others or bypass to start now."}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-4 min-w-[200px]">
                  <div className="text-center">
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-tighter mb-1">Round Starts In</p>
                    <p className="text-5xl font-mono font-black text-orange-500">:{lobbyTimer.toString().padStart(2, '0')}</p>
                  </div>
                  
                  {!isUserEliminated ? (
                    <button 
                      onClick={handleUserReady}
                      disabled={userReady}
                      className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 ${
                        userReady ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-xl shadow-orange-900/40'
                      }`}
                    >
                      {userReady ? <CheckCircle2 size={24} className="animate-bounce" /> : <Play size={24} />}
                      {userReady ? 'Starting...' : 'Enter Round'}
                    </button>
                  ) : (
                    <button 
                      onClick={exitToLobby}
                      className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 border border-neutral-700"
                    >
                      <LogOut size={20} />
                      Exit Game
                    </button>
                  )}
                  
                  <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">{readyCount}/10 Players Ready</p>
                </div>
              </div>

              <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-4">
                {players.filter(p => !p.isEliminated).map((p, i) => {
                   const isReady = i < readyCount;
                   return (
                    <div key={p.id} className={`p-4 rounded-2xl border transition-all ${
                      isReady ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-neutral-950/50 border-neutral-800'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <UserIcon size={14} className={isReady ? 'text-emerald-500' : 'text-neutral-700'} />
                        {isReady && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                      </div>
                      <p className={`text-xs font-bold truncate ${isReady ? 'text-white' : 'text-neutral-600'}`}>
                        {p.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* GAME FRAME */}
        {gameState === 'playing_game' && (
          <div className="animate-in zoom-in duration-300">
            <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-t-3xl border-b-0 flex justify-between items-center px-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Live Round {currentRound}</span>
              </div>
              <button onClick={() => finishShooting()} className="text-[10px] font-black uppercase text-neutral-500 hover:text-white transition-colors">Skip Round</button>
            </div>
            <div className="aspect-video w-full bg-black rounded-b-3xl border border-neutral-800 overflow-hidden shadow-2xl">
              <iframe src="basketball_game.html" className="w-full h-full border-none" title="Basketball Round" />
            </div>
          </div>
        )}

        {/* CUT REVEAL DELAY */}
        {gameState === 'cut_reveal_delay' && (
          <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="animate-spin text-orange-500 mb-6" size={60} />
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Calculating Results</h2>
            <p className="text-neutral-500 font-bold uppercase text-[10px] tracking-widest mt-2">Checking for ties and processing scores...</p>
          </div>
        )}

        {/* POST-ROUND SUMMARY */}
        {gameState === 'post_round' && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-neutral-900 p-8 rounded-[40px] border border-neutral-800 gap-8">
              <div>
                <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none">Round {currentRound} Summary</h2>
                {isUserEliminated && userObject?.eliminatedAt === currentRound ? (
                  <p className="text-red-500 font-black uppercase text-xs tracking-widest mt-2">You were eliminated this round.</p>
                ) : isUserEliminated ? (
                  <p className="text-neutral-500 font-black uppercase text-xs tracking-widest mt-2">Watching as a spectator.</p>
                ) : (
                  <p className="text-emerald-500 font-black uppercase text-xs tracking-widest mt-2 flex items-center gap-2">
                    <CheckCircle2 size={16} /> You survived the cut!
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-neutral-500 mb-1">Next Round In</p>
                  <p className="font-mono font-bold text-3xl leading-none text-orange-500">:{postRoundTimer.toString().padStart(2, '0')}</p>
                </div>
                
                {!isUserEliminated ? (
                  <button 
                    onClick={proceedToNextRound}
                    className="bg-white text-black hover:bg-neutral-200 px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-white/10"
                  >
                    Continue <ArrowRight size={20} />
                  </button>
                ) : (
                  <button 
                    onClick={exitToLobby}
                    className="bg-red-600 text-white hover:bg-red-500 px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/40"
                  >
                    Exit Tournament <LogOut size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Tie Alert (Visible if survivors > target) */}
            {players.filter(p => !p.isEliminated).length > {1:6, 2:4, 3:2, 4:1}[currentRound] && (
               <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-3xl flex items-center gap-3 text-orange-500">
                 <AlertCircle size={20} />
                 <p className="text-xs font-black uppercase tracking-widest">Tie detected! Extra players moved on to next round.</p>
               </div>
            )}

            <div className="bg-neutral-900 border border-neutral-800 rounded-[40px] overflow-hidden shadow-2xl">
              <div className="grid grid-cols-12 bg-neutral-800/50 p-6 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                <div className="col-span-1">Rank</div>
                <div className="col-span-6">Player</div>
                <div className="col-span-2 text-center">RD {currentRound} Score</div>
                <div className="col-span-3 text-right">Total Points</div>
              </div>
              <div className="divide-y divide-neutral-800/50">
                {players.map((p, idx) => (
                  <div key={p.id} className={`grid grid-cols-12 p-6 items-center transition-all ${
                    p.isEliminated ? 'opacity-30 grayscale bg-black/20' : 'hover:bg-neutral-800/20'
                  }`}>
                    <div className="col-span-1 font-mono text-neutral-600">{idx + 1}</div>
                    <div className="col-span-6 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.name.includes("You") ? "bg-orange-600" : "bg-neutral-800"}`}>
                        <UserIcon size={18} className="text-white" />
                      </div>
                      <span className={`font-black uppercase tracking-tight text-lg ${p.name.includes("You") ? (p.isEliminated ? "text-red-400" : "text-orange-500") : ""}`}>
                        {p.name}
                      </span>
                      {p.isEliminated && p.eliminatedAt === currentRound && <span className="text-[8px] bg-red-600/20 text-red-500 px-2 py-0.5 rounded-md font-black uppercase">Cut</span>}
                    </div>
                    <div className="col-span-2 text-center font-bold text-white text-xl">
                      {p.points[currentRound - 1] ?? 0}
                    </div>
                    <div className="col-span-3 text-right font-black text-2xl font-mono text-orange-500">
                      {p.totalPoints}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FINISHED SCREEN */}
        {gameState === 'finished' && (
          <div className="animate-in zoom-in duration-500 space-y-8">
            <div className="bg-neutral-900 border-2 border-orange-600/50 rounded-[40px] p-12 text-center shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50" />
              
              <Trophy size={100} className="mx-auto text-orange-500 mb-6 drop-shadow-[0_0_20px_rgba(249,115,22,0.5)]" />
              
              <div className="mb-8">
                <h1 className="text-2xl text-neutral-400 font-black uppercase tracking-widest mb-2">
                  {players.filter(p => !p.isEliminated).length > 1 ? "Joint Champions" : "Tournament Champion"}
                </h1>
                <div className="flex flex-col items-center justify-center gap-2">
                  {players.filter(p => !p.isEliminated).map(winner => (
                    <div key={winner.id} className="flex items-center gap-4">
                      <Star className="text-orange-500 fill-orange-500" size={16} />
                      <p className="text-6xl font-black italic tracking-tighter uppercase text-white leading-tight">
                        {winner.name}
                      </p>
                      <Star className="text-orange-500 fill-orange-500" size={16} />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
                <div className="bg-neutral-950 border border-neutral-800 px-8 py-6 rounded-3xl text-center">
                  <p className="text-[10px] text-neutral-500 uppercase font-black mb-1">Total Prize Pool</p>
                  <p className={`text-4xl font-black font-mono text-emerald-400`}>
                    ${prizePool.toFixed(0)}
                  </p>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 px-8 py-6 rounded-3xl text-center">
                  <p className="text-[10px] text-neutral-500 uppercase font-black mb-1">Final Score</p>
                  <p className="text-4xl font-black font-mono text-orange-500">
                    {players.find(p => !p.isEliminated)?.totalPoints || 0}
                  </p>
                </div>
              </div>

              {players.find(p => !p.isEliminated)?.name.includes("You") ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl mb-10 max-w-sm mx-auto">
                  <p className="text-emerald-500 font-black uppercase text-xs tracking-widest">
                    {players.filter(p => !p.isEliminated).length > 1 ? "Shared pot added to balance!" : "Winnings added to balance!"}
                  </p>
                </div>
              ) : (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl mb-10 max-w-sm mx-auto">
                   <p className="text-red-500 font-black uppercase text-xs tracking-widest">Better luck next time!</p>
                </div>
              )}

              <button 
                onClick={exitToLobby} 
                className="w-full max-w-md bg-orange-600 hover:bg-orange-500 text-white py-6 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-900/30 active:scale-95 mx-auto"
              >
                Return to Lobby
              </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-[40px] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-neutral-800">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Final Tournament Standings</h3>
              </div>
              <div className="grid grid-cols-12 bg-neutral-800/50 p-6 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">Player</div>
                <div className="col-span-3 text-center">Status</div>
                <div className="col-span-3 text-right">Final Score</div>
              </div>
              <div className="divide-y divide-neutral-800/50">
                {players.map((p, idx) => (
                  <div key={p.id} className={`grid grid-cols-12 p-6 items-center transition-all ${
                    p.isEliminated ? 'bg-black/20' : 'bg-orange-600/5'
                  }`}>
                    <div className="col-span-1 flex items-center gap-2">
                       {!p.isEliminated ? <Medal size={16} className="text-orange-500" /> : <span className="font-mono text-neutral-600">{idx + 1}</span>}
                    </div>
                    <div className="col-span-5 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.name.includes("You") ? "bg-orange-600" : "bg-neutral-800"}`}>
                        <UserIcon size={14} className="text-white" />
                      </div>
                      <span className={`font-black uppercase tracking-tight text-base ${p.name.includes("You") ? "text-orange-500" : "text-white"}`}>
                        {p.name}
                      </span>
                    </div>
                    <div className="col-span-3 text-center">
                      {!p.isEliminated ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-emerald-500/30">Champion</span>
                      ) : (
                        <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">Out Round {p.eliminatedAt}</span>
                      )}
                    </div>
                    <div className="col-span-3 text-right font-black text-xl font-mono text-white">
                      {p.totalPoints}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70 animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-[32px] p-8 shadow-2xl">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-orange-600/10 rounded-full flex items-center justify-center text-orange-500">
                   <DollarSign size={32} />
                </div>
              </div>
              <h3 className="text-3xl font-black uppercase italic mb-2 text-center leading-tight">Join for ${selectedBuyIn}?</h3>
              <p className="text-center text-neutral-500 text-xs font-bold uppercase tracking-widest mb-8">Current Balance: ${balance.toFixed(2)}</p>
              
              <div className="space-y-3">
                <button 
                  onClick={confirmJoin} 
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-900/20 active:scale-95 transition-all"
                >
                  Confirm Entry
                </button>
                <button 
                  onClick={() => setShowConfirm(false)} 
                  className="w-full bg-neutral-800 hover:bg-neutral-700 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-neutral-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;