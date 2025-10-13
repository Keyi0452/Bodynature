import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { getQuestions, compute, BodyType, Answer } from "./standard";

/** ====== 🌿 可配置东方配色主题 ====== */
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

/** ✅ 好记域名（接入自定义域名后改这里或在 Vercel 设 VITE_SITE_URL） */
const FRIENDLY_URL = "https://bodynature.vercel.app";
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

/** —— 简洁版建议库（可替换为你的完整版） —— */
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

/** 兜底加载 html2canvas：优先 ESM import；失败则从 CDN 注入 */
async function ensureHtml2canvas(): Promise<(node: HTMLElement, opts?: any) => Promise<HTMLCanvasElement>> {
  try {
    const mod = await import("html2canvas");
    return mod.default;
  } catch {
    // @ts-ignore
    if (typeof window !== "undefined" && (window as any).html2canvas) {
      // @ts-ignore
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
    // @ts-ignore
    return (window as any).html2canvas;
  }
}

export default function App() {
  /** 视图切换：问卷 -> 结果页 */
  const [view, setView] = useState<View>("form");

  /** 性别与题库 */
  const [sex, setSex] = useState<"male" | "female">("female");
  const bank = useMemo(() => getQuestions({ sex }), [sex]);

  /** 平铺题库（隐藏体质分组，连续编号） */
  const flat = useMemo(() => {
    const items: { type: BodyType; idx: number; text: string }[] = [];
    (Object.keys(bank) as BodyType[]).forEach((t) => {
      bank[t].forEach((q, i) => {
        items.push({ type: t, idx: i, text: q.text.replace(/[*＊]/g, "").trim() });
      });
    });
    return items;
  }, [bank]);

  /** 答案（性别变化时重置） */
  const [answers, setAnswers] = useState<Answers>({});
  useEffect(() => {
    const init: Answers = {};
    (Object.keys(bank) as BodyType[]).forEach((t) => (init[t] = Array(bank[t].length).fill(undefined)));
    setAnswers(init);
  }, [bank]);

  /** 进度与未答定位 */
  const [unansweredIndex, setUnansweredIndex] = useState<number | null>(null);
  const total = flat.length;
  const done = flat.filter((q) => answers[q.type]?.[q.idx]).length;
  const percent = Math.round((done / Math.max(1, total)) * 100);

  /** 结果数据（进入结果页时生成） */
  const [result, setResult] = useState<{
    trans: Record<BodyType, number>;
    ranking: BodyType[];
    mainTypes: BodyType[]; // 前两名（✅ 包含平和质）
  } | null>(null);

  /** 工具函数 */
  const scrollTo = (i: number) => {
    const el = document.querySelector<HTMLDivElement>(`#q-${i}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const findFirstUnanswered = () => {
    for (let i = 0; i < flat.length; i++) {
      const q = flat[i];
      if (!answers[q.type]?.[q.idx]) return i;
    }
    return null;
  };

  /** 计算并进入结果页 */
  const handleSubmit = () => {
    const first = findFirstUnanswered();
    if (first !== null) {
      setUnansweredIndex(first);
      scrollTo(first);
      return;
    }
    const { trans, ranking } = compute(answers as any, { sex });
    // ✅ 直接取前两名（包含平和质）
    const mainTypes = ranking.slice(0, 2);
    setResult({ trans, ranking, mainTypes });
    setView("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** ✅ 生成“结果海报 PDF”（确保二维码加载完成再截图） */
  const createPosterPDF = async () => {
    const node = document.getElementById("poster-root");
    if (!node || !result) return;

    // 生成二维码并赋给 <img>
    const qrDataUrl = await QRCode.toDataURL(SITE_URL, { margin: 1, width: 160 });
    const qrImg = document.getElementById("poster-qr") as HTMLImageElement | null;
    if (qrImg) {
      qrImg.removeAttribute("src");
      qrImg.onload = null;
      qrImg.src = qrDataUrl;
    }

    // 等待二维码<img>加载完成/或超时兜底
    await new Promise<void>((resolve) => {
      if (!qrImg) return resolve();
      if (qrImg.complete && qrImg.naturalWidth > 0) return resolve();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      qrImg.onload = finish;
      qrImg.onerror = finish;
      setTimeout(finish, 1200);
    });

    // 截图
    const html2canvas = await ensureHtml2canvas();
    const canvas = await html2canvas(node as HTMLElement, {
      scale: 2,
      backgroundColor: "#ffffff",
    });
    const img = canvas.toDataURL("image/jpeg", 0.95);

    // A4 竖版：595 x 842 pt
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = 595, pageH = 842;
    const imgW = pageW, imgH = (canvas.height / canvas.width) * imgW;
    pdf.addImage(img, "JPEG", 0, 0, imgW, Math.min(imgH, pageH));
    pdf.save("体质自测-结果海报.pdf");
  };

  /** —————— 视图：问卷 —————— */
  if (view === "form") {
    return (
      <div className="min-h-screen" style={{ backgroundImage: THEME.bgGradient, color: THEME.text }}>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-wide">中医体质判断问卷</h1>
            <p className="mt-2 text-sm" style={{ color: THEME.subText }}>
              了解体质，更准确的养生。<b>免责声明：</b>本网站不构成医疗建议，如有疾病请及时就医。
            </p>
          </header>

          {/* 性别 + 进度条 */}
          <div className="mb-6 rounded-2xl p-4 shadow-sm backdrop-blur"
               style={{ background: THEME.cardBg, border: `1px solid ${THEME.border}` }}>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: THEME.subText }}>性别：</span>
                <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: THEME.border }}>
                  {(["female", "male"] as const).map((s) => (
                    <button key={s} onClick={() => setSex(s)}
                      className="px-3 py-1.5 text-sm transition-colors"
                      style={{ background: sex === s ? THEME.primary : "#fff", color: sex === s ? "#fff" : THEME.text }}>
                      {s === "female" ? "女" : "男"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between text-xs mb-1" style={{ color: THEME.subText }}>
                  <span>完成度</span><span>{done}/{total}（{percent}%）</span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                       style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.primary})` }} />
                </div>
              </div>
            </div>
          </div>

          {(total - done) > 0 && (
            <div className="mb-4 text-sm rounded-lg px-3 py-2"
                 style={{ background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" }}>
              还有 <b>{total - done}</b> 题未作答。点击“计算结果”我会带你定位到第一处未答。
            </div>
          )}

          <ol className="space-y-5">
            {flat.map((q, i) => {
              const unanswered = unansweredIndex === i;
              return (
                <li id={`q-${i}`} key={`${q.type}-${q.idx}`}
                    className="rounded-2xl border p-4 shadow-sm"
                    style={{ background: THEME.cardBg, borderColor: unanswered ? THEME.highlight : THEME.border }}>
                  <div className="font-medium mb-3">{i + 1}、{q.text}</div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    {SCALE.map((s) => (
                      <label key={s.v} className="inline-flex items-center gap-2">
                        <input type="radio" name={`q-${q.type}-${q.idx}`} value={s.v}
                          checked={answers[q.type]?.[q.idx] === s.v}
                          onChange={() => {
                            const next = { ...answers };
                            const arr = (next[q.type] ? [...(next[q.type] as (Answer | undefined)[])] : Array(bank[q.type].length).fill(undefined)) as (Answer | undefined)[];
                            arr[q.idx] = s.v as Answer;
                            next[q.type] = arr;
                            setAnswers(next);
                          }} />
                        <span>{s.label}</span>
                      </label>
                    ))}
                  </div>
                  {unanswered && <div className="mt-2 text-xs" style={{ color: "#92400E" }}>这题还没作答，请选择一个选项</div>}
                </li>
              );
            })}
          </ol>

          <div className="sticky bottom-0 inset-x-0 mt-8 backdrop-blur border-t"
               style={{ background: "rgba(255,255,255,0.75)", borderColor: THEME.border }}>
            <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-center gap-3">
              <button onClick={handleSubmit}
                className="px-4 py-2 rounded-xl text-white shadow-sm"
                style={{ background: THEME.primary }}>
                计算结果
              </button>
              <button disabled className="px-4 py-2 rounded-xl border shadow-sm opacity-50 cursor-not-allowed"
                style={{ borderColor: THEME.border, color: THEME.text }}>
                导出 PDF（请先完成答题）
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /** —————— 视图：结果页 —————— */
  const trans = result!.trans;
  const main = result!.mainTypes;   // 前两名（可能包含平和质）
  const ranking = result!.ranking;

  return (
    <div className="min-h-screen" style={{ backgroundImage: THEME.bgGradient, color: THEME.text }}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-semibold tracking-wide">体质判定与养生建议</h1>
          <p className="mt-2 text-sm" style={{ color: THEME.subText }}>
            根据问卷得分计算转化分与判定规则生成结果与建议（仅供健康教育参考，不替代医疗）。
          </p>
        </header>

        {/* 结果概览 */}
        <div className="mb-6 rounded-2xl p-4 shadow-sm"
             style={{ background: THEME.cardBg, border: `1px solid ${THEME.border}` }}>
          <div className="text-lg font-semibold mb-1">主要体质（得分前2名）</div>
          <div className="text-sm">{main.join("、")}</div>
          <div className="mt-3 text-sm" style={{ color: THEME.subText }}>
            其他体质从高到低：{ranking.filter((t) => !main.includes(t)).join("、")}
          </div>
        </div>

        {/* 建议卡片（主两型） */}
        {main.map((t) => (
          <div key={t} className="mb-5 rounded-2xl p-4 shadow-sm"
               style={{ background: THEME.cardBg, border: `1px solid ${THEME.border}` }}>
            <div className="text-lg font-semibold mb-2">{t} · 养生建议</div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">起居</div>
                <ul className="list-disc list-inside mt-1 space-y-1">{ADVICE[t].daily.map((s,i)=><li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <div className="font-medium">饮食</div>
                <ul className="list-disc list-inside mt-1 space-y-1">{ADVICE[t].diet.map((s,i)=><li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <div className="font-medium">运动</div>
                <ul className="list-disc list-inside mt-1 space-y-1">{ADVICE[t].sport.map((s,i)=><li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <div className="font-medium">情志</div>
                <ul className="list-disc list-inside mt-1 space-y-1">{ADVICE[t].mood.map((s,i)=><li key={i}>{s}</li>)}</ul>
              </div>
            </div>
          </div>
        ))}

        {/* 海报：用于导出 PDF（截图区域） */}
        <div id="poster-root" className="mt-6 rounded-2xl p-20 bg-white shadow"
             style={{ border: `1px solid ${THEME.border}` }}>
          <div className="text-center mb-10">
            <div className="text-2xl font-semibold mb-2">体质自测 · 结果海报</div>
            <div className="text-sm" style={{ color: THEME.subText }}>主要体质：{main.join("、")}</div>
          </div>

          <div className="grid grid-cols-2 gap-16">
            {/* 左侧：柱状图 + 建议摘要 */}
            <div>
              <div className="font-medium mb-2">各体质转化分（0~100）</div>
              <div className="space-y-2 mb-6">
                {(Object.keys(trans) as BodyType[])
                  .map((k) => ({ k, v: trans[k] }))
                  .sort((a, b) => b.v - a.v)
                  .map(({ k, v }) => (
                    <div key={k} className="flex items-center gap-3">
                      <div className="w-16 text-right text-sm">{k}</div>
                      <div className="flex-1 h-3 rounded bg-stone-200 overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.max(2, Math.min(100, v))}%`,
                            background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.primary})`,
                          }}
                        />
                      </div>
                      <div className="w-10 text-sm text-right">{v.toFixed(0)}</div>
                    </div>
                  ))}
              </div>

              <div className="font-medium mb-2">建议摘要</div>
              <ul className="text-sm list-disc list-inside space-y-1">
                {main
                  .flatMap((t) =>
                    ADVICE[t].daily.slice(0, 1).concat(ADVICE[t].diet.slice(0, 1))
                  )
                  .map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
              </ul>
            </div>

            {/* 右侧：二维码（不显示网址，仅提示语） */}
            <div className="text-center">
              <img
                id="poster-qr"
                alt="qrcode"
                className="inline-block w-40 h-40 bg-stone-100 object-contain"
              />
              <div className="mt-3 text-sm text-stone-500">扫码查看完整报告</div>
            </div>
          </div>

          <div className="mt-10 text-center text-xs" style={{ color: THEME.subText }}>
            * 本工具仅用于健康教育与体质自测，不构成医疗建议；如有不适或疾病，请及时就医。
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="mt-6 flex flex-wrap items-center gap-3 justify-center">
          <button onClick={() => setView("form")}
            className="px-4 py-2 rounded-xl border shadow-sm"
            style={{ borderColor: THEME.border, color: THEME.text }}>
            返回修改答案
          </button>
          <button onClick={createPosterPDF}
            className="px-4 py-2 rounded-xl text-white shadow-sm"
            style={{ background: THEME.primary }}>
            生成海报 PDF
          </button>
        </div>

        {/* 外部推广链接（小红书） */}
        <div className="mt-10 text-center text-sm" style={{ color: THEME.subText }}>
          想了解更多体质养生内容？<br />
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