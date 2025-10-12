import React, { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { getQuestions, compute, BodyType, Answer } from "./standard";

/** ====== 🌿 可配置东方配色主题 ====== */
const THEME = {
  bgGradient: "linear-gradient(to bottom, #FFF8ED 0%, #F8FAF8 40%, #EDF5F0 100%)", // 米杏→石青→竹青
  primary: "#0F766E",        // 竹青
  primaryHover: "#115E59",
  accent: "#059669",         // 渐变中点
  highlight: "#FCD34D",      // 高亮（未答）
  text: "#1C1917",
  subText: "#57534E",
  cardBg: "rgba(255,255,255,0.92)",
  border: "#E5E7EB",
};

/** 网站地址：优先取环境变量，回退 origin */
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

/** 极简弹窗 */
function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-x-0 top-16 mx-auto max-w-xl rounded-2xl p-6 shadow-2xl"
        style={{ background: THEME.cardBg }}>
        {children}
        <div className="mt-5 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-white"
            style={{ background: THEME.primary }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

/** 加载中文字体（把 NotoSansSC-Regular.ttf 放到 public/fonts/ 下） */
async function loadChineseFont(doc: jsPDF) {
  const res = await fetch("/fonts/NotoSansSC-Regular.ttf");
  if (!res.ok) return; // 若没放字体文件，则跳过（可能会乱码）
  const buf = await res.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  doc.addFileToVFS("NotoSansSC-Regular.ttf", b64);
  doc.addFont("NotoSansSC-Regular.ttf", "NotoSansSC", "normal");
  doc.setFont("NotoSansSC");
}

export default function App() {
  /** 性别 */
  const [sex, setSex] = useState<"male" | "female">("female");

  /** 题库（按性别过滤） */
  const bank = useMemo(() => getQuestions({ sex }), [sex]);

  /** 平铺题库（隐藏体质分组，连续编号） */
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

  /** 答案（性别变更时重置） */
  const [answers, setAnswers] = useState<Answers>({});
  useEffect(() => {
    const init: Answers = {};
    (Object.keys(bank) as BodyType[]).forEach((t) => (init[t] = Array(bank[t].length).fill(undefined)));
    setAnswers(init);
  }, [bank]);

  /** 结果与弹窗 */
  const [resultView, setResultView] = useState<{
    trans: Record<BodyType, number>;
    ranking: BodyType[];
    result: { 平和质?: "平和质" | "基本是平和质"; 倾向?: BodyType[]; 体质?: BodyType[] };
  } | null>(null);
  const [openResult, setOpenResult] = useState(false);

  /** 进度与未答定位 */
  const [unansweredIndex, setUnansweredIndex] = useState<number | null>(null);
  const total = flat.length;
  const done = flat.filter((q) => answers[q.type]?.[q.idx]).length;
  const percent = Math.round((done / Math.max(1, total)) * 100);

  /** 回到顶部按钮 */
  const [showTopBtn, setShowTopBtn] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  /** 交互 */
  const handleChange = (t: BodyType, idx: number, v: number) => {
    setAnswers((prev) => {
      const next = { ...prev };
      const arr = (next[t] ? [...(next[t] as (Answer | undefined)[])] : Array(bank[t].length).fill(undefined)) as (Answer | undefined)[];
      arr[idx] = v as Answer;
      next[t] = arr;
      return next;
    });
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
    setOpenResult(true); // 弹窗展示结果
  };

  const exportPdf = async () => {
    const first = findFirstUnanswered();
    if (first !== null) {
      setUnansweredIndex(first);
      scrollTo(first);
      return;
    }
    const { trans, result, ranking } = compute(answers as any, { sex });

    const margin = 36;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    await loadChineseFont(doc); // 加载中文字体，避免乱码

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

    // 右侧二维码 + 站点地址
    const qrDataUrl = await QRCode.toDataURL(SITE_URL, { margin: 1, width: 180 });
    doc.addImage(qrDataUrl, "PNG", 400, margin + 24, 150, 150);
    const u = new URL(SITE_URL);
    doc.text(`${u.host}${u.pathname}`, 400, margin + 186);

    doc.setFontSize(9);
    doc.text(
      "* 本工具仅用于健康教育与体质自测，不构成医疗建议；如有不适或疾病，请尽快就医。",
      margin,
      812,
      { maxWidth: 520 }
    );

    doc.save("体质自测-结果.pdf");
  };

  return (
    <div className="min-h-screen" style={{ backgroundImage: THEME.bgGradient, color: THEME.text }}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* 顶部标题 */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-wide">中医体质判断问卷</h1>
          <p className="mt-2 text-sm" style={{ color: THEME.subText }}>
            了解体质，更准确的养生。<b>免责声明：</b>本网站不构成医疗建议，如有疾病请及时就医。
          </p>
        </header>

        {/* 性别选择 + 进度条 */}
        <div className="mb-6 rounded-2xl p-4 shadow-sm backdrop-blur"
             style={{ background: THEME.cardBg, border: `1px solid ${THEME.border}` }}>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* 性别按钮 */}
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: THEME.subText }}>性别：</span>
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: THEME.border }}>
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
                <span>完成度</span><span>{done}/{total}（{percent}%）</span>
              </div>
              <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                     style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.primary})` }} />
              </div>
            </div>
          </div>
        </div>

        {/* 缺题提醒 */}
        {(total - done) > 0 && (
          <div className="mb-4 text-sm rounded-lg px-3 py-2"
               style={{ background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" }}>
            还有 <b>{total - done}</b> 题未作答。点击“计算结果”我会带你定位到第一处未答。
          </div>
        )}

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
                  borderColor: unanswered ? THEME.highlight : THEME.border,
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
                        onChange={() => setAnswers((prev) => {
                          const next = { ...prev };
                          const arr = (next[q.type] ? [...(next[q.type] as (Answer | undefined)[])] : Array(bank[q.type].length).fill(undefined)) as (Answer | undefined)[];
                          arr[q.idx] = s.v as Answer;
                          next[q.type] = arr;
                          return next;
                        })}
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
                {unanswered && (
                  <div className="mt-2 text-xs" style={{ color: "#92400E" }}>
                    这题还没作答，请选择一个选项
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {/* 底部操作条 */}
        <div className="sticky bottom-0 inset-x-0 mt-8 backdrop-blur border-t"
             style={{ background: "rgba(255,255,255,0.75)", borderColor: THEME.border }}>
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-center gap-3">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-xl text-white shadow-sm"
              style={{ background: THEME.primary }}
            >
              计算结果
            </button>
            <button
              onClick={exportPdf}
              disabled={(total - done) > 0}
              className={`px-4 py-2 rounded-xl border shadow-sm ${ (total - done) > 0 ? "opacity-50 cursor-not-allowed" : "" }`}
              style={{ borderColor: THEME.border, color: THEME.text }}
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
          className="fixed bottom-24 right-6 w-10 h-10 rounded-full shadow-lg text-white text-lg hover:scale-105 transition-transform"
          style={{ background: THEME.primary }}
          title="回到顶部"
        >
          ↑
        </button>
      )}

      {/* 结果弹窗 */}
      <Modal open={openResult && !!resultView} onClose={() => setOpenResult(false)}>
        {resultView && (
          <div className="text-stone-800">
            <div className="text-lg font-semibold mb-3">判定结果</div>
            <div className="space-y-1 text-sm">
              <div><b>主要体质：</b>{resultView.ranking.slice(0, 2).join("、")}</div>
              <div><b>平和质：</b>{resultView.result.平和质 ?? "—"}</div>
              <div><b>偏颇体质：</b>{resultView.result.体质?.length ? resultView.result.体质.join("、") : "—"}</div>
              <div><b>倾向体质：</b>{resultView.result.倾向?.length ? resultView.result.倾向.join("、") : "—"}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}