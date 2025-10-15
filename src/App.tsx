import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import { getQuestions, compute, BodyType, Answer } from "./standard";

const SITE_URL = "https://checkyourbodynature.vercel.app";
const REDBOOK_URL = "https://www.xiaohongshu.com/explore";

const THEME = {
  gradient: "linear-gradient(to bottom, #FFF8E0 0%, #F6F3DA 40%, #DFF1E3 100%)",
  text: "#1C1917",
  subText: "#57534E",
  card: "rgba(255,255,255,0.7)",
  shadow: "0 4px 12px rgba(0,0,0,0.1)",
  accent: "#B45309",
};

const SCALE = [
  { v: 1, label: "1 从不/没有" },
  { v: 2, label: "2 偶尔/轻度" },
  { v: 3, label: "3 有时/中度" },
  { v: 4, label: "4 经常/较重" },
  { v: 5, label: "5 总是/严重" },
] as const;

const DESCRIPTION: Record<BodyType, string> = {
  平和质: "整体状态平衡，精神好、睡眠也不错。保持规律作息，是理想体质。",
  气虚质: "容易觉得累，说话没力气，天气变化时也容易感冒。注意休息和睡眠。",
  阳虚质: "怕冷、手脚常冰凉，容易精神不振。多晒太阳、吃热食让你更有活力。",
  阴虚质: "常觉得热、容易口干、睡不踏实。多喝水、别太晚睡，会更舒服。",
  痰湿质: "容易困、身体沉重。饮食清淡、少油腻能让身体更轻盈。",
  湿热质: "脸上易出油或长痘，有时觉得闷热。清淡饮食、多喝水最适合。",
  血瘀质: "脸色略暗或易酸痛。适度活动、伸展能让气血更顺畅。",
  气郁质: "容易紧张焦虑，睡眠也易受影响。多放松、多交流会更舒畅。",
  特禀质: "体质较敏感，易过敏或对环境变化反应大。注意防护、保持作息。",
};

