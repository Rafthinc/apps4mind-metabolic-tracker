import React, { useState, useEffect, useMemo } from "react";
import { Clock, Dumbbell, UserCog, Save, Trash2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { AlertCircle, HelpCircle, XCircle, Hourglass } from "lucide-react";

interface UserProfile {
  weight: number;
  height: number;
  age: number;
  gender: "male" | "female";
  activityLevel: number;
}

const STORAGE_KEY_PROFILE = "apps4mind_profile_v1";
const STORAGE_KEY_CALORIES = "apps4mind_calories_v1";

const Apps4MindFinal: React.FC = () => {
  // 1. Inițializare sigură a profilului
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const [caloriesEaten, setCaloriesEaten] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CALORIES);
    return saved ? Number(JSON.parse(saved)) : 0;
  });

  const [inputCalories, setInputCalories] = useState<string>("");
  const [simulatedSport, setSimulatedSport] = useState<number>(0);
  const [now, setNow] = useState(new Date());
  const [showProfileEntry, setShowProfileEntry] = useState(!profile);

  const [showPanicModal, setShowPanicModal] = useState(false);
  const [panicStep, setPanicStep] = useState(0);

  const panicQuestions = [
    {
      q: "Este foame fizică (senzație în stomac) sau doar o poftă mentală?",
      options: ["E foame reală", "E doar o poftă"],
    },
    {
      q: "Care este obiectivul tău pe termen lung: să scazi în greutate sau să te simți bine doar 10 minute?",
      options: ["Să slăbesc și să fiu sănătos", "Plăcere de moment"],
    },
    {
      q: "Vei regreta după ce vei termina de mâncat?",
      options: ["Categoric DA", "Nu cred"],
    },
    {
      q: "De obicei regreți după ce mănânci impulsiv, din poftă?",
      options: ["Da, mereu", "Nu mi s-a întâmplat"],
    },
  ];

  // Timer pentru actualizare live
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Salvare automată
  useEffect(() => {
    if (profile)
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    localStorage.setItem(STORAGE_KEY_CALORIES, JSON.stringify(caloriesEaten));
  }, [profile, caloriesEaten]);

  // 2. Calcule cu verificări anti-NaN
  const metabolism = useMemo(() => {
    // Dacă nu avem profil, returnăm valori de bază pentru a evita NaN
    if (!profile || !profile.weight || !profile.height || !profile.age) {
      return { bmr: 0, dailyNeed: 0, hourly: 0 };
    }

    const genderBonus = profile.gender === "male" ? 5 : -161;
    const bmr =
      10 * profile.weight +
      6.25 * profile.height -
      5 * profile.age +
      genderBonus;
    const dailyNeed = bmr * profile.activityLevel;

    return {
      bmr,
      dailyNeed,
      hourly: dailyNeed / 24,
    };
  }, [profile]);

  const secondsPassedToday =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  // Burned so far include și efortul simulat distribuit pe zi
  const burnedLive =
    (secondsPassedToday / 3600) * (metabolism.hourly + simulatedSport / 24);
  const currentBalance = caloriesEaten - burnedLive;

  // Date Grafic
  const chartData = useMemo(() => {
    if (metabolism.dailyNeed === 0) return [];
    const data = [];
    for (let i = 0; i <= 24; i++) {
      data.push({
        ora: `${i}:00`,
        ConsumNatural: Math.round(i * metabolism.hourly),
        CuSport: Math.round(i * (metabolism.hourly + simulatedSport / 24)),
        Mancat: i <= now.getHours() ? caloriesEaten : null,
      });
    }
    return data;
  }, [metabolism, caloriesEaten, simulatedSport, now]);

  {
    /* 1. Calculăm punctul de intersecție corectat */
  }
  const off = useMemo(() => {
    const maxUpper = Math.max(
      ...chartData.map((d) => d.ConsumNatural),
      caloriesEaten
    );
    if (maxUpper === 0) return 0;
    // Ajustăm raportul pentru a reflecta corect pragul pe grafic
    return caloriesEaten / maxUpper;
  }, [chartData, caloriesEaten]);

  // Handler pentru salvare profil
  const handleSaveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newProfile: UserProfile = {
      weight: Number(formData.get("weight")),
      height: Number(formData.get("height")),
      age: Number(formData.get("age")),
      gender: formData.get("gender") as "male" | "female",
      activityLevel: Number(formData.get("activityLevel")),
    };

    if (newProfile.weight > 0 && newProfile.height > 0) {
      setProfile(newProfile);
      setShowProfileEntry(false);
    }
  };

  // 3. Ecranul de Start (Prevenire NaN prin UI)
  if (showProfileEntry || !profile) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4">
        <form
          onSubmit={handleSaveProfile}
          className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-indigo-100"
        >
          <h2 className="text-3xl font-black text-indigo-600 mb-2">
            Profil apps4mind
          </h2>
          <p className="text-slate-500 mb-8 text-sm italic">
            Introdu datele pentru a activa trackerul metabolic.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                name="weight"
                type="number"
                required
                placeholder="Greutate (kg)"
                className="p-3 bg-slate-50 rounded-xl border-none outline-indigo-500"
                defaultValue={profile?.weight}
              />
              <input
                name="height"
                type="number"
                required
                placeholder="Înălțime (cm)"
                className="p-3 bg-slate-50 rounded-xl border-none outline-indigo-500"
                defaultValue={profile?.height}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                name="age"
                type="number"
                required
                placeholder="Vârstă"
                className="p-3 bg-slate-50 rounded-xl border-none outline-indigo-500"
                defaultValue={profile?.age}
              />
              <select
                name="gender"
                className="p-3 bg-slate-50 rounded-xl border-none outline-indigo-500"
                defaultValue={profile?.gender || "male"}
              >
                <option value="male">Bărbat</option>
                <option value="female">Femeie</option>
              </select>
            </div>
            <select
              name="activityLevel"
              className="w-full p-3 bg-slate-50 rounded-xl border-none outline-indigo-500 text-sm"
              defaultValue={profile?.activityLevel || 1.2}
            >
              <option value="1.2">Sedentar (Birou)</option>
              <option value="1.375">Activitate Ușoară (1-3 zile/săpt)</option>
              <option value="1.55">Activitate Moderată (3-5 zile/săpt)</option>
              <option value="1.725">Foarte Activ (Zilnic)</option>
            </select>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} /> Activează Calculele
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black text-indigo-600 tracking-tighter">
              apps4mind
            </h1>
            <p className="text-slate-400 font-medium text-sm">
              Mindful Metabolic Tracker
            </p>
          </div>
          <button
            onClick={() => setShowProfileEntry(true)}
            className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <UserCog size={24} />
          </button>
        </header>

        {/* BUTONUL DE PANICĂ */}
        <button
          onClick={() => {
            setShowPanicModal(true);
            setPanicStep(0);
          }}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-rose-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <AlertCircle size={24} className="animate-pulse" />
          AM O POFTĂ INTENSĂ (PANICĂ)
        </button>

        {/* MODALUL DE INTERVENȚIE CBT */}
        {showPanicModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
              {/* Progress Bar Modal */}
              <div
                className="absolute top-0 left-0 h-1 bg-indigo-500 transition-all duration-300"
                style={{
                  width: `${((panicStep + 1) / panicQuestions.length) * 100}%`,
                }}
              />

              <div className="flex justify-between mb-6">
                <HelpCircle className="text-indigo-500" size={32} />
                <button onClick={() => setShowPanicModal(false)}>
                  <XCircle className="text-slate-300 hover:text-rose-500" />
                </button>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-6 leading-tight">
                {panicQuestions[panicStep].q}
              </h3>

              <div className="space-y-3">
                {panicQuestions[panicStep].options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (panicStep < panicQuestions.length - 1) {
                        setPanicStep((prev) => prev + 1);
                      } else {
                        setShowPanicModal(false);
                        alert(
                          "Bravo! Ai trecut prin procesul de analiză. Senzația va trece în 10-15 minute. Bea un pahar cu apă!"
                        );
                      }
                    }}
                    className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 font-medium transition-all"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border-b-4 border-indigo-200">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Clock size={14} /> Proces Actual
              </h2>
              <div className="text-6xl font-black tabular-nums tracking-tighter mb-2">
                {currentBalance <= 0 ? "" : "+"}
                {currentBalance.toFixed(2)}
                <span className="text-xl text-slate-300 ml-2 italic font-light">
                  kcal
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">
                {currentBalance <= 0
                  ? "Slabesc chiar acum! Corpul meu consumă rezerve."
                  : "Stocare energie. Aștept procesarea caloriilor."}
              </p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 shadow-md border border-slate-100">
              <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">
                Adaugă Masă
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={inputCalories}
                  onChange={(e) => setInputCalories(e.target.value)}
                  className="flex-1 bg-slate-50 border-none rounded-2xl px-4 py-3"
                  placeholder="kcal"
                />
                <button
                  onClick={() => {
                    setCaloriesEaten((prev) => prev + Number(inputCalories));
                    setInputCalories("");
                  }}
                  className="bg-orange-500 text-white px-6 rounded-2xl font-bold"
                >
                  Adaugă
                </button>
              </div>
              <button
                onClick={() => setCaloriesEaten(0)}
                className="mt-4 text-[10px] text-rose-400 font-bold uppercase flex items-center gap-1"
              >
                <Trash2 size={12} /> Resetează ziua
              </button>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-indigo-300 uppercase">
                <Dumbbell size={18} /> Simulator Activitate
              </h3>
              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={simulatedSport}
                onChange={(e) => setSimulatedSport(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-400 mb-4"
              />
              <div className="flex justify-between items-center text-green-400 font-black text-2xl">
                <span>+{simulatedSport} kcal</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl h-full flex flex-col">
              <div className="flex justify-between items-start mb-10">
                <h3 className="font-black text-2xl tracking-tight">
                  Evoluția Zilei
                </h3>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Necesar Zilnic
                  </p>
                  <p className="text-xl font-black text-indigo-600">
                    {Math.round(metabolism.dailyNeed)} kcal
                  </p>
                </div>
              </div>

              <div className="flex-1 min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    {/* Definirea Gradientului Dinamic */}
                    <defs>
                      <linearGradient
                        id="splitColor"
                        x1="0"
                        y1="1"
                        x2="0"
                        y2="0"
                      >
                        {/* ACUM: Roșu sub linia de mâncare (Stocare), Verde deasupra (Slăbire) */}
                        <stop
                          offset={off}
                          stopColor="#f43f5e"
                          stopOpacity={0.6}
                        />
                        <stop
                          offset={off}
                          stopColor="#22c55e"
                          stopOpacity={0.6}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis dataKey="ora" fontSize={11} stroke="#94a3b8" />
                    <YAxis fontSize={11} stroke="#94a3b8" />

                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 min-w-[180px]">
                              <p className="text-xs font-black text-slate-400 mb-2 underline decoration-indigo-200">
                                STATUS ORA {label}
                              </p>
                              {payload.map((entry, index) => {
                                const burnedAtHour = Number(entry.value);
                                const netBalance = caloriesEaten - burnedAtHour;
                                const grams = (
                                  Math.abs(netBalance) / 7.7
                                ).toFixed(1);
                                const isDeficit = netBalance <= 0;

                                return (
                                  <div key={index} className="space-y-1">
                                    <p className="text-sm font-bold text-slate-700">
                                      Ardere: {burnedAtHour} kcal
                                    </p>
                                    <div
                                      className={`text-[11px] font-black p-2 rounded-lg ${
                                        isDeficit
                                          ? "bg-green-50 text-green-600"
                                          : "bg-rose-50 text-rose-600"
                                      }`}
                                    >
                                      {isDeficit
                                        ? `⬇️ Eliminare: ${grams}g grăsime`
                                        : `⬆️ Stocare: ${grams}g grăsime`}
                                    </div>
                                    <p className="text-[9px] text-slate-400 italic mt-1">
                                      {isDeficit
                                        ? "Corpul consumă din rezerve"
                                        : "Excesul se depune acum"}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* Aplicăm Gradientul pe Area principală */}
                    <Area
                      name="Ardere Naturală"
                      type="monotone"
                      dataKey="ConsumNatural"
                      stroke="#4f46e5"
                      fill="url(#splitColor)"
                      strokeWidth={4}
                    />

                    {simulatedSport > 0 && (
                      <Area
                        name="Cu Sport"
                        type="monotone"
                        dataKey="CuSport"
                        stroke="#22c55e"
                        fill="none"
                        strokeWidth={4}
                        strokeDasharray="5 5"
                      />
                    )}

                    <ReferenceLine
                      y={caloriesEaten}
                      stroke="#f97316"
                      strokeWidth={2}
                      label={{
                        position: "right",
                        fill: "#f97316",
                        value: "MÂNCARE",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 border-t pt-8">
                <div className="text-center relative group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                    Grăsime topită azi
                    <span className="text-indigo-400 group-hover:block hidden text-[9px] lowercase italic">
                      (până la această oră)
                    </span>
                  </p>

                  <div className="flex items-center justify-center gap-2 mt-1">
                    <p className="text-2xl font-black text-green-500">
                      {currentBalance < 0
                        ? (Math.abs(currentBalance) / 7.7).toFixed(1)
                        : 0}
                      g
                    </p>
                    {/* CLEPSIDRA ANIMATĂ */}
                    <div className="text-indigo-400 animate-bounce">
                      <Hourglass
                        size={18}
                        className="animate-[spin_4s_linear_infinite]"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Viteza actuală
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {Math.round(metabolism.hourly)}{" "}
                    <span className="text-xs">kcal/h</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Prognoză Final Zi
                  </p>
                  <p className="text-2xl font-black text-indigo-600">
                    {Math.round(
                      metabolism.dailyNeed + simulatedSport - caloriesEaten
                    )}{" "}
                    <span className="text-xs">kcal</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <footer className="mt-12 py-8 border-t border-slate-200">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Branding și Identitate */}
            <div className="text-center md:text-left">
              <h4 className="text-lg font-black text-slate-800 tracking-tight">
                Creat de{" "}
                <span className="text-indigo-600">Roșu Adrian Francois</span>
              </h4>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                Psiholog & Psihoterapeut CBT • Nutriționist • Developer IT
              </p>
            </div>

            {/* Contact și Social */}
            <div className="flex flex-col items-center md:items-end gap-2 text-sm font-medium text-slate-600">
              <div className="flex items-center gap-4">
                <a
                  href="mailto:psihoterapiieficiente@gmail.com"
                  className="hover:text-indigo-600 transition-colors flex items-center gap-1"
                >
                  <span className="text-indigo-500 font-bold">@</span>{" "}
                  psihoterapiieficiente@gmail.com
                </a>
                <span className="text-slate-200">|</span>
                <a
                  href="https://apps4mind.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-600 transition-colors"
                >
                  www.apps4mind.com
                </a>
                <span className="text-slate-200">|</span>
                <a
                  href="https://www.psihoterapie-nutritie.ro/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-600 transition-colors"
                >
                  www.psihoterapie-nutritie.ro
                </a>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                © 2026 apps4mind - Tehnologie pentru echilibru mental și fizic.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Apps4MindFinal;
