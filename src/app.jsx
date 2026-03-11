import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Dribbble,
  ChevronRight,
  DollarSign,
  TrendingDown,
  User as UserIcon,
  CheckCircle2,
  Loader2,
  Zap,
  Play,
  ArrowRight,
  LogOut,
  Wallet,
  Star,
  Medal,
  Dumbbell,
  Clock,
  StopCircle
} from 'lucide-react';

const HOUSE_RAKE = 0.10;
const INITIAL_PLAYERS = 10;
const CONTEST_OPTIONS = [2, 5, 10, 20, 50];
const ROUND_START_TIMEOUT = 30;
const POST_ROUND_WAIT = 30;
const LOBBY_FILL_INTERVAL = 3000; // 1 new player joins every 3 seconds
const PRACTICE_WARNING_DURATION = 30; // seconds of warning once lobby is full

const App = () => {
  const [balance, setBalance] = useState(1000.00);
  const [gameState, setGameState] = useState('selection');
  const [selectedBuyIn, setSelectedBuyIn] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Starts at 1 (the user) when they confirm, counts up to INITIAL_PLAYERS
  const [waitingPlayers, setWaitingPlayers] = useState(0);

  const [currentRound, setCurrentRound] = useState(1);
  const [players, setPlayers] = useState([]);
  const [postRoundTimer, setPostRoundTimer] = useState(POST_ROUND_WAIT);
  const [lobbyTimer, setLobbyTimer] = useState(ROUND_START_TIMEOUT);
  const [userReady, setUserReady] = useState(false);
  const [readyCount, setReadyCount] = useState(0);

  // 'filling'  → lobby still filling, user shoots freely, no timer pressure
  // 'warning'  → lobby full, 30s countdown shown, then practice ends
  const [practicePhase, setPracticePhase] = useState('filling');
  const [practiceWarningTimer, setPracticeWarningTimer] = useState(PRACTICE_WARNING_DURATION);
  const [showPracticeOver, setShowPracticeOver] = useState(false);

  const userObject = players.find(p => p.name.includes("You"));
  const isUserEliminated = userObject?.isEliminated;
  const prizePool = INITIAL_PLAYERS * (selectedBuyIn || 0) * (1 - HOUSE_RAKE);

  // ── Message listener ────────────────────────────────────────────────────
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data) return;
      if (event.data.type === 'GAME_COMPLETE') {
        if (gameState === 'practice') return; // discard practice scores
        finishShooting(event.data.score);
      }
      if (event.data.type === 'PRACTICE_COMPLETE') {
        exitPracticeEarly();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [players, currentRound, gameState]);

  // ── Lobby fill: +1 player every 3s while in practice/filling ───────────
  useEffect(() => {
    if (gameState !== 'practice' || practicePhase !== 'filling') return;

    const interval = setInterval(() => {
      setWaitingPlayers(prev => {
        const next = prev + 1;
        if (next >= INITIAL_PLAYERS) {
          clearInterval(interval);
          setPracticePhase('warning');
          setPracticeWarningTimer(PRACTICE_WARNING_DURATION);
          return INITIAL_PLAYERS;
        }
        return next;
      });
    }, LOBBY_FILL_INTERVAL);

    return () => clearInterval(interval);
  }, [gameState, practicePhase]);

  // ── 30s warning countdown once lobby is full ────────────────────────────
  useEffect(() => {
    if (gameState !== 'practice' || practicePhase !== 'warning') return;

    const timer = setInterval(() => {
      setPracticeWarningTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endPractice();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, practicePhase]);

  // ── Standing room lobby timer ───────────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'standing') return;
    setLobbyTimer(ROUND_START_TIMEOUT);

    const timer = setInterval(() => {
      setLobbyTimer(prev => {
        if (prev <= 1) { clearInterval(timer); startBasketballRound(); return 0; }
        return prev - 1;
      });
      setReadyCount(prev =>
        prev < INITIAL_PLAYERS - 1 && Math.random() > 0.7 ? prev + 1 : prev
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // ── Post-round auto-advance ─────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'post_round') return;
    setPostRoundTimer(POST_ROUND_WAIT);

    const timer = setInterval(() => {
      setPostRoundTimer(prev => {
        if (prev <= 1) { clearInterval(timer); proceedToNextRound(); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // ── Action handlers ─────────────────────────────────────────────────────

  const handleSelectContest = (amount) => {
    setSelectedBuyIn(amount);
    setShowConfirm(true);
  };

  const confirmJoin = () => {
    setBalance(prev => prev - selectedBuyIn);
    setShowConfirm(false);
    setWaitingPlayers(1);          // user is player #1
    setPracticePhase('filling');
    setGameState('practice');      // straight into practice — no waiting screen
  };

  const endPractice = () => {
    setShowPracticeOver(true);
    setTimeout(() => {
      setShowPracticeOver(false);
      initGame();
    }, 2500);
  };

  const exitPracticeEarly = () => {
    setGameState('practice_lobby_wait');
  };

  const initGame = () => {
    const newPlayers = Array.from({ length: INITIAL_PLAYERS }, (_, i) => ({
      id: i + 1,
      name: i === 0 ? "You (User)" : `Baller ${i + 1}`,
      points: [],
      totalPoints: 0,
      currentRoundScore: 0,
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
    if (isUserEliminated) finishShooting();
    else setGameState('playing_game');
  };

  const finishShooting = (userScore = null) => {
    setPlayers(currentPlayers => {
      const updatedPlayers = currentPlayers.map(p => {
        if (p.isEliminated) return p;
        const roundPoints =
          p.name === "You (User)" && userScore !== null
            ? userScore
            : Math.floor(Math.random() * 15) + 5;
        const newPointsHistory = [...p.points, roundPoints];
        return {
          ...p,
          points: newPointsHistory,
          currentRoundScore: roundPoints,
          totalPoints: newPointsHistory.reduce((a, b) => a + b, 0)
        };
      });
      setGameState('cut_reveal_delay');
      setTimeout(() => processElimination(updatedPlayers), 1500);
      return updatedPlayers;
    });
  };

  const processElimination = (playersAtEndOfRound) => {
    const activePlayersBeforeCut = playersAtEndOfRound.filter(p => !p.isEliminated);
    const survivalTargets = { 1: 6, 2: 4, 3: 2, 4: 1 };
    const targetCount = survivalTargets[currentRound];

    const sortedActive = [...activePlayersBeforeCut].sort((a, b) =>
      b.currentRoundScore !== a.currentRoundScore
        ? b.currentRoundScore - a.currentRoundScore
        : b.totalPoints - a.totalPoints
    );

    const thresholdPlayer = sortedActive[targetCount - 1];
    const thresholdScore = thresholdPlayer?.currentRoundScore ?? 0;
    const thresholdTotal = thresholdPlayer?.totalPoints ?? 0;

    const finalPlayers = playersAtEndOfRound.map(p => {
      if (p.isEliminated) return p;
      const survives =
        p.currentRoundScore > thresholdScore ||
        (p.currentRoundScore === thresholdScore && p.totalPoints >= thresholdTotal);
      return survives ? p : { ...p, isEliminated: true, eliminatedAt: currentRound };
    });

    const rankedList = [...finalPlayers].sort((a, b) => {
      if (a.isEliminated && !b.isEliminated) return 1;
      if (!a.isEliminated && b.isEliminated) return -1;
      if (b.currentRoundScore !== a.currentRoundScore) return b.currentRoundScore - a.currentRoundScore;
      return b.totalPoints - a.totalPoints;
    });

    setPlayers(rankedList);
    const survivors = rankedList.filter(p => !p.isEliminated);

    if (currentRound === 4 || survivors.length <= 1) {
      if (survivors.some(w => w.name.includes("You"))) {
        setBalance(prev => prev + prizePool / survivors.length);
      }
      setGameState('finished');
    } else {
      setGameState('post_round');
    }
  };

  const proceedToNextRound = () => {
    setCurrentRound(prev => prev + 1);
    setPlayers(prev => prev.map(p => ({ ...p, currentRoundScore: 0 })));
    setReadyCount(0);
    setUserReady(false);
    setGameState('standing');
  };

  const exitToLobby = () => {
    setGameState('selection');
    setSelectedBuyIn(null);
    setWaitingPlayers(0);
    setPracticePhase('filling');
    setShowPracticeOver(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#f8f9fa] text-neutral-900 overflow-hidden font-sans relative flex flex-col items-center justify-center">

      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="absolute top-1/2 -left-[10%] -translate-y-1/2 w-[45vw] h-[45vw] border-[2px] border-orange-500/10 rounded-full"></div>
        <div className="absolute top-1/2 -right-[10%] -translate-y-1/2 w-[45vw] h-[45vw] border-[2px] border-orange-500/10 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] border-[1px] border-neutral-900/5 rounded-full">
          <div className="absolute h-[200vh] w-[1px] bg-neutral-900/[0.04] left-1/2"></div>
        </div>
        <div className="absolute top-1/2 -left-[5%] -translate-y-1/2 w-[20vw] h-[15vw] border-[1px] border-neutral-900/5 rounded-r-xl bg-neutral-900/[0.01]"></div>
        <div className="absolute top-1/2 -right-[5%] -translate-y-1/2 w-[20vw] h-[15vw] border-[1px] border-neutral-900/5 rounded-l-xl bg-neutral-900/[0.01]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_30%,_rgba(0,0,0,0.02)_100%)]"></div>
      </div>

      <div className="w-full max-w-4xl h-full flex flex-col justify-center p-4 md:p-6 relative z-10">

        {/* ── SELECTION ──────────────────────────────────────────────────── */}
        {gameState === 'selection' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full max-h-[800px]">
            <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl border border-white/50 p-3 rounded-2xl mb-6 shadow-xl shadow-neutral-200/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white rotate-3 shadow-orange-200 shadow-lg">
                  <Dribbble size={18} />
                </div>
                <h1 className="text-xl font-black italic uppercase tracking-tighter text-neutral-800">Hoops Eliminator</h1>
              </div>
              <div className="flex items-center gap-2 pr-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                <Wallet size={14} className="text-emerald-600" />
                <p className="text-lg font-black font-mono text-emerald-700">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="text-center mb-6 shrink-0">
              <p className="text-neutral-400 font-bold tracking-[0.2em] uppercase text-[10px] mb-2">The High-Stakes Survival Tournament</p>
              <h2 className="text-4xl font-black italic tracking-tighter uppercase text-neutral-900 leading-none">Choose Your Entry</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 overflow-y-auto px-1 py-1 custom-scrollbar">
              {CONTEST_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  disabled={balance < amount}
                  onClick={() => handleSelectContest(amount)}
                  className={`group relative bg-white/95 backdrop-blur-sm border border-neutral-200 hover:border-orange-400 p-4 rounded-2xl flex justify-between items-center transition-all active:scale-95 shadow-sm hover:shadow-md ${balance < amount ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neutral-100/50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                      <DollarSign size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-xl font-black text-neutral-800">${amount}</p>
                      <p className="text-[9px] text-neutral-400 font-black uppercase tracking-widest">Win Up To ${(amount * 10 * (1 - HOUSE_RAKE)).toFixed(0)}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-neutral-300 group-hover:text-orange-500 transition-colors" />
                </button>
              ))}
            </div>

            <div className="mt-auto pt-4 border-t border-neutral-200/50 text-center">
              <div className="flex items-center justify-center gap-4 text-neutral-400 text-[10px] font-black uppercase tracking-widest">
                <div className="flex items-center gap-1"><Users size={12} /> 10 Ballers</div>
                <div className="flex items-center gap-1"><TrendingDown size={12} /> 4 Cuts</div>
                <div className="flex items-center gap-1"><Trophy size={12} /> 1 Champion</div>
              </div>
            </div>
          </div>
        )}

        {/* ── PRACTICE MODE ──────────────────────────────────────────────── */}
        {gameState === 'practice' && (
          <div className="animate-in fade-in duration-500 h-full flex flex-col relative z-20">

            {practicePhase === 'filling' ? (
              /* Lobby still filling */
              <div className="shrink-0 mb-2">
                <div className="bg-white border border-neutral-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Dumbbell size={15} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-700">Practice Mode</p>
                      <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wide">Warm up while your lobby fills</p>
                    </div>
                  </div>

                  {/* Player pip dots + count */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: INITIAL_PLAYERS }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all duration-500 ${
                            i < waitingPlayers
                              ? i === 0 ? 'bg-orange-500' : 'bg-emerald-400'
                              : 'bg-neutral-200'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-right min-w-[40px]">
                      <p className="text-sm font-black font-mono text-neutral-800 leading-none">
                        {waitingPlayers}<span className="text-neutral-300">/{INITIAL_PLAYERS}</span>
                      </p>
                      <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">Players</p>
                    </div>
                  </div>

                  <button
                    onClick={exitPracticeEarly}
                    className="text-[9px] font-black uppercase text-neutral-400 hover:text-orange-500 transition-colors flex items-center gap-1 shrink-0"
                  >
                    <StopCircle size={11} />
                    End Practice
                  </button>
                </div>
              </div>
            ) : (
              /* Lobby full — warning countdown */
              <div className="animate-in slide-in-from-top-3 duration-500 shrink-0 mb-2">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                      <Clock size={15} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Lobby Full — Practice Ending Soon</p>
                      <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wide">Warmup score won't count. Get ready for the real game!</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* All 10 pips filled */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: INITIAL_PLAYERS }).map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-orange-500' : 'bg-emerald-400'}`} />
                      ))}
                    </div>
                    <p className="text-2xl font-black font-mono text-amber-600 leading-none">
                      :{practiceWarningTimer.toString().padStart(2, '0')}
                    </p>
                  </div>

                  <button
                    onClick={exitPracticeEarly}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <StopCircle size={12} />
                    End Practice
                  </button>
                </div>
              </div>
            )}

            {/* iframe header */}
            <div className="bg-white border border-neutral-200 p-2 rounded-t-2xl border-b-0 flex items-center justify-between px-4 shrink-0 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Practice</span>
                <span className="bg-blue-100 text-blue-600 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-blue-200 ml-1">
                  Score doesn't count
                </span>
              </div>
            </div>

            {/* Basketball practice iframe */}
            <div className="flex-grow w-full bg-neutral-900 rounded-b-2xl border border-neutral-200 overflow-hidden shadow-2xl min-h-[400px]">
              <iframe src="/basketball-practice.html" className="w-full h-full border-none" title="Practice Round" />
            </div>
          </div>
        )}

        {/* ── PRACTICE LOBBY WAIT (exited early) ────────────────────────── */}
        {gameState === 'practice_lobby_wait' && (
          <div className="animate-in fade-in duration-400 flex flex-col items-center justify-center h-full text-center gap-6">
            <div className="w-20 h-20 bg-orange-50 border border-orange-100 rounded-full flex items-center justify-center mb-2">
              <Dumbbell size={36} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-neutral-800 leading-none mb-2">Warming Up Done</h2>
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Waiting for the tournament to begin...</p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl px-8 py-5 shadow-sm flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-neutral-400">
                <Users size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Lobby Status</span>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: INITIAL_PLAYERS }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      i < waitingPlayers
                        ? i === 0 ? 'bg-orange-500' : 'bg-emerald-400'
                        : 'bg-neutral-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-emerald-600 font-black text-lg font-mono">{waitingPlayers} / {INITIAL_PLAYERS}</p>
              <p className="text-neutral-300 text-[9px] font-bold uppercase tracking-widest">Players Ready</p>
            </div>

            <button
              onClick={initGame}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-orange-100 flex items-center gap-2"
            >
              <Play size={14} />
              Start Tournament Now
            </button>

            <button onClick={exitToLobby} className="text-[9px] font-bold uppercase tracking-widest text-neutral-300 hover:text-neutral-500 transition-colors">
              Exit to Lobby
            </button>
          </div>
        )}

        {/* ── PRACTICE OVER INTERSTITIAL ─────────────────────────────────── */}
        {showPracticeOver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-neutral-900/60 animate-in fade-in duration-300">
            <div className="text-center animate-in zoom-in duration-400">
              <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/40">
                <Dumbbell size={44} className="text-white" />
              </div>
              <h2 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-none mb-3">Practice Over</h2>
              <p className="text-orange-300 font-black uppercase text-[10px] tracking-[0.25em]">Time to compete for real</p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* ── STANDING ROOM ──────────────────────────────────────────────── */}
        {gameState === 'standing' && (
          <div className="animate-in fade-in duration-500 h-full flex flex-col">
            <div className="bg-white/95 backdrop-blur-xl border border-white/50 rounded-[32px] p-6 md:p-10 relative overflow-hidden shadow-2xl flex flex-col flex-grow">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Zap size={160} className="text-orange-500" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                <div className="text-center md:text-left">
                  <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-200 mb-3 inline-block">
                    Round {currentRound} of 4
                  </span>
                  <h2 className="text-5xl font-black italic uppercase leading-none mb-1 tracking-tighter text-neutral-800">
                    {isUserEliminated ? "Spectating" : "Fresh Slate"}
                  </h2>
                  <p className="text-neutral-500 text-sm font-medium">
                    {isUserEliminated ? "Watching the remaining survivors." : "Scores are reset. This round is all that matters."}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3 min-w-[180px]">
                  <div className="text-center">
                    <p className="text-[9px] text-neutral-400 font-black uppercase tracking-tighter mb-0.5">Tip Off In</p>
                    <p className="text-4xl font-mono font-black text-orange-500">:{lobbyTimer.toString().padStart(2, '0')}</p>
                  </div>

                  {!isUserEliminated ? (
                    <button
                      onClick={handleUserReady}
                      disabled={userReady}
                      className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 ${userReady ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-100'}`}
                    >
                      {userReady ? <CheckCircle2 size={20} className="animate-bounce" /> : <Play size={20} />}
                      {userReady ? 'Locked In' : 'Enter Round'}
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

              <div className="mt-auto grid grid-cols-2 md:grid-cols-5 gap-3 overflow-y-auto custom-scrollbar pr-1 relative z-10">
                {players.filter(p => !p.isEliminated).map((p, i) => {
                  const isReady = i < readyCount;
                  return (
                    <div key={p.id} className={`p-3 rounded-xl border transition-all ${isReady ? 'bg-emerald-50/80 border-emerald-200 shadow-sm' : 'bg-white/50 border-neutral-100'}`}>
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

        {/* ── LIVE GAME FRAME ────────────────────────────────────────────── */}
        {gameState === 'playing_game' && (
          <div className="animate-in zoom-in duration-300 h-full flex flex-col relative z-20">
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

        {/* ── CUT REVEAL DELAY ───────────────────────────────────────────── */}
        {gameState === 'cut_reveal_delay' && (
          <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="animate-spin text-orange-500 mb-6" size={48} />
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-neutral-800">Calculating Cut Line</h2>
            <p className="text-neutral-400 font-bold uppercase text-[9px] tracking-widest mt-2">Breaking ties with cumulative scores...</p>
          </div>
        )}

        {/* ── POST-ROUND SUMMARY ─────────────────────────────────────────── */}
        {gameState === 'post_round' && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-4 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white/95 backdrop-blur-xl p-6 rounded-[32px] border border-white/50 gap-6 shrink-0 shadow-sm">
              <div>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none text-neutral-800">Round {currentRound} Results</h2>
                {isUserEliminated && userObject?.eliminatedAt === currentRound ? (
                  <p className="text-red-500 font-black uppercase text-[10px] tracking-widest mt-1">Below the line. Eliminated.</p>
                ) : isUserEliminated ? (
                  <p className="text-neutral-400 font-black uppercase text-[10px] tracking-widest mt-1">Watching as a spectator.</p>
                ) : (
                  <p className="text-emerald-600 font-black uppercase text-[10px] tracking-widest mt-1 flex items-center gap-2">
                    <CheckCircle2 size={14} /> Safe! All scores reset next round.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-neutral-400 mb-0.5">Resetting In</p>
                  <p className="font-mono font-bold text-2xl leading-none text-orange-500">:{postRoundTimer.toString().padStart(2, '0')}</p>
                </div>
                {!isUserEliminated ? (
                  <button onClick={proceedToNextRound} className="bg-neutral-900 text-white hover:bg-neutral-800 px-6 py-3 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-neutral-200 text-xs">
                    Continue <ArrowRight size={16} />
                  </button>
                ) : (
                  <button onClick={exitToLobby} className="bg-red-500 text-white hover:bg-red-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-100 text-xs">
                    Exit Tournament <LogOut size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-xl border border-white/50 rounded-[32px] overflow-hidden shadow-2xl flex-grow flex flex-col min-h-0">
              <div className="grid grid-cols-12 bg-neutral-50/50 p-4 text-[9px] font-black uppercase tracking-widest text-neutral-400 shrink-0 border-b border-neutral-100">
                <div className="col-span-1">Rank</div>
                <div className="col-span-8">Baller</div>
                <div className="col-span-3 text-right">Round Pts</div>
              </div>
              <div className="divide-y divide-neutral-100 overflow-y-auto flex-grow custom-scrollbar">
                {players.map((p, idx) => (
                  <div key={p.id} className={`grid grid-cols-12 p-4 items-center transition-all ${p.isEliminated ? 'opacity-30 grayscale bg-neutral-50/50' : 'hover:bg-orange-50/30'}`}>
                    <div className="col-span-1 font-mono text-[10px] text-neutral-400">{idx + 1}</div>
                    <div className="col-span-8 flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.name.includes("You") ? "bg-orange-500 shadow-md shadow-orange-100" : "bg-neutral-100"}`}>
                        <UserIcon size={14} className={p.name.includes("You") ? "text-white" : "text-neutral-400"} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-black uppercase tracking-tight text-sm ${p.name.includes("You") ? (p.isEliminated ? "text-red-500" : "text-orange-600") : "text-neutral-700"}`}>
                          {p.name}
                        </span>
                        {p.isEliminated && p.eliminatedAt === currentRound && (
                          <span className="text-[8px] text-red-400 font-black uppercase">Cut this round</span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-3 text-right font-black text-xl font-mono text-orange-500">{p.currentRoundScore}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FINISHED ───────────────────────────────────────────────────── */}
        {gameState === 'finished' && (
          <div className="animate-in zoom-in duration-500 space-y-4 h-full flex flex-col">
            <div className="bg-white/95 border-2 border-orange-200 rounded-[32px] p-8 text-center shadow-2xl overflow-hidden relative shrink-0">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-30" />
              <Trophy size={60} className="mx-auto text-orange-500 mb-4 drop-shadow-[0_4px_12px_rgba(249,115,22,0.3)] animate-bounce" />
              <div className="mb-4">
                <h1 className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mb-1">Tournament Champion</h1>
                <div className="flex flex-col items-center justify-center gap-1">
                  {players.filter(p => !p.isEliminated).map(winner => (
                    <div key={winner.id} className="flex items-center gap-3">
                      <Star className="text-orange-400 fill-orange-400" size={12} />
                      <p className="text-4xl font-black italic tracking-tighter uppercase text-neutral-900 leading-tight">{winner.name}</p>
                      <Star className="text-orange-400 fill-orange-400" size={12} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto mb-6">
                <div className="bg-neutral-50/80 border border-neutral-100 px-4 py-3 rounded-2xl text-center shadow-inner">
                  <p className="text-[8px] text-neutral-400 uppercase font-black mb-0.5">Final Prize</p>
                  <p className="text-2xl font-black font-mono text-emerald-600">${prizePool.toFixed(0)}</p>
                </div>
                <div className="bg-neutral-50/80 border border-neutral-100 px-4 py-3 rounded-2xl text-center shadow-inner">
                  <p className="text-[8px] text-neutral-400 uppercase font-black mb-0.5">Winning Round Score</p>
                  <p className="text-2xl font-black font-mono text-orange-500">{players.find(p => !p.isEliminated)?.currentRoundScore || 0}</p>
                </div>
              </div>
              <button onClick={exitToLobby} className="w-full max-w-xs bg-neutral-900 hover:bg-neutral-800 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-neutral-200 active:scale-95 mx-auto text-xs relative z-10">
                Return to Lobby
              </button>
            </div>

            <div className="bg-white/95 backdrop-blur-xl border border-white/50 rounded-[32px] overflow-hidden shadow-2xl flex-grow flex flex-col min-h-0">
              <div className="p-4 border-b border-neutral-100 shrink-0">
                <h3 className="text-lg font-black uppercase italic tracking-tighter text-neutral-800">Tournament Standings</h3>
              </div>
              <div className="grid grid-cols-12 bg-neutral-50/50 p-4 text-[9px] font-black uppercase tracking-widest text-neutral-400 shrink-0">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Player</div>
                <div className="col-span-3 text-center">Outcome</div>
                <div className="col-span-3 text-right">Cumulative Pts</div>
              </div>
              <div className="divide-y divide-neutral-100 overflow-y-auto flex-grow custom-scrollbar">
                {players.map((p, idx) => (
                  <div key={p.id} className={`grid grid-cols-12 p-4 items-center transition-all ${p.isEliminated ? 'bg-neutral-50/50' : 'bg-orange-50/20'}`}>
                    <div className="col-span-1 flex items-center gap-2">
                      {!p.isEliminated ? <Medal size={12} className="text-orange-500" /> : <span className="font-mono text-[10px] text-neutral-300">{idx + 1}</span>}
                    </div>
                    <div className="col-span-5 flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.name.includes("You") ? "bg-orange-500 shadow-sm shadow-orange-100" : "bg-neutral-200"}`}>
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
                    <div className="col-span-3 text-right font-black text-lg font-mono text-neutral-800">{p.totalPoints}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIRM MODAL ──────────────────────────────────────────────── */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-white/40 animate-in fade-in duration-200">
            <div className="bg-white border border-neutral-200 w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-2xl"></div>
              <div className="flex justify-center mb-4 relative z-10">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 border border-orange-100 shadow-sm shadow-orange-50">
                  <DollarSign size={32} />
                </div>
              </div>
              <h3 className="text-3xl font-black uppercase italic mb-2 text-center leading-tight text-neutral-800 relative z-10">Join for ${selectedBuyIn}?</h3>
              <p className="text-center text-neutral-400 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Current Balance: ${balance.toFixed(2)}</p>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-6 flex items-start gap-3 relative z-10">
                <Dumbbell size={14} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wide leading-relaxed">
                  Practice starts immediately after you confirm. Warm up your shot while the lobby fills!
                </p>
              </div>

              <div className="space-y-3 relative z-10">
                <button onClick={confirmJoin} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-100 active:scale-95 transition-all">
                  Confirm Entry
                </button>
                <button onClick={() => setShowConfirm(false)} className="w-full bg-neutral-100 hover:bg-neutral-200 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-neutral-500">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
      `}} />
    </div>
  );
};

export default App;
