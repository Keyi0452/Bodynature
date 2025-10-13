import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { getQuestions, compute, BodyType, Answer } from "./standard";

const THEME = {
  bgGradient: "linear-gradient(to bottom, #FFF8ED 0%, #F6FAF7 40%, #FDF6EC 100%)",
  text: "#1C1917",
  subText: "#57534E",
  cardBg: "rgba(255,255,255,0.92)",
  border: "#E5E7EB",
  brand: "#B45309",
  brandDark: "#92400E",
  accent: "#F59E0B",
};

function paletteFor(t?: BodyType) {
  switch (t) {
    case "阳虚质": return { main: "#F59E0B", dark: "#B45309", soft: "#FEF3C7" };
    case "气虚质": return { main: "#D97706", dark: "#92400E", soft: "#FFF7ED" };
    case "阴虚质": return { main: "#EF4444", dark: "#991B1B", soft: "#FEE2E2" };
    case "血瘀质": return { main: "#7C3AED", dark: "#5B21B6", soft: "#F3E8FF" };
    case "痰湿质": return { main: "#22C55E", dark: "#15803D", soft: "#DCFCE7" };
    case "湿热质": return { main: "#06B6D4", dark: "#0E7490", soft: "#CFFAFE" };
    case "气郁质": return { main: "#60A5FA", dark: "#1D4ED8", soft: "#DBEAFE" };
    case "特禀质": return { main: "#F472B6", dark: "#BE185D", soft: "#FCE7F3" };
    default: return { main: "#B45309", dark: "#92400E", soft: "#FFF7ED" };
  }
}

const SITE_URL = "https://checkyourbodynature.vercel.app";

async function ensureHtml2canvas(): Promise<(node: HTMLElement, opts?: any) => Promise<HTMLCanvasElement>> {
  const mod = await import("html2canvas");
  return mod.default;
}

const SCALE = [
  { v: 1, label: "1 从不/没有" },
  { v: 2, label: "2 偶尔/轻度" },
  { v: 3, label: "3 有时/中度" },
  { v: 4, label: "4 经常/较重" },
  { v: 5, label: "5 总是/严重" },
] as const;

type Answers = Partial<Record<BodyType, (Answer | undefined)[]>>;

const ADVICE: Record<BodyType, { daily: string[]; diet: string[] }> = {
  平和质: { daily: ["作息规律，四季随时令；不过度劳累。"], diet: ["饮食清淡、均衡多样；少油腻辛辣。"] },
  阳虚质: { daily: ["重视保暖；腰腹、足部注意御寒。"], diet: ["温补为主：生姜、羊肉、桂圆；少冷饮生食。"] },
  阴虚质: { daily: ["避免熬夜与过度出汗，室内湿度适中。"], diet: ["滋阴润燥：百合、银耳、沙参；少辛辣烧烤。"] },
  气虚质: { daily: ["早睡早起，午后小憩；避免久坐透支。"], diet: ["温热饮食，少生冷；大枣山药莲子煲粥。"] },
  气郁质: { daily: ["增加户外活动，放松身心。"], diet: ["疏肝理气：佛手、陈皮、玫瑰花茶。"] },
  血瘀质: { daily: ["避免久坐久立，热敷或泡脚促进气血。"], diet: ["活血：山楂、黑木耳；少寒凉黏滞。"] },
  痰湿质: { daily: ["清淡饮食，少油少甜；规律作息。"], diet: ["祛湿化痰：薏米、赤小豆、陈皮。"] },
  湿热质: { daily: ["避免熬夜与过度辛辣；注意通风。"], diet: ["清热利湿：冬瓜、苦瓜、绿豆。"] },
  特禀质: { daily: ["减少过敏原暴露；保持室内洁净通风。"], diet: ["避免过敏食物，清润饮食。"] },
};

const isWeChat = () => typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);
const isMobile = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

type View = "form" | "result";

