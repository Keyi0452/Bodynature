// src/standard.ts
// 权威体质题库（66题）+ 标准判定算法（与教材示例一致）
// 支持性别互斥题（湿热质：男/女二选一）与缺题自适应（按实际作答题数换算转化分）
// 预留 compact-60 精简模式占位（后续按你的专有清单开启）

export type BodyType =
  | "平和质" | "气虚质" | "阳虚质" | "阴虚质"
  | "痰湿质" | "湿热质" | "血瘀质" | "气郁质" | "特禀质";

export type Answer = 1 | 2 | 3 | 4 | 5;

export type Sex = "male" | "female";

export interface QuestionItem {
  text: string;
  sex?: Sex; // 仅当该题是性别限定时标注（湿热质）
}

export type QuestionBank = Record<BodyType, QuestionItem[]>;

export interface ComputeOptions {
  sex?: Sex;                 // 用于选择湿热质的互斥题
  mode?: "standard-66" | "compact-60"; // 预留：若需精简 60 题，切到 compact-60
}

/** —— 题库（权威 66 题）——
 * 说明：
 * 1) 湿热质共6题，其中最后一题为性别互斥：female「带下色黄」、male「阴囊潮湿」；
 * 2) 其余体质题数：平和8, 气虚8, 阳虚7, 阴虚8, 痰湿8, 血瘀7, 气郁7, 特禀7；
 */
export const Q66: QuestionBank = {
  平和质: [
    { text: "您精力充沛吗？" },
    { text: "您容易疲乏吗？*" },
    { text: "您说话声音无力吗？*" },
    { text: "您感到闷闷不乐吗？*" },
    { text: "您比一般人耐受不了寒冷（冬天寒冷、夏天空调、电扇）吗？*" },
    { text: "您能适应外界自然和社会环境的变化吗？" },
    { text: "您容易失眠吗？*" },
    { text: "您容易忘事（健忘）吗？*" },
  ],
  气虚质: [
    { text: "您容易疲乏吗？" },
    { text: "您容易气短（呼吸短促、接不上气）吗？" },
    { text: "您容易心慌吗？" },
    { text: "您容易头晕或站起时眩晕吗？" },
    { text: "您比别人容易患感冒吗？" },
    { text: "您喜欢安静、懒得说话吗？" },
    { text: "您说话声音无力吗？" },
    { text: "您活动量稍大就容易出虚汗吗？" },
  ],
  阳虚质: [
    { text: "您手脚发凉吗？" },
    { text: "您胃脘部、背部或腰膝部怕冷吗？" },
    { text: "您感到怕冷，衣服比别人穿得多吗？" },
    { text: "您比一般人不耐寒冷（冬季寒冷、夏天空调/电扇）吗？" },
    { text: "您比别人容易患感冒吗？" },
    { text: "您吃（喝）凉的东西会感到不舒服或害怕吃（喝）凉东西吗？" },
    { text: "您受凉或吃（喝）凉的东西后，容易腹泻（拉肚子）吗？" },
  ],
  阴虚质: [
    { text: "您感到手脚心发热吗？" },
    { text: "您感觉身体、脸上发热吗？" },
    { text: "您皮肤或口唇干吗？" },
    { text: "您口唇的颜色比一般人红吗？" },
    { text: "您容易便秘或大便干燥吗？" },
    { text: "您面部两颧潮红或偏红吗？" },
    { text: "您感到眼睛干涩吗？" },
    { text: "您活动量稍大就容易出虚汗吗？" },
  ],
  痰湿质: [
    { text: "您感到胸闷或腹部胀满吗？" },
    { text: "您感到身体沉重不轻松或不爽快吗？" },
    { text: "您腹部肥满松软吗？" },
    { text: "您额部油脂分泌多吗？" },
    { text: "您眼睑比别人肿（轻微隆起）吗？" },
    { text: "您嘴里有黏腻感吗？" },
    { text: "您平时痰多，特别是咽喉部总感到有痰堵着吗？" },
    { text: "您舌苔厚腻或舌苔发厚吗？" },
  ],
  湿热质: [
    { text: "您面部或鼻部有油腻感或油亮发光吗？" },
    { text: "您容易生痤疮或疮疖吗？" },
    { text: "您感到口苦或口中有异味吗？" },
    { text: "您大便黏滞不爽，有解不尽的感觉吗？" },
    { text: "您小便时尿道发热感、尿色深（浓）吗？" },
    // 性别互斥：女性/男性二选一
    { text: "您带下色黄（限女性）吗？", sex: "female" },
    { text: "您的阴囊部位潮湿（限男性）吗？", sex: "male" },
  ],
  血瘀质: [
    { text: "您的皮肤在不知不觉中会出现青紫瘀斑（皮下出血）吗？" },
    { text: "您两颧部有细微红丝吗？" },
    { text: "您身体上有哪里疼痛吗？" },
    { text: "您面色晦暗或容易出现褐斑吗？" },
    { text: "您容易有黑眼圈吗？" },
    { text: "您容易忘事（健忘）吗？" },
    { text: "您口唇颜色偏暗吗？" },
  ],
  气郁质: [
    { text: "您感到闷闷不乐吗？" },
    { text: "您容易精神紧张、焦虑不安吗？" },
    { text: "您多愁善感、感情脆弱吗？" },
    { text: "您容易受到惊吓吗？" },
    { text: "您肋胁部或乳房胀痛吗？" },
    { text: "您无缘无故叹气吗？" },
    { text: "您咽喉部有异物感，且吐之不出、咽之不下吗？" },
  ],
  特禀质: [
    { text: "您没有感冒时也会打喷嚏吗？" },
    { text: "您没有感冒时也会鼻塞、流鼻涕吗？" },
    { text: "您因季节变化、温度变化或异味而咳嗽或喘息吗？" },
    { text: "您容易过敏（对药物、食物、气味、花粉或在季节/气候变化时）吗？" },
    { text: "您的皮肤容易起荨麻疹（风团、风疹块、风疙瘩）吗？" },
    { text: "您因皮肤敏感出现紫癜（紫红色淤点、瘀斑）吗？" },
    { text: "您的皮肤一抓就红，并出现抓痕吗？" },
  ],
};

