import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { getQuestions, compute, BodyType, Answer } from "./standard";

/** ====== 🌿 可配置东方配色主题 ====== */
const THEME = {
  bgGradient: "linear-gradient(to bottom, #FFF8ED 0%, #F8FAF8 40%, #EDF5F0 100%)", // 米杏→石青→竹青
  primary: "#0F766E",        // 竹青
  primaryHover: "#115E59",
  accent: "#059669",         // 渐变中点
  highlight: "#F59E0B",      // 高亮（未答）
  text: "#1C1917",
  subText: "#57534E",
  cardBg: "rgba(255,255,255,0.92)",
  border: "#E5E7EB",
};

/** ✅ 好记域名（之后接入自定义域名时改这里，或在 Vercel 设置 VITE_SITE_URL） */
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

/** html2canvas 加载 */
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

  const [unansweredIndex, setUnansweredIndex] = useState<number | null>(null);
  const total = flat.length;
  const done = flat.filter((q) => answers[q.type]?.[q.idx]).length;
  const percent = Math.round((done / Math.max(1, total)) * 100);

  const [result, setResult] = useState<{
    trans: Record<BodyType, number>;
    ranking: BodyType[];
    mainTypes: BodyType[];
  } | null>(null);

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

  const handleSubmit = () => {
    const first = findFirstUnanswered();
    if (first !== null) {
      setUnansweredIndex(first);
      scrollTo(first);
      return;
    }
    const { trans, ranking } = compute(answers as any, { sex });
    const mainTypes = ranking.filter((t) => t !== "平和质").slice(0, 2);
    setResult({ trans, ranking, mainTypes });
    setView("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** ✅ 修复二维码延迟加载问题 */
  const createPosterPDF = async () => {
    const node = document.getElementById("poster-root");
    if (!node || !result) return;

    // 生成二维码
    const qr = await QRCode.toDataURL(SITE_URL, { margin: 1, width: 160 });
    const qrImg = document.getElementById("poster-qr") as HTMLImageElement | null;
    if (qrImg) qrImg.src = qr;

    // 🕐 等待二维码加载成功再截图
    await new Promise<void>((resolve) => {
      if (!qrImg) return resolve();
      if (qrImg.complete) return resolve();
      qrImg.onload = () => resolve();
      setTimeout(() => resolve(), 800); // 最多等800ms兜底
    });

    // 截图
    const html2canvas = await ensureHtml2canvas();
    const canvas = await html2canvas(node as HTMLElement, { scale: 2, backgroundColor: "#ffffff" });
    const img = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = 595, pageH = 842;
    const imgW = pageW, imgH = (canvas.height / canvas.width) * imgW;
    pdf.addImage(img, "JPEG", 0, 0, imgW, Math.min(imgH, pageH));
    pdf.save("体质自测-结果海报.pdf");
  };

  // 问卷页 & 结果页保持不变（略）
  // 👉 请保留你当前的问卷部分与结果页内容（除了 createPosterPDF 部分）

  return <></>;
}