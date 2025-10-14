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

const DESCRIPTION: Record<BodyType, string> = {
  平和质: "你的身体状态整体平衡，精神好、睡眠也不错。保持规律作息、饮食清淡，是很理想的体质。",
  气虚质: "容易觉得累，说话没力气，天气变化时也容易感冒。注意多休息、保证睡眠会更好。",
  阳虚质: "怕冷、手脚常冰凉，容易精神不振。多晒太阳、吃热的食物会让你更有活力。",
  阴虚质: "常觉得热、容易口干、睡不踏实。多喝水、别太晚睡，会让身体更舒服。",
  痰湿质: "容易困、身体沉重，或有点怕热。清淡饮食、少油腻能让身体更轻松。",
  湿热质: "脸上容易出油或长痘，有时觉得闷热或口苦。清爽饮食、多喝水最合适。",
  血瘀质: "有时脸色暗、皮肤干、容易酸痛。适度活动、拉伸会让气血更顺畅。",
  气郁质: "容易心情闷、紧张或焦虑，睡眠也容易受影响。多放松、多交流能帮你舒展心情。",
  特禀质: "体质比较敏感，容易过敏或对环境变化反应大。注意防护、保持稳定作息就很好。",
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

export default function App() {
  const [view, setView] = useState<"form" | "result">("form");
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
  useEffect(() => {
    if (view === "result" && qrCanvasRef.current) QRCode.toCanvas(qrCanvasRef.current, SITE_URL, { width: 160 });
  }, [view]);

  if (view === "form") {
    return (
      <div className="min-h-screen" style={{ backgroundImage: THEME.bgGradient, color: THEME.text }}>
        <div className="max-w-3xl mx-auto p-6">
          <h1 className="text-3xl font-semibold text-center mb-2">中医体质判断问卷</h1>
          <p className="text-sm text-center mb-6" style={{ color: THEME.subText }}>
            了解体质，更准确的养生。<b>免责声明：</b>本网站不构成医疗建议，如有疾病请及时就医。
          </p>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span>性别：</span>
              {(["female", "male"] as const).map((s) => (
                <button key={s} onClick={() => setSex(s)} className="px-3 py-1.5 rounded"
                  style={{ background: sex === s ? THEME.brand : "#fff", color: sex === s ? "#fff" : THEME.text }}>
                  {s === "female" ? "女" : "男"}
                </button>
              ))}
            </div>
            <div className="flex-1 ml-6">
              <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-xs text-right mt-1" style={{ color: THEME.subText }}>
                {done}/{total}（{percent}%）
              </p>
            </div>
          </div>
          <ol className="space-y-4">
            {flat.map((q, i) => (
              <li key={i} id={`q-${i}`} className="p-4 rounded-2xl shadow-sm"
                style={{ background: THEME.cardBg, border: `1px solid ${THEME.border}` }}>
                <div className="mb-2">{i + 1}. {q.text}</div>
                <div className="flex flex-wrap gap-4">
                  {SCALE.map((s) => (
                    <label key={s.v}>
                      <input type="radio" name={`${q.type}-${i}`} checked={answers[q.type]?.[q.idx] === s.v}
                        onChange={() => setAnswers((p) => ({ ...p, [q.type]: p[q.type]?.map((x, j) => (j === q.idx ? s.v : x)) }))} />
                      <span className="ml-1">{s.label}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <div className="text-center mt-6">
            <button onClick={handleSubmit} className="px-6 py-2 rounded-xl text-white" style={{ background: THEME.brand }}>
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
      <div className="max-w-3xl mx-auto bg-white/90 rounded-2xl shadow p-6">
        <h2 className="text-2xl font-semibold text-center mb-4">体质自测 · 结果报告</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {mainTypes.map((t) => (
            <div key={t} className="p-4 rounded-2xl shadow-sm text-sm" style={{ background: paletteFor(t).soft }}>
              <div className="text-lg font-semibold mb-1" style={{ color: paletteFor(t).dark }}>{t}</div>
              <div style={{ color: THEME.text }}>{DESCRIPTION[t]}</div>
            </div>
          ))}
        </div>
        <div className="mb-6">
          <h3 className="font-medium mb-2">各体质转化分（0~100）</h3>
          {(Object.entries(trans) as [BodyType, number][]).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 mb-1">
              <div style={{ width: "5em" }}>{k}</div>
              <div className="flex-1 h-3 bg-stone-200 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${v}%`, background: paletteFor(k).main }} />
              </div>
              <div className="w-10 text-right text-sm">{v.toFixed(0)}</div>
            </div>
          ))}
        </div>
        <div className="mb-6">
          <h3 className="font-medium mb-1">建议摘要</h3>
          <ul className="text-sm list-disc list-inside space-y-1">
            {mainTypes.flatMap((t) => ADVICE[t]?.daily.concat(ADVICE[t]?.diet || [])).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center">
            <canvas ref={qrCanvasRef} width={160} height={160} className="bg-white p-2 rounded-xl inline-block" />
            <p className="text-xs mt-2" style={{ color: THEME.subText }}>扫码进入体质测试</p>
          </div>
          <div className="text-xs text-stone-500 text-center sm:text-right">
            * 本工具仅用于健康教育与体质自测，不构成医疗建议；如有不适或疾病，请及时就医。
          </div>
        </div>
        <div className="text-center mt-6">
          <button onClick={() => setView("form")} className="px-4 py-2 rounded-xl border mr-3"
            style={{ borderColor: THEME.border }}>返回修改答案</button>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="px-4 py-2 rounded-xl text-white"
            style={{ background: THEME.brandDark }}>分享给朋友</button>
        </div>
      </div>
    </div>
  );
}