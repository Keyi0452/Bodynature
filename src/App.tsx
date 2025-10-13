import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { getQuestions, compute, BodyType, Answer } from "./standard";

/** ====== 🌿 东方配色风格主题 ====== */
const THEME = {
  bgGradient: "linear-gradient(to bottom, #FFF8ED 0%, #F8FAF8 40%, #EDF5F0 100%)",
  primary: "#0F766E",
  primaryHover: "#115E59",
  accent: "#059669",
  highlight: "#F59E0B",
  text: "#1C1917",
  subText: "#57534E",
  cardBg: "rgba(255,255,255,0.92)",
  border: "#E5E7EB",
};

/** ✅ 二维码跳转域名（改成你的主域名也行），或用 VITE_SITE_URL 覆盖 */
const FRIENDLY_URL = "https://checkyourbodynature.vercel.app";
const SITE_URL =
  (import.meta as any)?.env?.VITE_SITE_URL ||
  FRIENDLY_URL ||
  (typeof window !== "undefined" ? window.location.origin : "https://example.com");

/** 问卷评分刻度 */
const SCALE = [
  { v: 1, label: "1 从不/没有" },
  { v: 2, label: "2 偶尔/轻度" },
  { v: 3, label: "3 有时/中度" },
  { v: 4, label: "4 经常/较重" },
  { v: 5, label: "5 总是/严重" },
] as const;

type Answers = Partial<Record<BodyType, (Answer | undefined)[]>>;

/** ✅ 建议库（可按你品牌替换更细文案） */
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

type View = "form" | "result";

/** 确保 html2canvas 可用 */
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

