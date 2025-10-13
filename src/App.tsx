import React, { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { getQuestions, compute, BodyType, Answer } from "./standard";

/** ========= 主题与样式 ========= */
const THEME = {
  bgGradient: "linear-gradient(to bottom, #FFF8ED 0%, #F6FAF7 40%, #EEF5F1 100%)",
  text: "#1C1917",
  subText: "#57534E",
  cardBg: "rgba(255,255,255,0.92)",
  border: "#E5E7EB",
  brand: "#0F766E",
};

/** 体质 → 海报主色（可调） */
function paletteFor(t: BodyType | undefined) {
  switch (t) {
    case "阳虚质":
      return { main: "#F59E0B", dark: "#B45309", soft: "#FEF3C7" }; // 暖橙
    case "气虚质":
      return { main: "#D97706", dark: "#92400E", soft: "#FFF7ED" }; // 金黄
    case "阴虚质":
      return { main: "#EF4444", dark: "#991B1B", soft: "#FEE2E2" }; // 赤
    case "血瘀质":
      return { main: "#7C3AED", dark: "#5B21B6", soft: "#F3E8FF" }; // 紫
    case "痰湿质":
      return { main: "#22C55E", dark: "#15803D", soft: "#DCFCE7" }; // 绿
    case "湿热质":
      return { main: "#06B6D4", dark: "#0E7490", soft: "#CFFAFE" }; // 青
    case "气郁质":
      return { main: "#60A5FA", dark: "#1D4ED8", soft: "#DBEAFE" }; // 蓝
    case "特禀质":
      return { main: "#F472B6", dark: "#BE185D", soft: "#FCE7F3" }; // 粉
    case "平和质":
    default:
      return { main: "#0F766E", dark: "#115E59", soft: "#E6FBF6" }; // 青绿
  }
}

/** 二维码跳转地址（可换成你的主域名；或用 VITE_SITE_URL 覆盖） */
const FRIENDLY_URL = "https://checkyourbodynature.vercel.app";
const SITE_URL =
  (import.meta as any)?.env?.VITE_SITE_URL ||
  FRIENDLY_URL ||
  (typeof window !== "undefined" ? window.location.origin : "https://example.com");

/** 评分刻度 */
const SCALE = [
  { v: 1, label: "1 从不/没有" },
  { v: 2, label: "2 偶尔/轻度" },
  { v: 3, label: "3 有时/中度" },
  { v: 4, label: "4 经常/较重" },
  { v: 5, label: "5 总是/严重" },
] as const;

type Answers = Partial<Record<BodyType, (Answer | undefined)[]>>;

/** 简洁建议库（可换成你的完整版） */
const ADVICE: Record<
  BodyType,
  { daily: string[]; diet: string[]; sport: string[]; mood: string[] }
> = {
  平和质: {
    daily: ["作息规律，四季随时令；不过度劳累。", "户外日晒与适度出汗。"],
    diet: ["饮食清淡、均衡多样；少油腻辛辣。"],
    sport: ["快走、骑行、八段锦，每周3–5次。"],
    mood: ["保持乐观，适度社交与亲近自然。"],
  },
  气虚质: {
    daily: ["早睡早起，午后可小憩；避免久坐与透支。", "注意保暖，减少空调直吹。"],
    diet: ["温热饮食，少生冷；可用大枣、山药、莲子煲粥。"],
    sport: ["缓和运动：太极/八段锦/散步；循序渐进。"],
    mood: ["减少过度担忧；番茄钟法，劳逸结合。"],
  },
  阳虚质: {
    daily: ["重视保暖；腰腹、足部注意御寒。", "日晒+温水泡脚。"],
    diet: ["温补为主：生姜、羊肉、桂圆；少冷饮生食。"],
    sport: ["中低强度有氧+核心热身；出汗微微即可。"],
    mood: ["避免久坐与阴冷环境；保持积极社交。"],
  },
  阴虚质: {
    daily: ["避免熬夜与过度出汗；室内湿度适中。", "午后适度休息，护眼。"],
    diet: ["滋阴润燥：百合、银耳、沙参、麦冬；少辛辣烧烤。"],
    sport: ["舒缓为主：瑜伽、太极、游泳（不过度）。"],
    mood: ["情绪平稳，学会放慢节奏与深呼吸。"],
  },
  痰湿质: {
    daily: ["清淡饮食，控制甜食夜宵；规律作息。", "多通风、多走动。"],
    diet: ["祛湿化痰：陈皮、薏米、赤小豆；少油腻奶茶酒。"],
    sport: ["中低强度耐力：快走/慢跑/骑行，每周4–5次。"],
    mood: ["减少久坐与沉溺；设定每日步数目标。"],
  },
  湿热质: {
    daily: ["避免熬夜与过度辛辣；注意清洁通风。"],
    diet: ["清热利湿：绿豆、冬瓜、苦瓜、荷叶；少烤串油炸酒。"],
    sport: ["适度运动+充分补水，避免高温曝晒后大汗久坐。"],
    mood: ["心平气和；规律作息减轻内热。"],
  },
  血瘀质: {
    daily: ["避免久坐久立，注意保暖驱寒。", "热敷/泡脚促进气血。"],
    diet: ["活血食材：山楂、黑木耳、红酒适量；少寒凉黏滞。"],
    sport: ["有氧+舒展：快走、拉伸、瑜伽；规律坚持。"],
    mood: ["舒畅心情，减少长期负面情绪与压力。"],
  },
  气郁质: {
    daily: ["增加日照与户外活动；建立规律作息。"],
    diet: ["疏肝理气：佛手、陈皮、玫瑰花茶；少咖啡因与酒精。"],
    sport: ["节律性：舞蹈、慢跑、呼吸练习。"],
    mood: ["倾诉/写作/音乐舒压；冥想与腹式呼吸。"],
  },
  特禀质: {
    daily: ["减少过敏原暴露；保持室内洁净通风。"],
    diet: ["个别过敏食物需回避；清润饮食。"],
    sport: ["适度、规律；花粉季避免高强度户外。"],
    mood: ["情绪稳定，避免过度精神紧张。"],
  },
};

/** html2canvas 兜底加载 */
async function ensureHtml2canvas(): Promise<(node: HTMLElement, opts?: any) => Promise<HTMLCanvasElement>> {
  try {
    const mod = await import("html2canvas");
    return mod.default;
  } catch {
    if (typeof window !== "undefined" && (window as any).html2canvas) {
      return (window as any).html2canvas;
    }
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("load html2canvas failed"));
      document.head.appendChild(s);
    });
    return (window as any).html2canvas;
  }
}