export default function App() {
  const [view, setView] = useState<View>("form");
  const [sex, setSex] = useState<"male" | "female">("female");
  const bank = useMemo(() => getQuestions({ sex }), [sex]);
  const flat = useMemo(() => {
    const items: { type: BodyType; idx: number; text: string }[] = [];
    (Object.keys(bank) as BodyType[]).forEach((t) => {
      bank[t].forEach((q, i) => items.push({ type: t, idx: i, text: q.text.replace(/[*＊]/g, "").trim() }));
    });
    return items;
  }, [bank]);

  const [answers, setAnswers] = useState<Answers>({});
  useEffect(() => {
    const init: Answers = {};
    (Object.keys(bank) as BodyType[]).forEach((t) => (init[t] = Array(bank[t].length).fill(undefined)));
    setAnswers(init);
  }, [bank]);

  const total = flat.length;
  const done = flat.filter((q) => answers[q.type]?.[q.idx]).length;
  const percent = Math.round((done / Math.max(1, total)) * 100);

  const [result, setResult] = useState<{ trans: Record<BodyType, number>; ranking: BodyType[]; mainTypes: BodyType[] } | null>(null);

  const handleSubmit = () => {
    const first = flat.findIndex((q) => !answers[q.type]?.[q.idx]);
    if (first !== -1) {
      document.querySelector(`#q-${first}`)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const { trans, ranking } = compute(answers as any, { sex });
    const mainTypes = ranking.slice(0, 2);
    setResult({ trans, ranking, mainTypes });
    setView("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  async function generateQR() {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    await QRCode.toCanvas(canvas, SITE_URL, { margin: 1, width: 180, errorCorrectionLevel: "M" });
  }

  useEffect(() => { if (view === "result") generateQR(); }, [view]);

  async function handleSharePoster() {
    try {
      const html2canvas = await ensureHtml2canvas();
      const node = document.getElementById("poster-root");
      if (!node) return;
      const canvas = await html2canvas(node, { scale: 2 });
      const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b as Blob), "image/png"));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "体质自测-分享图.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("生成分享图失败，请稍后再试。");
    }
  }

  if (view === "form") {
    return (
      <div className="min-h-screen" style={{ backgroundImage: THEME.bgGradient, color: THEME.text }}>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-3xl font-semibold text-center mb-3">中医体质判断问卷</h1>
          <p className="text-sm text-center mb-6" style={{ color: THEME.subText }}>
            了解体质，更准确的养生。<b>免责声明：</b>本网站不构成医疗建议，如有疾病请及时就医。
          </p>
          <div className="mb-6 p-4 rounded-2xl shadow-sm backdrop-blur" style={{ background: THEME.cardBg, border: `1px solid ${THEME.border}` }}>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: THEME.subText }}>性别：</span>
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: THEME.border }}>
                  {(["female", "male"] as const).map((s) => (
                    <button key={s} onClick={() => setSex(s)}
                      className="px-3 py-1.5 text-sm transition-colors"
                      style={{ background: sex === s ? THEME.brand : "#fff", color: sex === s ? "#fff" : THEME.text }}>
                      {s === "female" ? "女" : "男"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between text-xs mb-1" style={{ color: THEME.subText }}>
                  <span>完成度</span><span>{done}/{total}（{percent}%）</span>
                </div>
                <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: `linear-gradient(90deg, #FDBA74, ${THEME.brand})` }} />
                </div>
              </div>
            </div>
          </div>
          <ol className="space-y-4">
            {flat.map((q, i) => (
              <li key={i} id={`q-${i}`} className="p-4 rounded-2xl shadow-sm" style={{ background: THEME.cardBg, border: `1px solid ${THEME.border}` }}>
                <div className="mb-2 text-sm">{i + 1}. {q.text}</div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {SCALE.map((s) => (
                    <label key={s.v} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={`${q.type}-${i}`}
                        checked={answers[q.type]?.[q.idx] === s.v}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.type]: prev[q.type]?.map((x, j) => (j === q.idx ? s.v : x)),
                          }))
                        }
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <div className="text-center mt-8">
            <button
              onClick={handleSubmit}
              disabled={done < total}
              className="px-6 py-2 rounded-xl text-white shadow-sm"
              style={{ background: done === total ? THEME.brandDark : "#aaa" }}>
              提交并查看结果
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const { trans, mainTypes } = result;

  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundImage: THEME.bgGradient, color: THEME.text }}>
      <div id="poster-root" className="max-w-3xl mx-auto rounded-2xl p-6 shadow-md" style={{ background: THEME.cardBg }}>
        <h2 className="text-center text-2xl font-semibold mb-1">体质自测 · 结果海报</h2>
        <div className="text-center text-sm mb-6" style={{ color: THEME.subText }}>
          主要体质：{mainTypes.join("、")}
        </div>
        <div className="flex flex-col sm:flex-row gap-6 items-start justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium mb-2">各体质转化分（0~100）</div>
            {Object.entries(trans).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 mb-1">
                <div style={{ width: "5em" }}>{k}</div>
                <div className="flex-1 h-3 bg-stone-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${v}%`, background: paletteFor(k as BodyType).main }} />
                </div>
                <div className="w-10 text-right text-sm">{v.toFixed(0)}</div>
              </div>
            ))}
            <div className="font-medium mb-2 mt-6">建议摘要</div>
            <ul className="text-sm list-disc list-inside space-y-1">
              {mainTypes.flatMap((t) => ADVICE[t]?.daily.concat(ADVICE[t]?.diet || [])).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="text-center">
            <canvas ref={qrCanvasRef} width={180} height={180} className="inline-block bg-white rounded-xl" />
            <div className="mt-2 text-xs text-stone-500">扫码进入体质测试</div>
          </div>
        </div>
        <div className="mt-8 text-center text-xs" style={{ color: THEME.subText }}>
          * 本工具仅用于健康教育与体质自测，不构成医疗建议；如有不适或疾病，请及时就医。
        </div>
      </div>
      <div className="text-center mt-6">
        <button onClick={() => setView("form")} className="px-4 py-2 rounded-xl border mr-3"
          style={{ borderColor: THEME.border, color: THEME.text }}>
          返回修改答案
        </button>
        <button onClick={handleSharePoster} className="px-4 py-2 rounded-xl text-white shadow-sm"
          style={{ background: THEME.brandDark }}>
          分享给朋友
        </button>
      </div>
    </div>
  );
}
