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
    
    const sortedActive = [...activePlayersBeforeCut].sort((a, b) => b.totalPoints - a.totalPoints);
    const thresholdPlayer = sortedActive[targetCount - 1];
    const thresholdScore = thresholdPlayer ? thresholdPlayer.totalPoints : 0;

    const finalPlayers = playersAtEndOfRound.map((p) => {
      if (p.isEliminated) return p;
      const survives = p.totalPoints >= thresholdScore;
      if (!survives) {
        return { ...p, isEliminated: true, eliminatedAt: currentRound };
      }
      return p;
    });

    const rankedList = [...finalPlayers].sort((a, b) => {
      if (a.isEliminated && !b.isEliminated) return 1;
      if (!a.isEliminated && b.isEliminated) return -1;
      return b.totalPoints - a.totalPoints;
    });

    setPlayers(rankedList);
    const survivors = rankedList.filter(p => !p.isEliminated);
    
    if (currentRound === 4 || survivors.length <= 1) {
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
    <div className="h-screen bg-neutral-50 text-neutral-900 overflow-hidden p-4 md:p-6 font-sans flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl h-full flex flex-col justify-center">
        
        {/* SELECTION UI - LIGHT VERSION */}
        {gameState === 'selection' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full max-h-[800px]">
            <div className="flex justify-between items-center bg-white border border-neutral-200 p-3 rounded-2xl mb-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white rotate-3 shadow-orange-200 shadow-lg">
                  <Dribbble size={18} />
                </div>
                <h1 className="text-xl font-black italic uppercase tracking-tighter text-neutral-800">Hoops Eliminator</h1>
              </div>
              <div className="flex items-center gap-2 pr-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                <Wallet size={14} className="text-emerald-600" />
                <p className="text-lg font-black font-mono text-emerald-700">${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
            </div>

            <div className="text-center mb-6 shrink-0">
               <p className="text-neutral-400 font-bold tracking-[0.2em] uppercase text-[10px] mb-2">The High-Stakes Survival Tournament</p>
               <h2 className="text-4xl font-black italic tracking-tighter uppercase text-neutral-900 leading-none">Select Your Entry</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 overflow-y-auto px-1 py-1 custom-scrollbar">
              {CONTEST_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  disabled={balance < amount}
                  onClick={() => handleSelectContest(amount)}
                  className={`group bg-white border border-neutral-200 hover:border-orange-400 p-4 rounded-2xl flex justify-between items-center transition-all active:scale-95 shadow-sm hover:shadow-md ${balance < amount ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-emerald-600">
                      <DollarSign size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-xl font-black text-neutral-800">${amount}</p>
                      <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">Win Up To ${(amount * 10 * (1-HOUSE_RAKE)).toFixed(0)}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-neutral-300 group-hover:text-orange-500 transition-colors" />
                </button>
              ))}
            </div>

            <div className="mt-auto pt-4 border-t border-neutral-200 text-center">
               <div className="flex items-center justify-center gap-4 text-neutral-400 text-[10px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-1"><Users size={12}/> 10 Players</div>
                  <div className="flex items-center gap-1"><TrendingDown size={12}/> 4 Rounds</div>
                  <div className="flex items-center gap-1"><Trophy size={12}/> 1 Winner</div>
               </div>
            </div>
          </div>
        )}

        {/* WAITING ROOM */}
        {gameState === 'waiting' && (
          <div className="flex flex-col items-center justify-center h-full animate-in zoom-in duration-300">
            <div className="relative w-40 h-40 mb-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-neutral-200" />
                <circle 
                  cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="8" 
                  strokeDasharray={440} strokeDashoffset={440 - (440 * waitingPlayers) / 10}
                  className="text-orange-500 transition-all duration-300" strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black italic text-neutral-800">{waitingPlayers}</span>
                <span className="text-[10px] text-neutral-400 font-black uppercase tracking-tighter">Players</span>
              </div>
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tight text-center text-neutral-800">Joining Lobby...</h2>
          </div>
        )}

        {/* STANDING ROOM - LIGHT VERSION */}
        {gameState === 'standing' && (
          <div className="animate-in fade-in duration-500 h-full flex flex-col">
            <div className="bg-white border border-neutral-200 rounded-[32px] p-6 md:p-10 relative overflow-hidden shadow-xl flex flex-col flex-grow">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Zap size={160} className="text-orange-500" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                <div className="text-center md:text-left">
                  <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-200 mb-3 inline-block">
                    Tournament Round {currentRound}
                  </span>
                  <h2 className="text-5xl font-black italic uppercase leading-none mb-1 tracking-tighter text-neutral-800">
                    {isUserEliminated ? "Spectating" : "Standing Room"}
                  </h2>
                  <p className="text-neutral-500 text-sm font-medium">
                    {isUserEliminated ? "Watching the remaining survivors." : "Wait for others or bypass to start."}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3 min-w-[180px]">
                  <div className="text-center">
                    <p className="text-[9px] text-neutral-400 font-black uppercase tracking-tighter mb-0.5">Round Starts In</p>
                    <p className="text-4xl font-mono font-black text-orange-500">:{lobbyTimer.toString().padStart(2, '0')}</p>
                  </div>
                  
                  {!isUserEliminated ? (
                    <button 
                      onClick={handleUserReady}
                      disabled={userReady}
                      className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 ${
                        userReady ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-100'
                      }`}
                    >
                      {userReady ? <CheckCircle2 size={20} className="animate-bounce" /> : <Play size={20} />}
                      {userReady ? 'Starting...' : 'Enter Round'}
                    </button>
                  ) : (
                    <button 
                      onClick={exitToLobby}
                      className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 border border-neutral-200"
                    >
                      <LogOut size={18} />
                      Exit Game
                    </button>
                  )}
                  
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">{readyCount}/10 Players Ready</p>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 md:grid-cols-5 gap-3 overflow-y-auto custom-scrollbar pr-1">
                {players.filter(p => !p.isEliminated).map((p, i) => {
                   const isReady = i < readyCount;
                   return (
                    <div key={p.id} className={`p-3 rounded-xl border transition-all ${
                      isReady ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-neutral-50 border-neutral-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <UserIcon size={12} className={isReady ? 'text-emerald-500' : 'text-neutral-300'} />
                        {isReady && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      </div>
                      <p className={`text-[11px] font-bold truncate ${isReady ? 'text-emerald-900' : 'text-neutral-400'}`}>
                        {p.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* GAME FRAME — LIGHT THEMED WRAPPER */}
        {gameState === 'playing_game' && (
          <div className="animate-in zoom-in duration-300 h-full flex flex-col">
            <div className="bg-white border border-neutral-200 p-2 rounded-t-2xl border-b-0 flex justify-between items-center px-4 shrink-0 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Live Round {currentRound}</span>
              </div>
              <button onClick={() => finishShooting()} className="text-[9px] font-black uppercase text-neutral-400 hover:text-orange-500 transition-colors">Skip Round</button>
            </div>
            <div className="flex-grow w-full bg-neutral-900 rounded-b-2xl border border-neutral-200 overflow-hidden shadow-2xl min-h-[400px]">
              <iframe src="/basketball.html" className="w-full h-full border-none" title="Basketball Round" />
            </div>
          </div>
        )}

        {/* CUT REVEAL DELAY */}
        {gameState === 'cut_reveal_delay' && (
          <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="animate-spin text-orange-500 mb-6" size={48} />
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-neutral-800">Calculating Results</h2>
            <p className="text-neutral-400 font-bold uppercase text-[9px] tracking-widest mt-2">Checking for ties and processing scores...</p>
          </div>
        )}

        {/* POST-ROUND SUMMARY - LIGHT VERSION */}
        {gameState === 'post_round' && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-4 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[32px] border border-neutral-200 gap-6 shrink-0 shadow-sm">
              <div>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none text-neutral-800">Round {currentRound} Summary</h2>
                {isUserEliminated && userObject?.eliminatedAt === currentRound ? (
                  <p className="text-red-500 font-black uppercase text-[10px] tracking-widest mt-1">You were eliminated this round.</p>
                ) : isUserEliminated ? (
                  <p className="text-neutral-400 font-black uppercase text-[10px] tracking-widest mt-1">Watching as a spectator.</p>
                ) : (
                  <p className="text-emerald-600 font-black uppercase text-[10px] tracking-widest mt-1 flex items-center gap-2">
                    <CheckCircle2 size={14} /> You survived the cut!
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-neutral-400 mb-0.5">Next Round In</p>
                  <p className="font-mono font-bold text-2xl leading-none text-orange-500">:{postRoundTimer.toString().padStart(2, '0')}</p>
                </div>
                
                {!isUserEliminated ? (
                  <button 
                    onClick={proceedToNextRound}
                    className="bg-neutral-900 text-white hover:bg-neutral-800 px-6 py-3 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-neutral-200 text-xs"
                  >
                    Continue <ArrowRight size={16} />
                  </button>
                ) : (
                  <button 
                    onClick={exitToLobby}
                    className="bg-red-500 text-white hover:bg-red-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-100 text-xs"
                  >
                    Exit Tournament <LogOut size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-[32px] overflow-hidden shadow-xl flex-grow flex flex-col min-h-0">
              <div className="grid grid-cols-12 bg-neutral-50 p-4 text-[9px] font-black uppercase tracking-widest text-neutral-400 shrink-0 border-b border-neutral-100">
                <div className="col-span-1">Rank</div>
                <div className="col-span-6">Player</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-3 text-right">Total</div>
              </div>
              <div className="divide-y divide-neutral-100 overflow-y-auto flex-grow custom-scrollbar">
                {players.map((p, idx) => (
                  <div key={p.id} className={`grid grid-cols-12 p-4 items-center transition-all ${
                    p.isEliminated ? 'opacity-30 grayscale bg-neutral-50' : 'hover:bg-orange-50/30'
                  }`}>
                    <div className="col-span-1 font-mono text-[10px] text-neutral-400">{idx + 1}</div>
                    <div className="col-span-6 flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.name.includes("You") ? "bg-orange-500" : "bg-neutral-100"}`}>
                        <UserIcon size={14} className={p.name.includes("You") ? "text-white" : "text-neutral-400"} />
                      </div>
                      <span className={`font-black uppercase tracking-tight text-sm ${p.name.includes("You") ? (p.isEliminated ? "text-red-500" : "text-orange-600") : "text-neutral-700"}`}>
                        {p.name}
                      </span>
                      {p.isEliminated && p.eliminatedAt === currentRound && <span className="text-[7px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase ml-1">Cut</span>}
                    </div>
                    <div className="col-span-2 text-center font-bold text-neutral-800 text-base">
                      {p.points[currentRound - 1] ?? 0}
                    </div>
                    <div className="col-span-3 text-right font-black text-xl font-mono text-orange-500">
                      {p.totalPoints}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FINISHED SCREEN - LIGHT VERSION */}
        {gameState === 'finished' && (
          <div className="animate-in zoom-in duration-500 space-y-4 h-full flex flex-col">
            <div className="bg-white border-2 border-orange-200 rounded-[32px] p-8 text-center shadow-xl overflow-hidden relative shrink-0">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-30" />
              
              <Trophy size={60} className="mx-auto text-orange-500 mb-4 drop-shadow-[0_4px_12px_rgba(249,115,22,0.2)]" />
              
              <div className="mb-4">
                <h1 className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mb-1">
                  {players.filter(p => !p.isEliminated).length > 1 ? "Joint Champions" : "Tournament Champion"}
                </h1>
                <div className="flex flex-col items-center justify-center gap-1">
                  {players.filter(p => !p.isEliminated).map(winner => (
                    <div key={winner.id} className="flex items-center gap-3">
                      <Star className="text-orange-400 fill-orange-400" size={12} />
                      <p className="text-4xl font-black italic tracking-tighter uppercase text-neutral-900 leading-tight">
                        {winner.name}
                      </p>
                      <Star className="text-orange-400 fill-orange-400" size={12} />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto mb-6">
                <div className="bg-neutral-50 border border-neutral-100 px-4 py-3 rounded-2xl text-center shadow-inner">
                  <p className="text-[8px] text-neutral-400 uppercase font-black mb-0.5">Total Prize Pool</p>
                  <p className={`text-2xl font-black font-mono text-emerald-600`}>
                    ${prizePool.toFixed(0)}
                  </p>
                </div>
                <div className="bg-neutral-50 border border-neutral-100 px-4 py-3 rounded-2xl text-center shadow-inner">
                  <p className="text-[8px] text-neutral-400 uppercase font-black mb-0.5">Final Score</p>
                  <p className="text-2xl font-black font-mono text-orange-500">
                    {players.find(p => !p.isEliminated)?.totalPoints || 0}
                  </p>
                </div>
              </div>

              <button 
                onClick={exitToLobby} 
                className="w-full max-w-xs bg-neutral-900 hover:bg-neutral-800 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-neutral-200 active:scale-95 mx-auto text-xs"
              >
                Return to Lobby
              </button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-[32px] overflow-hidden shadow-xl flex-grow flex flex-col min-h-0">
              <div className="p-4 border-b border-neutral-100 shrink-0">
                <h3 className="text-lg font-black uppercase italic tracking-tighter text-neutral-800">Standings</h3>
              </div>
              <div className="grid grid-cols-12 bg-neutral-50 p-4 text-[9px] font-black uppercase tracking-widest text-neutral-400 shrink-0">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Player</div>
                <div className="col-span-3 text-center">Status</div>
                <div className="col-span-3 text-right">Score</div>
              </div>
              <div className="divide-y divide-neutral-50 overflow-y-auto flex-grow custom-scrollbar">
                {players.map((p, idx) => (
                  <div key={p.id} className={`grid grid-cols-12 p-4 items-center transition-all ${
                    p.isEliminated ? 'bg-neutral-50/50' : 'bg-orange-50/20'
                  }`}>
                    <div className="col-span-1 flex items-center gap-2">
                       {!p.isEliminated ? <Medal size={12} className="text-orange-500" /> : <span className="font-mono text-[10px] text-neutral-300">{idx + 1}</span>}
                    </div>
                    <div className="col-span-5 flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.name.includes("You") ? "bg-orange-500" : "bg-neutral-200"}`}>
                        <UserIcon size={12} className={p.name.includes("You") ? "text-white" : "text-neutral-400"} />
                      </div>
                      <span className={`font-black uppercase tracking-tight text-xs ${p.name.includes("You") ? "text-orange-600" : "text-neutral-700"}`}>
                        {p.name}
                      </span>
                    </div>
                    <div className="col-span-3 text-center">
                      {!p.isEliminated ? (
                        <span className="text-[8px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-emerald-200">Champ</span>
                      ) : (
                        <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">Out R{p.eliminatedAt}</span>
                      )}
                    </div>
                    <div className="col-span-3 text-right font-black text-lg font-mono text-neutral-800">
                      {p.totalPoints}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-white/60 animate-in fade-in duration-200">
            <div className="bg-white border border-neutral-200 w-full max-w-sm rounded-[32px] p-8 shadow-2xl">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 border border-orange-100">
                   <DollarSign size={32} />
                </div>
              </div>
              <h3 className="text-3xl font-black uppercase italic mb-2 text-center leading-tight text-neutral-800">Join for ${selectedBuyIn}?</h3>
              <p className="text-center text-neutral-400 text-xs font-bold uppercase tracking-widest mb-8">Current Balance: ${balance.toFixed(2)}</p>
              
              <div className="space-y-3">
                <button 
                  onClick={confirmJoin} 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-100 active:scale-95 transition-all"
                >
                  Confirm Entry
                </button>
                <button 
                  onClick={() => setShowConfirm(false)} 
                  className="w-full bg-neutral-100 hover:bg-neutral-200 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-neutral-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e5e5;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4d4d4;
        }
      `}} />
    </div>
  );
};

export default App;