export default function App() {
  const [view, setView] = useState<"form" | "result">("form");
  const [sex, setSex] = useState<"male" | "female">("female");
  const bank = useMemo(() => getQuestions({ sex }), [sex]);
  const flat = useMemo(() => {
    const items: { type: BodyType; idx: number; text: string }[] = [];
    (Object.keys(bank) as BodyType[]).forEach((t) =>
      bank[t].forEach((q, i) =>
        items.push({ type: t, idx: i, text: q.text.replace(/[*＊]/g, "").trim() })
      )
    );
    return items;
  }, [bank]);

  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  useEffect(() => {
    const init: any = {};
    (Object.keys(bank) as BodyType[]).forEach(
      (t) => (init[t] = Array(bank[t].length).fill(0))
    );
    setAnswers(init);
  }, [bank]);

  const total = flat.length;
  const done = flat.filter((q) => answers[q.type]?.[q.idx]).length;
  const percent = Math.round((done / Math.max(1, total)) * 100);

  const [result, setResult] = useState<{
    trans: Record<BodyType, number>;
    ranking: BodyType[];
    mainTypes: BodyType[];
  } | null>(null);

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

  const qrRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (view === "result" && qrRef.current)
      QRCode.toCanvas(qrRef.current, SITE_URL, { width: 160 });
  }, [view]);

  const handleCopyImage = async () => {
    try {
      const node = document.getElementById("result-section");
      if (!node) return;
      const canvas = await html2canvas(node, { scale: 2 });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        alert("结果图片已复制，可直接粘贴发送给朋友！");
      });
    } catch {
      alert("复制失败，请截图分享～");
    }
  };

  if (view === "form") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: THEME.gradient,
          padding: "2rem",
          color: THEME.text,
        }}
      >
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            background: "rgba(255,255,255,0.8)",
            borderRadius: "16px",
            boxShadow: THEME.shadow,
            padding: "2rem",
          }}
        >
          <h1 style={{ textAlign: "center", fontSize: "24px", marginBottom: "1rem" }}>
            中医体质判断问卷
          </h1>
          <p
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: THEME.subText,
              marginBottom: "1rem",
            }}
          >
            了解体质，更准确的养生。本问卷不构成医疗建议，如有疾病请就医。
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              性别：
              {(["female", "male"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  style={{
                    marginLeft: "6px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    background: sex === s ? THEME.accent : "#fff",
                    color: sex === s ? "#fff" : THEME.text,
                  }}
                >
                  {s === "female" ? "女" : "男"}
                </button>
              ))}
            </div>
            <div style={{ width: "200px" }}>
              <div
                style={{
                  height: "6px",
                  background: "#eee",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${percent}%`,
                    background: "linear-gradient(90deg,#FBBF24,#B45309)",
                  }}
                />
              </div>
              <p style={{ fontSize: "12px", textAlign: "right", color: THEME.subText }}>
                {done}/{total}
              </p>
            </div>
          </div>

          <ol style={{ listStyle: "none", padding: 0 }}>
            {flat.map((q, i) => (
              <li
                key={i}
                id={`q-${i}`}
                style={{
                  background: THEME.card,
                  boxShadow: THEME.shadow,
                  borderRadius: "12px",
                  padding: "1rem",
                  marginBottom: "0.8rem",
                }}
              >
                <div style={{ marginBottom: "0.5rem" }}>
                  {i + 1}. {q.text}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
                  {SCALE.map((s) => (
                    <label key={s.v} style={{ fontSize: "13px" }}>
                      <input
                        type="radio"
                        name={`${q.type}-${i}`}
                        checked={answers[q.type]?.[q.idx] === s.v}
                        onChange={() =>
                          setAnswers((p) => ({
                            ...p,
                            [q.type]: p[q.type].map((x, j) =>
                              j === q.idx ? s.v : x
                            ),
                          }))
                        }
                      />{" "}
                      {s.label}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>

          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <button
              onClick={handleSubmit}
              style={{
                padding: "0.6rem 1.4rem",
                borderRadius: "8px",
                background: "linear-gradient(90deg,#FBBF24,#B45309)",
                color: "#fff",
                border: "none",
              }}
            >
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
    <div
      id="result-section"
      style={{
        minHeight: "100vh",
        background: THEME.gradient,
        padding: "2rem",
        color: THEME.text,
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "rgba(255,255,255,0.8)",
          borderRadius: "16px",
          boxShadow: THEME.shadow,
          padding: "2rem",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "1.2rem", fontSize: "22px" }}>
          体质自测 · 结果报告
        </h2>

        {/* 体质卡 */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          {mainTypes.map((t) => (
            <div
              key={t}
              style={{
                flex: 1,
                background: THEME.card,
                boxShadow: THEME.shadow,
                borderRadius: "16px",
                padding: "1rem",
              }}
            >
              <strong style={{ color: THEME.accent }}>{t}</strong>
              <p style={{ fontSize: "14px", marginTop: "0.4rem" }}>{DESCRIPTION[t]}</p>
            </div>
          ))}
        </div>

        {/* 柱状图 */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <div style={{ width: "80%", maxWidth: "500px" }}>
            {(Object.entries(trans) as [BodyType, number][]).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", marginBottom: "0.3rem" }}>
                <div style={{ width: "5em" }}>{k}</div>
                <div style={{ flex: 1, height: "6px", background: "#eee", borderRadius: "3px" }}>
                  <div
                    style={{
                      width: `${v}%`,
                      height: "100%",
                      background: "linear-gradient(90deg,#FBBF24,#B45309)",
                      borderRadius: "3px",
                    }}
                  />
                </div>
                <div style={{ width: "2rem", textAlign: "right", fontSize: "13px" }}>
                  {v.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 建议摘要 */}
        <div
          style={{
            background: THEME.card,
            boxShadow: THEME.shadow,
            borderRadius: "16px",
            padding: "1rem",
            textAlign: "left",
            maxWidth: "600px",
            margin: "0 auto 1.5rem",
          }}
        >
          <strong style={{ color: THEME.accent }}>🌞 建议摘要</strong>
          <ul style={{ fontSize: "14px", marginTop: "0.5rem", lineHeight: 1.6 }}>
            <li>作息规律，四季随时令，不熬夜。</li>
            <li>饮食清淡均衡，少油腻辛辣。</li>
            <li>早睡早起，避免久坐久劳。</li>
          </ul>
        </div>

        {/* 二维码 */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <canvas ref={qrRef} />
          <p style={{ fontSize: "13px", marginTop: "0.5rem" }}>扫码进入体质测试</p>
          <a
            href={REDBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "13px", color: "#92400E", textDecoration: "underline" }}
          >
            想了解更多养生知识？在小红书搜索「王咩咩在新加坡」
          </a>
        </div>

        {/* disclaimer */}
        <p style={{ textAlign: "center", fontSize: "12px", color: "#666", marginBottom: "1rem" }}>
          * 本工具仅用于健康教育与体质自测，不构成医疗建议；如有不适或疾病，请及时就医。
        </p>

        {/* 按钮 */}
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
          <button
            onClick={() => setView("form")}
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "0.5rem 1.2rem",
              cursor: "pointer",
            }}
          >
            返回修改答案
          </button>
          <button
            onClick={handleCopyImage}
            style={{
              background: "linear-gradient(90deg,#FBBF24,#B45309)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.5rem 1.2rem",
              cursor: "pointer",
            }}
          >
            复制图片分享给朋友
          </button>
        </div>
      </div>
    </div>
  );
}