/** ========= 主组件 ========= */
type View = "form" | "result";

export default function App() {
  const [view, setView] = useState<View>("form");
  const [sex, setSex] = useState<"male" | "female">("female");
  const bank = useMemo(() => getQuestions({ sex }), [sex]);

  /** 平铺题库 */
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
  const [unansweredIndex, setUnansweredIndex] = useState<number | null>(null);

  const [result, setResult] = useState<{
    trans: Record<BodyType, number>;
    ranking: BodyType[];
    mainTypes: BodyType[];
  } | null>(null);

  /** 提交计算结果 */
  const handleSubmit = () => {
    const first = flat.findIndex((q) => !answers[q.type]?.[q.idx]);
    if (first !== -1) {
      setUnansweredIndex(first);
      document.querySelector(`#q-${first}`)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const { trans, ranking } = compute(answers as any, { sex });
    const mainTypes = ranking.slice(0, 2); // 包含平和质
    setResult({ trans, ranking, mainTypes });
    setView("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** ====== 二维码（canvas绘制，稳定） ====== */
  const [qrReady, setQrReady] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  async function generateQR(): Promise<void> {
    try {
      setQrReady(false);
      const canvas = qrCanvasRef.current || (document.getElementById("poster-qr") as HTMLCanvasElement | null);
      if (!canvas) return;
      await QRCode.toCanvas(canvas, SITE_URL, { margin: 1, width: 180, errorCorrectionLevel: "M" });
      setQrReady(true);
    } catch (e) {
      console.error("QR generation failed:", e);
      setQrReady(true);
    }
  }

  useEffect(() => {
    if (view === "result") generateQR();
  }, [view]);

  /** 生成海报 PDF */
  const createPosterPDF = async () => {
    const node = document.getElementById("poster-root");
    if (!node || !result) return;

    if (!qrReady) {
      await generateQR();
      await new Promise((r) => setTimeout(r, 80));
    }

    const html2canvas = await ensureHtml2canvas();
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
    const img = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = 595, imgH = (canvas.height / canvas.width) * pageW;
    pdf.addImage(img, "JPEG", 0, 0, pageW, imgH);
    pdf.save("体质自测-结果海报.pdf");
  };

  /** ====== 问卷视图 ====== */
  if (view === "form") {
    return (
      <div className="min-h-screen" style={{ backgroundImage: THEME.bgGradient, color: THEME.text }}>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-3xl font-semibold text-center mb-3">中医体质判断问卷</h1>
          <p className="text-sm text-center mb-6" style={{ color: THEME.subText }}>
            了解个人体质，更准确的养生吧。<b>免责声明：</b>本网站不构成医疗建议，如有疾病请及时就医。
          </p>

          <div className="mb-6 p-4 rounded-2xl shadow-sm backdrop-blur"
               style={{ background: THEME.cardBg, border: `1px solid ${THEME.border}` }}>
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
                  <div className="h-full rounded-full transition-all"
                       style={{ width: `${percent}%`, background: `linear-gradient(90deg, #34D399, ${THEME.brand})` }} />
                </div>
              </div>
            </div>
          </div>

          <ol className="space-y-5">
            {flat.map((q, i) => (
              <li key={i} id={`q-${i}`} className="border p-4 rounded-2xl shadow-sm"
                  style={{ background: THEME.cardBg, borderColor: unansweredIndex === i ? "#F59E0B" : THEME.border }}>
                <div className="font-medium mb-3">{i + 1}、{q.text}</div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {SCALE.map((s) => (
                    <label key={s.v} className="inline-flex items-center gap-2">
                      <input type="radio" name={`q-${q.type}-${q.idx}`}
                             checked={answers[q.type]?.[q.idx] === s.v}
                             onChange={() => {
                               const next: Answers = { ...answers };
                               const arr = (next[q.type]
                                 ? [...(next[q.type] as any)]
                                 : Array((bank[q.type] || []).length).fill(undefined)) as (Answer | undefined)[];
                               arr[q.idx] = s.v as Answer;
                               next[q.type] = arr;
                               setAnswers(next);
                             }} />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>

          <div className="text-center mt-8">
            <button onClick={handleSubmit}
                    className="px-6 py-2 rounded-xl text-white shadow-sm"
                    style={{ background: THEME.brand }}>计算结果</button>
          </div>
        </div>
      </div>
    );
  }

  /** ====== 结果视图（海报） ====== */
  const trans = result!.trans;
  const main = result!.mainTypes; // 前两名（包含平和质）
  const ranking = result!.ranking;
  const pal = paletteFor(main[0]);

  return (
    <div className="min-h-screen" style={{ backgroundImage: THEME.bgGradient, color: THEME.text }}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-center mb-6">体质判定与养生建议</h1>

        {/* 海报容器（带水印/渐变/印章） */}
        <div id="poster-root"
             className="relative p-10 rounded-3xl shadow-lg overflow-hidden"
             style={{
               background: `radial-gradient(1200px 800px at -10% -20%, ${pal.soft} 0%, rgba(255,255,255,0) 60%), radial-gradient(900px 700px at 120% 10%, #FFFFFF 0%, rgba(255,255,255,0) 60%), #FFFFFF`,
               border: `1px solid ${THEME.border}`
             }}>
          {/* 右上印章 */}
          <div className="absolute right-6 top-6 select-none"
               style={{ color: pal.dark, border: `2px solid ${pal.dark}`, borderRadius: "10px", padding: "6px 10px",
                        fontWeight: 700, transform: "rotate(-8deg)" }}>
            体质档案
          </div>

          {/* 标题 */}
          <div className="text-center mb-8">
            <div className="text-2xl font-semibold tracking-wide">体质自测 · 结果海报</div>
            <div className="mt-1 text-sm" style={{ color: THEME.subText }}>
              主要体质：{main.join("、")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10">
            {/* 左：柱状图 + 建议 */}
            <div>
              <div className="font-medium mb-3">各体质转化分（0~100）</div>
              <div className="space-y-2 mb-6">
                {(Object.keys(trans) as BodyType[])
                  .map((k) => ({ k, v: trans[k] }))
                  .sort((a, b) => b.v - a.v)
                  .map(({ k, v }) => (
                    <div key={k} className="flex items-center gap-3">
                      <div className="w-16 text-right text-sm">{k}</div>
                      <div className="flex-1 h-3 bg-stone-200 rounded-full overflow-hidden">
                        <div className="h-full"
                             style={{
                               width: `${Math.max(2, Math.min(100, v))}%`,
                               background: `linear-gradient(90deg, ${pal.main}, ${pal.dark})`,
                               borderRadius: 999
                             }} />
                      </div>
                      <div className="w-10 text-right text-sm">{v.toFixed(0)}</div>
                    </div>
                  ))}
              </div>

              <div className="font-medium mb-2">建议摘要</div>
              <ul className="text-sm list-disc list-inside space-y-1">
                {main
                  .flatMap((t) => ADVICE[t].daily.slice(0, 1).concat(ADVICE[t].diet.slice(0, 1)))
                  .map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            {/* 右：二维码 + 标语 */}
            <div className="text-center">
              <div className="inline-block p-3 rounded-2xl"
                   style={{ background: "#F8FAFC", border: `1px solid ${THEME.border}` }}>
                <canvas id="poster-qr" ref={qrCanvasRef} width={180} height={180}
                        className="inline-block w-44 h-44 bg-white" />
              </div>
              <div className="mt-3 text-sm" style={{ color: THEME.subText }}>扫码查看完整报告</div>

              <div className="mt-6 text-xs">
                <div className="font-medium" style={{ color: pal.dark }}>Check Your Bodynature</div>
                <div style={{ color: THEME.subText }}>更了解自己，更精准养生</div>
              </div>
            </div>
          </div>

          {/* 脚注 */}
          <div className="mt-8 text-center text-xs" style={{ color: THEME.subText }}>
            * 本工具仅用于健康教育与体质自测，不构成医疗建议；如有不适或疾病，请及时就医。
          </div>
        </div>

        {/* 主要体质、其他体质说明卡 */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl shadow-sm"
               style={{ background: THEME.cardBg, border: `1px solid ${THEME.border}` }}>
            <div className="text-sm" style={{ color: THEME.subText }}>主要体质（得分前2名）</div>
            <div className="text-lg font-semibold">{main.join("、")}</div>
          </div>
          <div className="p-4 rounded-2xl shadow-sm"
               style={{ background: THEME.cardBg, border: `1px solid ${THEME.border}` }}>
            <div className="text-sm" style={{ color: THEME.subText }}>其他体质（高→低）</div>
            <div className="text-sm">{ranking.filter((t) => !main.includes(t)).join("、")}</div>
          </div>
        </div>

        {/* 操作区 */}
        <div className="mt-8 flex flex-wrap items-center gap-3 justify-center">
          <button onClick={() => setView("form")}
                  className="px-4 py-2 rounded-xl border shadow-sm"
                  style={{ borderColor: THEME.border, color: THEME.text }}>
            返回修改答案
          </button>
          <button onClick={createPosterPDF}
                  className="px-4 py-2 rounded-xl text-white shadow-sm"
                  style={{ background: pal.dark }}>
            生成海报 PDF
          </button>
        </div>

        {/* 小红书推广 */}
        <div className="mt-8 text-center text-sm" style={{ color: THEME.subText }}>
          想了解更多体质养生内容？在小红书搜索：
          <a
            className="ml-1 underline font-medium"
            style={{ color: pal.dark }}
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.xiaohongshu.com/search_result?keyword=%E7%8E%8B%E5%92%A9%E5%92%A9%E5%9C%A8%E6%96%B0%E5%8A%A0%E5%9D%A1"
          >
            王咩咩在新加坡
          </a>
        </div>
      </div>
    </div>
  );
}