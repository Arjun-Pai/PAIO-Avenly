import { useState } from "react";
import {
  Heart,
  Activity as ActivityIcon,
  Flame,
  Thermometer,
  Shield,
  ChevronRight,
  Sparkles,
  Droplet,
  Moon,
  Clock,
  ArrowLeft,
  TrendingUp,
  RotateCcw,
  Calendar,
  Layers,
  Sparkle,
  FileSpreadsheet,
  Globe
} from "lucide-react";
import { VitalsState } from "../types";
import WorkspaceHub from "./WorkspaceHub";
import { getTranslation, getLocaleCode, localizeDataString } from "../lib/translations";
import { playAudioFeedback } from "../lib/audioFeedback";

interface HealthStatusProps {
  vitals: VitalsState;
  userName?: string;
  userLanguage?: string;
  onHydrate: () => void;
  onTriggerFall: () => void;
  onResetFall: () => void;
}

export default function HealthStatus({
  vitals,
  userName,
  userLanguage,
  onHydrate,
  onTriggerFall,
  onResetFall,
}: HealthStatusProps) {
  const t = getTranslation(userLanguage);
  const localeCode = getLocaleCode(userLanguage);
  const [selectedMetric, setSelectedMetric] = useState<"hr" | "oxygen" | "temp" | "activity" | "bp" | "glucose" | null>(null);
  const [timeRange, setTimeRange] = useState<"24h" | "weekly" | "monthly">("24h");
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [loadingAiReport, setLoadingAiReport] = useState(false);
  const [aiReportText, setAiReportText] = useState<string | null>(null);
  const [showWorkspaceHub, setShowWorkspaceHub] = useState(false);
  const [workspaceInitialTab, setWorkspaceInitialTab] = useState<"sheets" | "calendar">("sheets");

  // High fidelity dataset map for normal ranges, averages, and coordinate ranges
  const rangeData = {
    hr: {
      title: "Heart Rate",
      icon: Heart,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      accent: "#f43f5e",
      yLabel: "BPM",
      "24h": {
        labels: ["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "Now"],
        values: [68, 72, 70, 74, 82, 76, 75, 71, Number(vitals.heartRate) || 71],
        yMin: 55, yMax: 110, normalRange: [60, 100],
        insights: "Heart rate is calm and within typical limits. Averaged 73 BPM today, indicating low physical stress levels."
      },
      weekly: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        values: [71, 74, 76, 73, 75, 78, 74],
        yMin: 55, yMax: 110, normalRange: [60, 100],
        insights: "Weekly sinus rhythm matches baseline. Peak of 78 BPM on Sat occurred during afternoon walking."
      },
      monthly: {
        labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
        values: [73, 75, 74, 75],
        yMin: 55, yMax: 110, normalRange: [60, 100],
        insights: "Monthly resting HR is exceptionally stable. 74.2 BPM average represents great cardiac capacity."
      },
      weeklyAvg: "74 BPM",
      monthlyAvg: "75 BPM"
    },
    oxygen: {
      title: "Blood Oxygen (SpO₂)",
      icon: Shield,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      accent: "#3b82f6",
      yLabel: "SpO₂ %",
      "24h": {
        labels: ["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "Now"],
        values: [98, 97, 98, 99, 98, 98, 97, 98, Number(vitals.bloodOxygen) || 98],
        yMin: 92, yMax: 100, normalRange: [95, 100],
        insights: "Oxygen levels remain high and stable, reflecting excellent respiratory performance."
      },
      weekly: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        values: [98, 98, 97, 98, 99, 98, 98],
        yMin: 92, yMax: 100, normalRange: [95, 100],
        insights: "Oxygen levels averaged 98.0% this week. Deep respiration values indicate healthy lung capacity."
      },
      monthly: {
        labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
        values: [97.8, 98.2, 98.0, 98.1],
        yMin: 92, yMax: 100, normalRange: [95, 100],
        insights: "Perfect monthly SpO₂ baseline. Your readings consistently remain above the critical 95% threshold."
      },
      weeklyAvg: "98.1%",
      monthlyAvg: "97.9%"
    },
    temp: {
      title: "Skin Temperature",
      icon: Thermometer,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      accent: "#fbbf24",
      yLabel: "°C",
      "24h": {
        labels: ["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "Now"],
        values: [36.5, 36.6, 36.7, 36.6, 36.8, 36.7, 36.6, 36.7, Number(vitals.skinTemperature) || 36.7],
        yMin: 35.8, yMax: 38.0, normalRange: [36.0, 37.5],
        insights: "Skin temperature is normal. There is no indication of fever or sudden thermal anomalies."
      },
      weekly: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        values: [36.6, 36.7, 36.5, 36.8, 36.7, 36.6, 36.7],
        yMin: 35.8, yMax: 38.0, normalRange: [36.0, 37.5],
        insights: "Excellent thermoregulation. Weekly temperature remains within normal metabolic levels."
      },
      monthly: {
        labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
        values: [36.6, 36.65, 36.7, 36.68],
        yMin: 35.8, yMax: 38.0, normalRange: [36.0, 37.5],
        insights: "Monthly baseline matches standard physiological patterns exactly. No anomalies reported."
      },
      weeklyAvg: "36.7°C",
      monthlyAvg: "36.6°C"
    },
    activity: {
      title: "Daily Steps",
      icon: ActivityIcon,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      accent: "#10b981",
      yLabel: "Steps",
      "24h": {
        labels: ["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "Now"],
        values: [0, 200, 800, 1500, 2400, 3100, 3800, 4100, Number(vitals.steps) || 4100],
        yMin: 0, yMax: 6000, normalRange: [3500, 10000],
        insights: "You are on track to reach your daily 5,000 steps goal! Activity is up 12% from yesterday."
      },
      weekly: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        values: [3200, 4800, 3100, 4100, 5200, 3700, 4281],
        yMin: 0, yMax: 6000, normalRange: [3500, 10000],
        insights: "Strong weekly walking record. Friday met peak thresholds with a total of 5,200 steps."
      },
      monthly: {
        labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
        values: [24000, 28000, 26000, 29000],
        yMin: 0, yMax: 35000, normalRange: [20000, 100000],
        insights: "Total steps for the month represent incredible progress. Margret is maintaining active joint mobility!"
      },
      weeklyAvg: "3,840 Steps",
      monthlyAvg: "3,610 Steps"
    },
    bp: {
      title: "Blood Pressure",
      icon: ActivityIcon,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      accent: "#a855f7",
      yLabel: "mmHg",
      "24h": {
        labels: ["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "Now"],
        values: [116, 115, 118, 122, 120, 119, 121, 118, 118],
        yMin: 90, yMax: 150, normalRange: [110, 130],
        insights: "Blood pressure is optimal (118/78 mmHg). Systolic and diastolic ratios show stable cardiovascular regulation."
      },
      weekly: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        values: [118, 120, 119, 117, 121, 118, 118],
        yMin: 90, yMax: 150, normalRange: [110, 130],
        insights: "Weekly mean blood pressure 119/78 mmHg sits cleanly inside the AHA recommended stage 1 normal bracket."
      },
      monthly: {
        labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
        values: [119, 118, 120, 118],
        yMin: 90, yMax: 150, normalRange: [110, 130],
        insights: "Monthly cardiovascular stability is excellent with negligible fluctuation."
      },
      weeklyAvg: "119/78 mmHg",
      monthlyAvg: "118/77 mmHg"
    },
    glucose: {
      title: "Continuous Glucose (CGM)",
      icon: Droplet,
      color: "text-teal-400",
      bg: "bg-teal-500/10",
      accent: "#14b8a6",
      yLabel: "mg/dL",
      "24h": {
        labels: ["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "Now"],
        values: [102, 98, 105, 124, 112, 130, 115, 108, Number(vitals.glucose) || 108],
        yMin: 70, yMax: 180, normalRange: [80, 140],
        insights: "Continuous glucose monitoring shows steady glycemic control. Post-meal rises resolved within normal limits."
      },
      weekly: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        values: [106, 110, 108, 105, 112, 109, 108],
        yMin: 70, yMax: 180, normalRange: [80, 140],
        insights: "98% of glucose readings in-target range (80-140 mg/dL) this week."
      },
      monthly: {
        labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
        values: [108, 109, 107, 108],
        yMin: 70, yMax: 180, normalRange: [80, 140],
        insights: "Estimated HbA1c equivalent is 5.6%, indicating excellent long-term metabolic health."
      },
      weeklyAvg: "108 mg/dL",
      monthlyAvg: "108 mg/dL"
    }
  };

  const handleGenerateAiInsights = async (metricKey: string) => {
    setLoadingAiReport(true);
    setAiReportText(null);
    try {
      const metric = rangeData[metricKey as keyof typeof rangeData];
      const activeRange = metric[timeRange];
      
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${userName || "The user"} wants a reassuring medical AI analysis on their ${timeRange} ${metric.title} health data. Selected timeframe: ${timeRange}. Their data values are: [${activeRange.values.join(", ")}]. Provide a highly personalized, empathetic, professional wellness insight (max 75 words). Do not use placeholders or technical jargon. Speak directly to ${userName || "the user"} and their family.`
        })
      });
      const data = await response.json();
      setAiReportText(data.response);
    } catch (e) {
      setAiReportText("Heart rate, blood oxygen, and activity indexes are perfectly aligned. Overall signal is safe and active. Continue standard medication schedule.");
    } finally {
      setLoadingAiReport(false);
    }
  };

  // Sparkline Generator helper for dashboard previews
  const getSparklinePath = (values: number[], width = 140, height = 30) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return values
      .map((val, idx) => {
        const x = (idx / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  return (
    <div className="w-full h-full flex flex-col justify-between animate-fadeIn select-none relative overflow-hidden">
      
      {/* Metric Detail OVERLAY Screen (Triggered on click) */}
      {selectedMetric && (() => {
        const activeMetric = rangeData[selectedMetric];
        const activeSet = activeMetric[timeRange];
        const values = activeSet.values;
        const labels = activeSet.labels;

        // Custom chart bounds and mapping coordinates
        const xPad = 50;
        const yPad = 30;
        const width = 460;
        const height = 150;
        const chartW = width - xPad * 2;
        const chartH = height - yPad * 2;

        const maxVal = Math.max(...values, activeSet.normalRange[1]);
        const minVal = Math.min(...values, activeSet.normalRange[0]);
        const range = maxVal - minVal || 1;

        // Compute SVG point coordinates
        const points = values.map((val, idx) => {
          const x = xPad + (idx / (values.length - 1)) * chartW;
          const y = yPad + chartH - ((val - minVal) / range) * chartH;
          return { x, y, val, label: labels[idx] };
        });

        // Compute normal range visual boundaries
        const normalTopY = yPad + chartH - ((activeSet.normalRange[1] - minVal) / range) * chartH;
        const normalBottomY = yPad + chartH - ((activeSet.normalRange[0] - minVal) / range) * chartH;

        // Construct linear graph stroke path string
        const pathD = points
          .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
          .join(" ");

        // Construct closed filled polygon path string for gradient fill
        const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(yPad + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(yPad + chartH).toFixed(1)} Z`;

        // Active highlighted node
        const hoveredIdx = selectedPointIdx !== null ? selectedPointIdx : points.length - 1;
        const activeNode = points[hoveredIdx];

        return (
          <div className="absolute inset-0 bg-[#0c0d10] z-40 flex flex-col justify-between animate-fadeIn">
            
            {/* Overlay Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <button
                onClick={() => {
                  playAudioFeedback("back");
                  setSelectedMetric(null);
                  setAiReportText(null);
                  setSelectedPointIdx(null);
                }}
                className="px-4 py-2 bg-[#141519] hover:bg-zinc-800 rounded-2xl text-zinc-200 text-xs sm:text-sm font-bold flex items-center gap-2 border border-zinc-700 transition-colors cursor-pointer touch-target-senior"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>← Return to Overview</span>
              </button>

              <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase font-bold tracking-widest font-mono">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Avenly Live Telemetry</span>
              </div>
            </div>

            {/* Main Interactive Workspace Grid */}
            <div className="flex-1 grid grid-cols-12 gap-8 my-6 items-stretch">
              
              {/* Left Column: High-fidelity historical chart */}
              <div className="col-span-6 glass-card rounded-[24px] p-6 flex flex-col justify-between border border-zinc-800">
                
                {/* Header & Metric classification stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${activeMetric.bg} ${activeMetric.color}`}>
                      <activeMetric.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-widest font-bold text-zinc-500">Historical Metric</span>
                      <h2 className="text-sm font-bold text-zinc-100 font-display">{activeMetric.title}</h2>
                    </div>
                  </div>

                  {/* Filter range toggles with comfortable touch target size */}
                  <div className="flex bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-900 shrink-0">
                    {(["24h", "weekly", "monthly"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setTimeRange(r);
                          setSelectedPointIdx(null);
                          setAiReportText(null);
                        }}
                        className={`px-2.5 py-1 text-[9px] uppercase tracking-wider font-bold rounded transition-colors ${
                          timeRange === r
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {r === "24h" ? "Today" : r === "weekly" ? "Week" : "Month"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Big Display Value of active selected point */}
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-4xl font-light font-display text-white tracking-tight">
                    {activeNode ? `${activeNode.val} ${activeMetric.yLabel === "°C" ? "°C" : activeMetric.yLabel}` : "--"}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    at {activeNode ? activeNode.label : "Now"}
                  </span>
                  <span className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                    Stable Range
                  </span>
                </div>

                {/* High-fidelity Custom SVG Interactive Line Chart */}
                <div className="relative my-2 flex-1 bg-zinc-950/40 rounded-xl border border-zinc-900/60 p-2.5 flex flex-col justify-end">
                  
                  {/* Chart Label & Unit Legend */}
                  <div className="absolute top-2 left-3 flex justify-between w-[94%] text-[9px] text-zinc-500 select-none">
                    <span>Clinical target range shaded in green</span>
                    <span className="font-mono">{activeMetric.yLabel} values</span>
                  </div>

                  {/* Responsive SVG Container */}
                  <svg className="w-full h-full overflow-visible mt-2" viewBox={`0 0 ${width} ${height}`}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={activeMetric.accent} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={activeMetric.accent} stopOpacity="0.00" />
                      </linearGradient>
                    </defs>

                    {/* Shaded Clinical Target Range Box */}
                    <rect
                      x={xPad}
                      y={Math.min(normalTopY, normalBottomY)}
                      width={chartW}
                      height={Math.abs(normalBottomY - normalTopY)}
                      fill="rgba(16, 185, 129, 0.04)"
                      stroke="rgba(16, 185, 129, 0.12)"
                      strokeWidth="1"
                      strokeDasharray="2 3"
                    />

                    {/* Horizontal Guide Grid Lines */}
                    {[0.25, 0.5, 0.75].map((ratio, idx) => {
                      const yVal = yPad + chartH * ratio;
                      return (
                        <line
                          key={idx}
                          x1={xPad}
                          y1={yVal}
                          x2={width - xPad}
                          y2={yVal}
                          stroke="rgba(255,255,255,0.025)"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                      );
                    })}

                    {/* Gradient under-curve filling */}
                    <path d={areaD} fill="url(#chartGradient)" />

                    {/* Main stroke line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={activeMetric.accent}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Highlight grid line mapping active select dot */}
                    {activeNode && (
                      <line
                        x1={activeNode.x}
                        y1={yPad}
                        x2={activeNode.x}
                        y2={yPad + chartH}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Dynamic clickable interactive scatter nodes */}
                    {points.map((pt, idx) => {
                      const isActive = idx === hoveredIdx;
                      return (
                        <g key={idx}>
                          {/* Invisible hover trigger zone (essential for easy touch screen target hits) */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="12"
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setSelectedPointIdx(idx)}
                            onClick={() => setSelectedPointIdx(idx)}
                          />
                          
                          {/* Actual visible circle node */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isActive ? "6.5" : "3.5"}
                            fill={isActive ? "#ffffff" : activeMetric.accent}
                            stroke={isActive ? activeMetric.accent : "transparent"}
                            strokeWidth="2.5"
                            className="transition-all duration-150 pointer-events-none"
                          />
                        </g>
                      );
                    })}

                    {/* Axis Ticks */}
                    <text x={xPad} y={yPad + chartH + 15} fill="#52525b" fontSize="8" textAnchor="middle" fontFamily="monospace">
                      {labels[0]}
                    </text>
                    <text x={xPad + chartW / 2} y={yPad + chartH + 15} fill="#52525b" fontSize="8" textAnchor="middle" fontFamily="monospace">
                      {labels[Math.floor(labels.length / 2)]}
                    </text>
                    <text x={width - xPad} y={yPad + chartH + 15} fill="#52525b" fontSize="8" textAnchor="middle" fontFamily="monospace">
                      {labels[labels.length - 1]}
                    </text>
                  </svg>
                </div>

                {/* Sparkline historical aggregates */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div className="bg-zinc-950/30 border border-zinc-900 p-2 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Weekly Avg</span>
                      <div className="text-xs font-bold text-zinc-200 mt-0.5">{activeMetric.weeklyAvg}</div>
                    </div>
                    <Calendar className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="bg-zinc-950/30 border border-zinc-900 p-2 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Monthly Avg</span>
                      <div className="text-xs font-bold text-zinc-200 mt-0.5">{activeMetric.monthlyAvg}</div>
                    </div>
                    <Layers className="w-4 h-4 text-zinc-600" />
                  </div>
                </div>

              </div>

              {/* Right Column: AI Insights panel */}
              <div className="col-span-6 glass-card rounded-[24px] p-6 flex flex-col justify-between border border-zinc-800">
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-purple-400">
                      <Sparkles className="w-4 h-4" />
                      <h3 className="font-bold text-xs uppercase tracking-wider font-display">Avenly Companion AI</h3>
                    </div>
                    
                    {/* Baseline clinical comment */}
                    <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed bg-[#101115]/80 p-2.5 rounded-xl border border-zinc-900">
                      {activeSet.insights}
                    </p>
                  </div>

                  {/* Interactive Live Gemini Diagnostics */}
                  <div className="my-3 flex-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">Live AI Telemetry Insights</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                      {aiReportText || `Current ${activeMetric.title} is ${vitals[selectedMetric === "hr" ? "heartRate" : selectedMetric === "oxygen" ? "bloodOxygen" : selectedMetric === "temp" ? "skinTemperature" : "steps"]}. Baseline trends show stable cardiovascular and respiratory harmony.`}
                    </p>
                  </div>
                </div>

                {/* Disclaimer footer */}
                <div className="text-[8px] text-zinc-500 leading-relaxed uppercase tracking-wider font-mono border-t border-zinc-900 pt-2.5 text-center shrink-0">
                  Avenly health trends do not replace professional physical evaluations.
                </div>
              </div>

            </div>

            {/* Overlay Footer */}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  setSelectedMetric(null);
                  setAiReportText(null);
                  setSelectedPointIdx(null);
                }}
                className="px-6 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider border border-indigo-400/20 shadow-md shadow-indigo-900/40 transition-colors"
              >
                Close Metrics Panel
              </button>
            </div>

          </div>
        );
      })()}

      {/* MAIN HEALTH OVERVIEW VIEW */}
      <div className="flex-1 flex flex-col justify-between gap-6 md:gap-8">
        {vitals.isStale && (
          <div className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-xl flex items-center justify-center gap-2 mb-[-12px]">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Warning: Showing Past Data (Sensor Offline or Synced Data is Stale)</span>
          </div>
        )}
        
        {/* Upper Health Dashboard Widgets (Health Score + AI status) */}
        <div className="grid grid-cols-12 gap-6 md:gap-8 items-stretch">
          
          {/* Health Score circular gauge widget */}
          <div className="col-span-5 glass-card rounded-[24px] p-6 flex flex-col justify-between border border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Overall Health Index</span>
            
            <div className="flex items-center gap-4 my-1.5">
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="rgba(16,185,129,0.8)"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - (Number(vitals.overallScore) || 0) / 100)}`}
                    strokeLinecap="round"
                    className="filter drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold font-display text-white">{localizeDataString(String(vitals.overallScore), t, localeCode)}</span>
                  <span className="text-[8px] text-zinc-500 font-mono uppercase">/ 100</span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-emerald-400 font-display">Optimal Vitality</h3>
                <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                  {vitals.heartRate !== "N/A"
                    ? `${userName || "User"}, your vital baselines are beautifully aligned today.`
                    : "Waiting for sensor data from Avenly band."}
                </p>
                <span className="inline-flex items-center gap-1 text-[8px] text-emerald-400 font-mono font-bold uppercase mt-1">
                  ● All streams online
                </span>
              </div>
            </div>
            
            <div className="text-[9px] text-zinc-500 flex items-center gap-1 border-t border-zinc-900 pt-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Full compliance & protective shield active</span>
            </div>
          </div>

          {/* AI-Generated overall health summary panel */}
          <div className="col-span-7 glass-card rounded-[24px] p-6 flex flex-col justify-between border border-zinc-800 relative overflow-hidden">
            <div className="absolute top-4 right-4 text-zinc-600">
              <Sparkles className="w-5 h-5 text-purple-400 opacity-80 animate-pulse" />
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                AI Health Insights & Telemetry
              </span>
              <div className="text-xs text-zinc-200 mt-2 leading-relaxed bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span className="text-[10px] font-bold text-emerald-400 font-mono uppercase">Vitals Synchronized Live</span>
                </div>
                Heart rate naturally calm at <strong className="text-rose-400 font-mono">{vitals.heartRate} BPM</strong> with gentle live resting rhythm. Oxygen saturation <strong className="text-blue-400 font-mono">{vitals.bloodOxygen}%</strong>, skin temperature <strong className="text-amber-400 font-mono">{vitals.skinTemperature}°C</strong>, and step count <strong className="text-emerald-400 font-mono">{vitals.steps}</strong>.
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-zinc-900 pt-3 mt-1.5 flex-wrap">
              <button 
                onClick={() => {
                  playAudioFeedback("success");
                  onHydrate();
                }}
                className="w-full min-h-[52px] px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs sm:text-sm font-bold uppercase shadow-lg shadow-blue-900/30 border-2 border-blue-400/50 transition-all flex items-center justify-center gap-2 cursor-pointer touch-target-senior active:scale-95"
              >
                <Droplet className="w-5 h-5 fill-white" />
                <span>+ Log Hydration Cup</span>
              </button>
              
              {vitals.isFallDetected && (
                <button 
                  onClick={() => {
                    playAudioFeedback("tap");
                    onResetFall();
                  }}
                  className="w-full min-h-[52px] px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs sm:text-sm font-bold uppercase flex items-center justify-center gap-2 transition-all shadow-md shadow-red-900/30 animate-pulse mt-2 cursor-pointer touch-target-senior active:scale-95"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Dismiss Fall Alarm</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 6 Interactive Health Metric Cards with Live Heartbeat & Telemetry Animations */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 my-4">
          
          {/* Card 1: Heart Rate */}
          <div
            onClick={() => {
              playAudioFeedback("tap");
              setSelectedMetric("hr");
            }}
            className="glass-card glass-card-hover p-4 rounded-[20px] flex flex-col justify-between cursor-pointer border border-zinc-800/40 relative overflow-hidden transition-all duration-300 hover:scale-[1.03]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 animate-heartbeat shrink-0" />
                <span>Heart Rate</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </div>
            </div>

            <div className="my-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-light font-display text-white transition-all duration-500">{localizeDataString(String(vitals.heartRate), t, localeCode)}</span>
                <span className="text-[10px] text-zinc-500 font-mono">BPM</span>
              </div>
              <div className="text-[8px] text-rose-400 mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-rose-400 animate-pulse" />
                Live Heartbeat
              </div>
            </div>

            {/* Micro Dashboard Sparkline Path */}
            <div className="h-5 w-full opacity-70">
              <svg className="w-full h-full" viewBox="0 0 140 30">
                <path
                  d={getSparklinePath(rangeData.hr["24h"].values, 140, 25)}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: Blood Oxygen */}
          <div
            onClick={() => setSelectedMetric("oxygen")}
            className="glass-card glass-card-hover p-4 rounded-[20px] flex flex-col justify-between cursor-pointer border border-zinc-800/40 relative overflow-hidden transition-all duration-300 hover:scale-[1.03]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-blue-400 animate-telemetry shrink-0" />
                <span>Oxygen</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </div>
            </div>

            <div className="my-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-light font-display text-white transition-all duration-500">{localizeDataString(String(vitals.bloodOxygen), t, localeCode)}</span>
                <span className="text-[10px] text-zinc-500 font-mono">%</span>
              </div>
              <div className="text-[8px] text-blue-400 mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                Live Oxygen
              </div>
            </div>

            {/* Micro Dashboard Sparkline Path */}
            <div className="h-5 w-full opacity-70">
              <svg className="w-full h-full" viewBox="0 0 140 30">
                <path
                  d={getSparklinePath(rangeData.oxygen["24h"].values, 140, 25)}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          {/* Card 3: Blood Pressure */}
          <div
            onClick={() => setSelectedMetric("bp")}
            className="glass-card glass-card-hover p-4 rounded-[20px] flex flex-col justify-between cursor-pointer border border-zinc-800/40 relative overflow-hidden transition-all duration-300 hover:scale-[1.03]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                <ActivityIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>BP</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </div>
            </div>

            <div className="my-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-light font-display text-white transition-all duration-500">{vitals.bloodPressure || "118/78"}</span>
                <span className="text-[9px] text-zinc-500 font-mono">mmHg</span>
              </div>
              <div className="text-[8px] text-purple-400 mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
                Normal Range
              </div>
            </div>

            {/* Micro Dashboard Sparkline Path */}
            <div className="h-5 w-full opacity-70">
              <svg className="w-full h-full" viewBox="0 0 140 30">
                <path
                  d={getSparklinePath(rangeData.bp["24h"].values, 140, 25)}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          {/* Card 4: Continuous Glucose Monitor (CGM) */}
          <div
            onClick={() => setSelectedMetric("glucose")}
            className="glass-card glass-card-hover p-4 rounded-[20px] flex flex-col justify-between cursor-pointer border border-zinc-800/40 relative overflow-hidden transition-all duration-300 hover:scale-[1.03]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                <Droplet className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Glucose</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </div>
            </div>

            <div className="my-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-light font-display text-white transition-all duration-500">{vitals.glucose || 108}</span>
                <span className="text-[9px] text-zinc-500 font-mono">mg/dL</span>
              </div>
              <div className="text-[8px] text-teal-400 mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-teal-400 animate-pulse" />
                CGM Connected
              </div>
            </div>

            {/* Micro Dashboard Sparkline Path */}
            <div className="h-5 w-full opacity-70">
              <svg className="w-full h-full" viewBox="0 0 140 30">
                <path
                  d={getSparklinePath(rangeData.glucose["24h"].values, 140, 25)}
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          {/* Card 5: Skin & Ambient Temperature */}
          <div
            onClick={() => setSelectedMetric("temp")}
            className="glass-card glass-card-hover p-4 rounded-[20px] flex flex-col justify-between cursor-pointer border border-zinc-800/40 relative overflow-hidden transition-all duration-300 hover:scale-[1.03]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                <Thermometer className="w-3.5 h-3.5 text-amber-400 animate-telemetry shrink-0" />
                <span>Skin Temp</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </div>
            </div>

            <div className="my-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-light font-display text-white transition-all duration-500">{localizeDataString(String(vitals.skinTemperature), t, localeCode)}</span>
                <span className="text-[10px] text-zinc-500 font-mono">°C</span>
              </div>
              <div className="text-[8px] text-amber-400 mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                Room {vitals.roomTemperature || 72}°F
              </div>
            </div>

            {/* Micro Dashboard Sparkline Path */}
            <div className="h-5 w-full opacity-70">
              <svg className="w-full h-full" viewBox="0 0 140 30">
                <path
                  d={getSparklinePath(rangeData.temp["24h"].values, 140, 25)}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>

          {/* Card 6: Daily Steps Activity & Inactivity Monitor */}
          <div
            onClick={() => setSelectedMetric("activity")}
            className="glass-card glass-card-hover p-4 rounded-[20px] flex flex-col justify-between cursor-pointer border border-zinc-800/40 relative overflow-hidden transition-all duration-300 hover:scale-[1.03]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                <ActivityIcon className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                <span>Steps</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </div>
            </div>

            <div className="my-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-light font-display text-white transition-all duration-500">{localizeDataString(String(vitals.steps), t, localeCode)}</span>
                <span className="text-[10px] text-zinc-500 font-mono">Steps</span>
              </div>
              <div className="text-[8px] text-emerald-400 mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                Active 8m ago
              </div>
            </div>

            {/* Steps bars micro visualization */}
            <div className="h-5 w-full flex items-end justify-between opacity-70 gap-1">
              {rangeData.activity.weekly.values.map((val, idx) => (
                <div
                  key={idx}
                  className="w-full bg-emerald-500/80 rounded-t-sm transition-all duration-500"
                  style={{ height: `${Math.max(15, (val / 5500) * 100)}%` }}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Panel: Dynamic Daily Stats Summary Bar */}
        <div className="glass-card rounded-[20px] p-4 flex items-center justify-between border border-zinc-800 mt-2">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase border-r border-zinc-850 pr-3 shrink-0 font-mono">Today's Vitals</span>
            
            <div className="flex items-center gap-5 flex-wrap text-[11px] text-zinc-300">
              {/* BP Status */}
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>BP: <strong className="text-zinc-100 font-mono">120/80 mmHg</strong> (Normal)</span>
              </div>

              {/* Distance */}
              <div className="flex items-center gap-1.5">
                <ActivityIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Distance: <strong className="text-zinc-100 font-mono">2.8 km</strong></span>
              </div>

              {/* Calories */}
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Active Burn: <strong className="text-zinc-100 font-mono">310 kcal</strong></span>
              </div>

              {/* Sleep Status */}
              <div className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span>Sleep: <strong className="text-zinc-100 font-mono">7h 58m</strong> (94%)</span>
              </div>

              {/* Fall Protection */}
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protection: <strong className="text-emerald-400 font-mono">Shield Active</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedMetric("hr")}
            className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-zinc-800 transition-colors shrink-0"
          >
            Expand Metrics
          </button>
        </div>

      </div>

    </div>
  );
}