export default function App() {
  const [view, setView] = useState<View>("form");
  const [sex, setSex] = useState<"male" | "female">("female");
  const bank = useMemo(() => getQuestions({ sex }), [sex]);

  const flat = useMemo(() => {
    const items: { type: BodyType; idx: number; text: string }[] = [];
    (Object.keys(bank) as BodyType[]).forEach((t) => {
      bank[t].forEach((q, i) => {
        items.push({ type: t, idx: i, text: q.text.replace(/[*＊]/g, "").trim() });
      });
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

  /** 提交问卷计算结果 */
  const handleSubmit = () => {
    const first = flat.findIndex((q) => !answers[q.type]?.[q.idx]);
    if (first !== -1) {
      setUnansweredIndex(first);
      document.querySelector(`#q-${first}`)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const { trans, ranking } = compute(answers as any, { sex });
    const mainTypes = ranking.slice(0, 2); // ✅ 包含平和质
    setResult({ trans, ranking, mainTypes });
    setView("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** ✅ 进入结果页后预生成二维码，保证 UI 与 PDF 都有 */
  useEffect(() => {
    const makeQR = async () => {
      try {
        const qrImg = document.getElementById("poster-qr") as HTMLImageElement | null;
        if (!qrImg) return;
        const qrDataUrl = await QRCode.toDataURL(SITE_URL, { margin: 1, width: 160 });
        qrImg.src = qrDataUrl;
      } catch (err) {
        console.error("QR generation failed", err);
      }
    };
    makeQR();
  }, []);

  /** ✅ 生成 PDF（二维码已在页面预先生成） */
  const createPosterPDF = async () => {
    const node = document.getElementById("poster-root");
    if (!node || !result) return;
    const html2canvas = await ensureHtml2canvas();
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#fff" });
    const img = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = 595;
    const imgH = (canvas.height / canvas.width) * pageW;
    pdf.addImage(img, "JPEG", 0, 0, pageW, imgH);
    pdf.save("体质自测-结果海报.pdf");
  };

  /** 问卷页 */
  if (view === "form") {
    return (
      <div className="min-h-screen" style={{ backgroundImage: THEME.bgGradient, color: THEME.text }}>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-3xl font-semibold text-center mb-3">中医体质判断问卷</h1>
          <p className="text-sm text-center mb-6" style={{ color: THEME.subText }}>
            了解体质，更准确的养生。<b>免责声明：</b>本网站不构成医疗建议，如有疾病请及时就医。
          </p>

          {/* 性别选择 + 进度条 */}
          <div
            className="mb-6 p-4 rounded-2xl shadow-sm backdrop-blur"
            style={{ background: THEME.cardBg, border: `1px solid ${THEME.border}` }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: THEME.subText }}>
                  性别：
                </span>
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: THEME.border }}>
                  {(["female", "male"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSex(s)}
                      className="px-3 py-1.5 text-sm transition-colors"
                      style={{ background: sex === s ? THEME.primary : "#fff", color: sex === s ? "#fff" : THEME.text }}
                    >
                      {s === "female" ? "女" : "男"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between text-xs mb-1" style={{ color: THEME.subText }}>
                  <span>完成度</span>
                  <span>
                    {done}/{total}（{percent}%）
                  </span>
                </div>
                <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.primary})` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 问题列表（不显示体质分组名） */}
          <ol className="space-y-5">
            {flat.map((q, i) => (
              <li
                key={i}
                id={`q-${i}`}
                className="border p-4 rounded-2xl shadow-sm"
                style={{ background: THEME.cardBg, borderColor: unansweredIndex === i ? THEME.highlight : THEME.border }}
              >
                <div className="font-medium mb-3">
                  {i + 1}、{q.text}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {SCALE.map((s) => (
                    <label key={s.v} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`q-${q.type}-${q.idx}`}
                        checked={answers[q.type]?.[q.idx] === s.v}
                        onChange={() => {
                          const next: Answers = { ...answers };
                          const arr = (next[q.type]
                            ? [...(next[q.type] as any)]
                            : Array((bank[q.type] || []).length).fill(undefined)) as (Answer | undefined)[];
                          arr[q.idx] = s.v as Answer;
                          next[q.type] = arr;
                          setAnswers(next);
                        }}
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>

          <div className="text-center mt-8">
            <button
              onClick={handleSubmit}
              className="px-6 py-2 rounded-xl text-white shadow-sm"
              style={{ background: THEME.primary }}
            >
              计算结果
            </button>
          </div>
        </div>
      </div>
    );
  }

  /** 结果页 */
  const trans = result!.trans;
  const main = result!.mainTypes;
  const ranking = result!.ranking;

  return (
    <div className="min-h-screen" style={{ backgroundImage: THEME.bgGradient, color: THEME.text }}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-semibold text-center mb-6">体质判定与养生建议</h1>

        <div
          className="p-4 mb-6 rounded-2xl shadow-sm"
          style={{ background: THEME.cardBg, border: `1px solid ${THEME.border}` }}
        >
          <div className="text-lg font-semibold mb-1">主要体质（得分前2名）</div>
          <div className="text-sm">{main.join("、")}</div>
          <div className="mt-2 text-sm" style={{ color: THEME.subText }}>
            其他体质从高到低：{ranking.filter((t) => !main.includes(t)).join("、")}
          </div>
        </div>

        {/* 导出海报区域 */}
        <div id="poster-root" className="p-10 bg-white rounded-2xl shadow" style={{ border: `1px solid ${THEME.border}` }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-1">体质自测 · 结果海报</h2>
            <div className="text-sm" style={{ color: THEME.subText }}>
              主要体质：{main.join("、")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10">
            {/* 左侧：柱状图与建议摘要 */}
            <div>
              <div className="font-medium mb-2">各体质转化分（0~100）</div>
              <div className="space-y-2 mb-6">
                {(Object.keys(trans) as BodyType[])
                  .map((k) => ({ k, v: trans[k] }))
                  .sort((a, b) => b.v - a.v)
                  .map(({ k, v }) => (
                    <div key={k} className="flex items-center gap-3">
                      <div className="w-16 text-right text-sm">{k}</div>
                      <div className="flex-1 h-3 bg-stone-200 rounded overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.max(2, Math.min(100, v))}%`,
                            background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.primary})`,
                          }}
                        />
                      </div>
                      <div className="w-10 text-right text-sm">{v.toFixed(0)}</div>
                    </div>
                  ))}
              </div>

              <div className="font-medium mb-2">建议摘要</div>
              <ul className="text-sm list-disc list-inside space-y-1">
                {main
                  .flatMap((t) => ADVICE[t].daily.slice(0, 1).concat(ADVICE[t].diet.slice(0, 1)))
                  .map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
              </ul>
            </div>

            {/* 右侧：二维码（预生成） */}
            <div className="text-center">
              <img id="poster-qr" alt="qrcode" className="inline-block w-40 h-40 bg-stone-100 object-contain" />
              <div className="mt-3 text-sm text-stone-500">扫码查看完整报告</div>
            </div>
          </div>

          <div className="mt-8 text-center text-xs" style={{ color: THEME.subText }}>
            * 本工具仅用于健康教育与体质自测，不构成医疗建议；如有不适或疾病，请及时就医。
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="mt-6 flex flex-wrap items-center gap-3 justify-center">
          <button
            onClick={() => setView("form")}
            className="px-4 py-2 rounded-xl border shadow-sm"
            style={{ borderColor: THEME.border, color: THEME.text }}
          >
            返回修改答案
          </button>
          <button
            onClick={createPosterPDF}
            className="px-4 py-2 rounded-xl text-white shadow-sm"
            style={{ background: THEME.primary }}
          >
            生成海报 PDF
          </button>
        </div>

        {/* 外部推广链接（小红书） */}
        <div className="mt-10 text-center text-sm" style={{ color: THEME.subText }}>
          想了解更多中医养生知识？<br />
          欢迎在小红书搜索：
          <a
            href="https://www.xiaohongshu.com/search_result?keyword=%E7%8E%8B%E5%92%A9%E5%92%A9%E5%9C%A8%E6%96%B0%E5%8A%A0%E5%9D%A1"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 font-medium underline"
            style={{ color: THEME.primary }}
          >
            王咩咩在新加坡
          </a>
        </div>
      </div>
    </div>
  );
}