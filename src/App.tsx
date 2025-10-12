import React, { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { getQuestions, compute, BodyType, Answer } from "./standard";

/** ========== 🌿 东方配色主题，可修改此处来整体换风格 ========== */
const THEME = {
  bgGradient:
    "linear-gradient(to bottom, #FFF8ED 0%, #F8FAF8 40%, #EDF5F0 100%)", // 背景渐变：米杏→石青→竹青
  primary: "#0F766E", // 主色：竹青
  primaryHover: "#115E59", // 主色 hover
  accent: "#059669", // 渐变中点色
  highlight: "#FCD34D", // 高亮色（未答提示）
  text: "#1C1917", // 正文主色
  subText: "#57534E", // 副文本
  cardBg: "rgba(255,255,255,0.9)", // 卡片背景
};

/** 网站地址 */
const SITE_URL =
  (import.meta as any)?.env?.VITE_SITE_URL ||
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

export default function App() {
  const [sex, setSex] = useState<"male" | "female">("female");
  const bank = useMemo(() => getQuestions({ sex }), [sex]);

  /** 平铺题库 */
  const flat = useMemo(() => {
    const items: { type: BodyType; idx: number; text: string }[] = [];
    (Object.keys(bank) as BodyType[]).forEach((t) => {
      bank[t].forEach((q, i) => {
        const clean = q.text.replace(/[*＊]/g, "").trim();
        items.push({ type: t, idx: i, text: clean });
      });
    });
    return items;
  }, [bank]);

  /** 答案 */
  const [answers, setAnswers] = useState<Answers>({});
  useEffect(() => {
    const init: Answers = {};
    (Object.keys(bank) as BodyType[]).forEach((t) => {
      init[t] = Array(bank[t].length).fill(undefined);
    });
    setAnswers(init);
  }, [bank]);

  const [resultView, setResultView] = useState<{
    trans: Record<BodyType, number>;
    ranking: BodyType[];
    result: { 平和质?: "平和质" | "基本是平和质"; 倾向?: BodyType[]; 体质?: BodyType[] };
  } | null>(null);

  const updatingPdf = useRef(false);
  const [unansweredIndex, setUnansweredIndex] = useState<number | null>(null);
  const [showTopBtn, setShowTopBtn] = useState(false);

  const handleChange = (t: BodyType, idx: number, v: number) => {
    setAnswers((prev) => {
      const next = { ...prev };
      const arr = (next[t] ? [...(next[t] as (Answer | undefined)[])] : Array(bank[t].length).fill(undefined)) as (Answer | undefined)[];
      arr[idx] = v as Answer;
      next[t] = arr;
      return next;
    });
  };

  /** 滚动监听：控制回到顶部按钮显示 */
  useEffect(() => {
    const onScroll = () => {
      setShowTopBtn(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** 进度 */
  const total = flat.length;
  const done = flat.filter((q) => answers[q.type]?.[q.idx]).length;
  const percent = Math.round((done / Math.max(1, total)) * 100);

  const findFirstUnanswered = () => {
    for (let i = 0; i < flat.length; i++) {
      const q = flat[i];
      if (!answers[q.type]?.[q.idx]) return i;
    }
    return null;
  };

  const scrollTo = (i: number) => {
    const el = document.querySelector<HTMLDivElement>(`#q-${i}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSubmit = () => {
    const first = findFirstUnanswered();
    if (first !== null) {
      setUnansweredIndex(first);
      scrollTo(first);
      return;
    }
    const { trans, result, ranking } = compute(answers as any, { sex });
    setResultView({ trans, result, ranking });
    setUnansweredIndex(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const exportPdf = async () => {
    const first = findFirstUnanswered();
    if (first !== null) {
      setUnansweredIndex(first);
      scrollTo(first);
      return;
    }
    if (updatingPdf.current) return;
    updatingPdf.current = true;
    try {
      const { trans, result, ranking } = compute(answers as any, { sex });

      const margin = 36;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFontSize(18);
      doc.text("中医体质判断问卷 · 结果", margin, margin);
      doc.setFontSize(12);
      doc.text(`主要体质：${ranking.slice(0, 2).join("、")}`, margin, margin + 26);
      doc.setFontSize(11);
      let y = margin + 50;
      doc.text("各体质转化分（0~100）：", margin, y);
      y += 18;
      (Object.keys(trans) as BodyType[]).forEach((k) => {
        doc.text(`${k}：${trans[k].toFixed(1)}`, margin + 12, y);
        y += 16;
      });
      y += 8;
      const tags: string[] = [];
      if (result.平和质) tags.push(result.平和质);
      if (result.体质?.length) tags.push(...result.体质);
      if (result.倾向?.length) tags.push(...result.倾向.map((t) => `${t}（倾向）`));
      doc.text(`判定：${tags.length ? tags.join("，") : "暂无（答案不足或均低于阈值）"}`, margin, y);
      const qrDataUrl = await QRCode.toDataURL(SITE_URL, { margin: 1, width: 180 });
      doc.addImage(qrDataUrl, "PNG", 400, margin + 24, 150, 150);
      const u = new URL(SITE_URL);
      doc.text(`${u.host}${u.pathname}`, 400, margin + 186);
      doc.save("体质自测-结果.pdf");
    } catch (e) {
      console.error(e);
      alert("导出失败，请稍后重试。");
    } finally {
      updatingPdf.current = false;
    }
  };

  return (
    <div
      className="min-h-screen transition-colors"
      style={{ backgroundImage: THEME.bgGradient, color: THEME.text }}
    >
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* 顶部标题 */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-wide" style={{ color: THEME.text }}>
            中医体质判断问卷
          </h1>
          <p className="mt-2 text-sm" style={{ color: THEME.subText }}>
            了解体质，更准确的养生。<b>免责声明：</b>本网站不构成医疗建议，如有疾病请及时就医。
          </p>
        </header>

        {/* 性别选择 + 进度条 */}
        <div
          className="mb-8 rounded-2xl border shadow-sm p-4 backdrop-blur"
          style={{ background: THEME.cardBg, borderColor: "#E5E7EB" }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* 性别按钮 */}
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: THEME.subText }}>
                性别：
              </span>
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "#D1D5DB" }}>
                {(["female", "male"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSex(s)}
                    className="px-3 py-1.5 text-sm transition-colors"
                    style={{
                      background: sex === s ? THEME.primary : "#fff",
                      color: sex === s ? "#fff" : THEME.text,
                    }}
                  >
                    {s === "female" ? "女" : "男"}
                  </button>
                ))}
              </div>
            </div>
            {/* 进度条 */}
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between text-xs mb-1" style={{ color: THEME.subText }}>
                <span>完成度</span>
                <span>
                  {done}/{total}（{percent}%）
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${percent}%`,
                    background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.primary})`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 题目 */}
        <ol className="space-y-5">
          {flat.map((q, i) => {
            const unanswered = unansweredIndex === i;
            return (
              <li
                id={`q-${i}`}
                key={`${q.type}-${q.idx}`}
                className="rounded-2xl border p-4 shadow-sm"
                style={{
                  background: THEME.cardBg,
                  borderColor: unanswered ? THEME.highlight : "#E5E7EB",
                }}
              >
                <div className="font-medium mb-3">{i + 1}、{q.text}</div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {SCALE.map((s) => (
                    <label key={s.v} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`q-${q.type}-${q.idx}`}
                        value={s.v}
                        checked={answers[q.type]?.[q.idx] === s.v}
                        onChange={() => handleChange(q.type, q.idx, s.v)}
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
                {unanswered && (
                  <div className="mt-2 text-xs text-amber-700">
                    这题还没作答，请选择一个选项
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {/* 按钮区域 */}
        <div className="sticky bottom-0 inset-x-0 mt-8 bg-white/70 backdrop-blur border-t">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-center gap-3">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-xl shadow-sm text-white"
              style={{ background: THEME.primary }}
            >
              计算结果
            </button>
            <button
              onClick={exportPdf}
              className="px-4 py-2 rounded-xl border shadow-sm"
              style={{ borderColor: "#D1D5DB", color: THEME.text }}
            >
              导出 PDF
            </button>
          </div>
        </div>
      </div>

      {/* 回到顶部按钮 */}
      {showTopBtn && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-6 w-10 h-10 rounded-full shadow-lg text-white text-lg transition-opacity hover:scale-105"
          style={{
            background: THEME.primary,
          }}
          title="回到顶部"
        >
          ↑
        </button>
      )}
    </div>
  );
}