/** 获取实际应作答的题目（按性别筛湿热质的互斥题；为将来 60题精简预留钩子） */
export function getQuestions(opts: ComputeOptions = {}): QuestionBank {
  const sex: Sex = opts.sex ?? "female";
  const bank: QuestionBank = {} as any;

  const filterBySex = (arr: QuestionItem[]) =>
    arr.filter((q) => !q.sex || q.sex === sex);

  (Object.keys(Q66) as BodyType[]).forEach((t) => {
    let list = filterBySex(Q66[t]);
    if (opts.mode === "compact-60") {
      // TODO: 等你给“精简6题清单”后，在这里剔除对应题目
      list = list.slice(); // 先不删，保持与标准一致
    }
    bank[t] = list;
  });
  return bank;
}

/** 计算“转化分”：(原始分-题数)/(题数*4) * 100（教材标准公式） */
export function transformedScore(rawSum: number, answeredCount: number): number {
  if (!answeredCount) return 0;
  const v = ((rawSum - answeredCount) / (answeredCount * 4)) * 100;
  return Math.max(0, Math.min(100, Number(v.toFixed(2))));
}

/** 主计算：给定答案，产出各体质转化分与判定 */
export function compute(
  answers: Partial<Record<BodyType, Answer[]>>,
  opts: ComputeOptions = {}
) {
  const bank = getQuestions(opts);
  const sums: Record<BodyType, number> = {} as any;
  const counts: Record<BodyType, number> = {} as any;
  const trans: Record<BodyType, number> = {} as any;

  (Object.keys(bank) as BodyType[]).forEach((t) => {
    const qs = bank[t];
    const ans = (answers[t] ?? []).slice(0, qs.length);
    // 未答按0记，不参与 rawSum；转化分用“实际已答题数”换算
    const raw = ans.reduce((acc, x) => acc + (x || 0), 0);
    const answered = ans.filter(Boolean).length || qs.length; // 若全未作答，按题目总数计算
    sums[t] = raw;
    counts[t] = answered;
    trans[t] = transformedScore(raw, answered);
  });

  // 判定逻辑（教材规则）
  const others = (k: BodyType) => (Object.keys(trans) as BodyType[]).filter((x) => x !== k);
  let result: { 平和质?: "平和质" | "基本是平和质"; 倾向?: BodyType[]; 体质?: BodyType[] } = {};

  // 平和质
  if (trans["平和质"] >= 60) {
    const allBelow40 = others("平和质").every((k) => trans[k] < 40);
    const allBelow30 = others("平和质").every((k) => trans[k] < 30);
    if (allBelow30) result["平和质"] = "平和质";
    else if (allBelow40) result["平和质"] = "基本是平和质";
  }

  // 八偏颇体质
  const certain: BodyType[] = [];
  const tend: BodyType[] = [];
  (["气虚质","阳虚质","阴虚质","痰湿质","湿热质","血瘀质","气郁质","特禀质"] as BodyType[])
    .forEach((t) => {
      if (trans[t] >= 40) certain.push(t);
      else if (trans[t] >= 30) tend.push(t);
    });

  if (certain.length) result["体质"] = certain;
  if (tend.length) result["倾向"] = tend;

  // 排名
  const ranking = (Object.keys(trans) as BodyType[]).sort((a,b)=>trans[b]-trans[a]);

  return { bank, sums, counts, trans, result, ranking };
}
