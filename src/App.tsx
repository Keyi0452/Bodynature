import React, { useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";

const SITE_URL = "https://tizhi-demo.vercel.app";

const Q = {
  平和质: ["您精力充沛吗？","您容易疲乏吗？*","您说话声音无力吗？*","您感到闷闷不乐吗？*","您比一般人耐受不了寒冷（冬天寒冷、夏天空调、电扇）吗？*","您能适应外界自然和社会环境的变化吗？","您容易失眠吗？*","您容易忘事（健忘）吗？*"],
  阳虚质: ["您手脚发凉吗？","您胃脘部、背部或腰膝部怕冷吗？","您感到怕冷，衣服比别人穿得多吗？","您比一般人不耐寒冷（冬天的寒冷、夏天的空调、电扇等）吗？","您比别人容易患感冒吗？","您吃(喝)凉的东西会感到不舒服或者害怕吃(喝)凉东西吗？","您受凉或吃(喝)凉的东西后，容易腹泻(拉肚子)吗？"],
  阴虚质: ["您感到手脚心发热吗？","您感觉身体、脸上发热吗？","您皮肤或口唇干吗？","您口唇的颜色比一般人红吗？","您容易便秘或大便干燥吗？","您面部两颧潮红或偏红吗？","您感到眼睛干涩吗？","您活动量稍大就容易出虚汗吗？"],
  气虚质: ["您容易疲乏吗？","您容易气短（呼吸短促、接不上气）吗？","您容易心慌吗？","您容易头晕或站起时眩晕吗？","您比别人容易患感冒吗？","您喜欢安静、懒得说话吗？","您说话声音无力吗？","您活动量稍大就容易出虚汗吗？"],
  痰湿质: ["您感到胸闷或腹部胀满吗？","您感到身体沉重不轻松或不爽快吗？","您腹部肥满松软吗？","您额部油脂分泌多吗？","您眼睑比别人肿(轻微隆起)吗？","您嘴里有黏腻感吗？","您平时痰多，特别是咽喉部总感到有痰堵着吗？","您舌苔厚腻或舌苔发厚吗？"],
  湿热质: ["您面部或鼻部有油腻感或油亮发光吗？","您容易生痤疮或疮疖吗？","您感到口苦或口中有异味吗？","您大便黏滞不爽，有解不尽的感觉吗？","您小便时尿道发热感、尿色深(浓)吗？","您带下色黄（限女性）吗？","您的阴囊部位潮湿（限男性）吗？"],
  血瘀质: ["您的皮肤在不知不觉中会出现青紫瘀斑(皮下出血)吗？","您两颧部有细微红丝吗？","您身体上有哪里疼痛吗？","您面色晦暗或容易出现褐斑吗？","您容易有黑眼圈吗？","您容易忘事(健忘)吗？","您口唇颜色偏暗吗？"],
  气郁质: ["您感到闷闷不乐吗？","您容易精神紧张、焦虑不安吗？","您多愁善感、感情脆弱吗？","您容易受到惊吓吗？","您肋胁部或乳房胀痛吗？","您无缘无故叹气吗？","您咽喉部有异物感，且吐之不出、咽之不下吗？"],
  特禀质: ["您没有感冒时也会打喷嚏吗？","您没有感冒时也会鼻塞、流鼻涕吗？","您因季节变化、温度变化或异味而咳嗽或喘息吗？","您容易过敏（对药物、食物、气味、花粉或在季节/气候变化时）吗？","您的皮肤容易起荨麻疹（风团、风疹块、风疙瘩）吗？","您因皮肤敏感出现紫癜(紫红色淤点、瘀斑)吗？","您的皮肤一抓就红，并出现抓痕吗？"],
} as const;

type BodyType = keyof typeof Q;

const Advice: Record<BodyType, { daily: string[]; mood: string[]; sports: { title: string; desc: string }[]; teas: { title: string; desc: string }[]; }> = {
  平和质: { daily:["作息规律：早睡早起，三餐定时，避免过度熬夜与暴饮暴食。","四季随时令：春少酸增甘，夏清淡补水，秋润燥，冬适度温补。","保持适度运动与社交，情绪平稳即可。"], mood:["维持情绪稳定，不必过度进补或过度清养。","保持兴趣爱好与社交互动，避免长期久坐。","有压力时用呼吸放松法：4-4-6-2 节律 3 分钟。"], sports:[{title:"快走/慢跑 30~40min",desc:"每周3~5次，舒适心率区间(110~140)。增强心肺，维持体重。"}, {title:"八段锦/太极",desc:"每天10~20分钟，调和气血、身心放松，提升柔韧和专注。"}, {title:"全身力量训练",desc:"每周2~3次，深蹲/推/拉基础动作，促进代谢与骨骼肌健康。"}], teas:[{title:"淡茶/麦冬菊花茶",desc:"麦冬5g+菊花3g，80℃热水冲泡，清心润燥，适合常规保养。"}, {title:"红枣桂圆茶",desc:"红枣3枚+桂圆肉3~5粒，沸水焖泡10分钟，益气养血、缓解疲劳。"}, {title:"陈皮普洱",desc:"陈皮1片+熟普3g，温胃和中、化滞。饭后少量为宜。"}] },
  气虚质: { daily:["早睡早起，午后适度小憩 10~20 分钟，避免久坐与透支。","三餐温热、规律，少生冷，多用粥汤类(如山药粥、莲子粥)。","注意防风避寒，空调直吹要避开。"], mood:["循序渐进设定目标，避免与人硬拼，减少内耗。","练习温和腹式呼吸，提升呼吸效率与专注感。","学会求助与分工，减少“事事亲为”的疲惫感。"], sports:[{title:"低强度耐力步行",desc:"每天20~40分钟，能说话不气喘为度，逐步增加。"}, {title:"呼吸肌训练",desc:"缩唇呼吸/腹式呼吸各5分钟，早晚各一组，改善气短。"}, {title:"轻量力量训练",desc:"弹力带或自体重，每周2次，每次15~20分钟，重在坚持。"}], teas:[{title:"党参黄芪红枣茶",desc:"党参5g+黄芪8g+红枣3枚，小火煮15分钟，益气健脾。"}, {title:"山药薏米饮",desc:"山药10g+薏米15g 同煮20分钟，健脾渗湿、缓解乏力。"}, {title:"陈皮生姜红糖茶",desc:"陈皮1片+姜3片+红糖少量，温中理气，适合受凉后乏力。"}] },
  阳虚质: { daily:["注意保暖，腹背、足部重点保护；少久坐寒地、少吹空调直风。","饮食以温热为主，避免生冷寒凉；早晨可温粥暖胃。","沐浴后尽快擦干吹干头发，睡前热水泡脚10~15分钟。"], mood:["避免过度消耗与熬夜，给自己留“回气”时间。","用热感放松：热敷腰腹或艾灸神阙/关元(专业人士指导)。","学会“保温式社交”，不过量应酬。"], sports:[{title:"热身充足的快走",desc:"先热身10分钟，体表微汗为度，每周3~5次。"}, {title:"八段锦/易筋经",desc:"温阳行气、舒筋活络，早晚各10~15分钟。"}, {title:"核心与下肢力量",desc:"臀桥、深蹲、鸟狗式，每周2次，改善畏寒与疲乏。"}], teas:[{title:"姜枣茶",desc:"生姜3~5片+红枣3枚，焖泡10分钟，温中散寒、缓手足冷。"}, {title:"桂皮陈皮茶",desc:"桂皮1小段+陈皮1片，沸水冲泡5~8分钟，温阳理气。"}, {title:"黄芪党参煲水",desc:"黄芪10g+党参5g 小火煮15分钟，益气固表；外感期暂停。"}] },
  阴虚质: { daily:["避免过度熬夜、辛辣煎炸与过度出汗，适度午休。","饮食以滋阴润燥为主：银耳、百合、麦冬、沙参、梨。","环境加湿，久用电脑者注意眼部休息“20-20-20”。"], mood:["节奏放慢，给自己留“空档时间”，减少干耗。","用冥想或身体扫描法，每晚5~10分钟，助眠与降火。","傍晚轻运动，避免深夜高强度训练。"], sports:[{title:"瑜伽/伸展",desc:"温和流瑜伽或阴瑜伽20~30分钟，舒展筋膜、安神。"}, {title:"轻松骑行/游泳",desc:"每周2~3次，心率不过分上冲，重在均匀呼吸。"}, {title:"呼吸与冥想",desc:"4-7-8 呼吸或静坐冥想5~10分钟，改善心烦口干、入睡难。"}], teas:[{title:"沙参麦冬玉竹茶",desc:"各5g，沸水焖泡15分钟，滋阴润燥、生津。咽干者宜。"}, {title:"百合莲子银耳羹",desc:"百合10g+莲子10g+银耳3g 小火煮20分钟，晚间少量。"}, {title:"菊花枸杞茶",desc:"菊花3g+枸杞5g，80℃水冲泡，清肝明目、缓眼干。"}] },
  痰湿质: { daily:["少油腻甜食与夜宵，晚餐七分饱；增加蔬果与高纤。","规律作息、久坐每50分钟起身活动5分钟。","家中除湿通风，洗浴后充分擦干，减少潮闷。"], mood:["以“清单+拆分任务”降低拖延与沉重感。","晨间阳光散步10分钟，提升代谢节律与精神清爽度。","少熬夜，避免情绪性进食。"], sports:[{title:"快走+上楼梯",desc:"日均6000~9000步，楼梯代替电梯，促进水湿代谢。"}, {title:"间歇有氧",desc:"1:1 走/跑或单车间歇15~20分钟，每周2~3次。"}, {title:"力量训练+核心",desc:"每周2~3次，复合动作提高基础代谢。"}], teas:[{title:"陈皮茯苓薏米水",desc:"陈皮2g+茯苓8g+薏米15g 同煮20分钟，健脾利湿化痰。"}, {title:"山楂决明子茶",desc:"山楂6g+决明子6g，沸水焖泡10分钟，化食解腻、润肠。"}, {title:"生姜普洱",desc:"熟普3g+姜2片，饭后少量，有助化湿和中。"}] },
  湿热质: { daily:["饮食清淡少辛辣煎炸，减少酒精与高糖；晚餐不过量。","作息规律，避免熬夜，留汗及时擦干、勤换衣物。","多饮温水与淡茶，保持畅便。"], mood:["用“写下来-丢掉法”疏泄情绪，避免憋火。","傍晚舒缓运动+温水淋浴，帮助安睡与退虚热。","减少竞争性深夜游戏与社交刺激。"], sports:[{title:"中等强度有氧",desc:"骑行/慢跑30分钟，出微汗即可，避免暴汗后受凉。"}, {title:"清爽伸展",desc:"肩颈、髋屈肌和胸背部伸展10~15分钟，助气机通畅。"}, {title:"体重控制力量",desc:"自体重力量每周2次，避免过热的密闭环境训练。"}], teas:[{title:"金银花菊薄荷茶",desc:"金银花3g+菊花3g+薄荷1g，80℃水冲泡，清热利咽(饭后饮)。"}, {title:"荷叶薏米冬瓜皮水",desc:"荷叶3g+薏米15g+冬瓜皮10g 同煮15分钟，利湿清暑。"}, {title:"蒲公英茯苓茶",desc:"蒲公英6g+茯苓6g，焖泡10分钟，清热利湿；脾虚者酌量。"}] },
  血瘀质: { daily:["规律运动，久坐每30~40分钟起身活动。","饮食少油腻与烟酒，增加紫色/深色蔬果(花青素)。","睡前热水泡脚与温热淋浴，改善末梢循环。"], mood:["练习躯体觉察与温和拉伸，缓解体表紧张与疼痛敏感。","用“快走+音乐”法改善郁滞，心情不佳先动起来5分钟。","维持规律排便与作息，减少血瘀内生因素。"], sports:[{title:"快走/慢跑",desc:"每周150分钟中等强度，促进周围血液循环。"}, {title:"泡沫轴放松",desc:"小腿/股四头/臀肌/背部各1~2分钟，改善肌筋膜粘连。"}, {title:"力量+拉伸",desc:"力量训练后做静态拉伸5~10分钟，动静结合通络。"}], teas:[{title:"玫瑰山楂红茶",desc:"玫瑰3朵+山楂6g+红茶3g，活血行气、助消化。月经量多者慎。"}, {title:"川芎红枣茶(轻量)",desc:"川芎1g+红枣2枚，焖泡10分钟，活血祛瘀、缓头痛(不宜长期)。"}, {title:"黑豆桂圆饮",desc:"黑豆20g煮熟配桂圆3粒，暖宫活络，偏寒者宜。"}] },
  气郁质: { daily:["建立“情绪日记”，识别诱因；每天至少一次舒展与户外光照。","作息规律，晚间减少蓝光与信息摄入，留给身心“关机”时间。","饮食少胀气食物，细嚼慢咽，增加发酵乳品与膳食纤维。"], mood:["三步疏肝：运动(快走10分钟)→呼吸(4-4-6-2)→表达(写/说)。","边界感练习：用“拒绝句式模板”减少过量承诺。","每周安排一件“纯快乐小事”，主动产生活力。"], sports:[{title:"节律快走/舞动",desc:"配音乐行走或律动15~30分钟，帮助气机条达。"}, {title:"开胸舒展",desc:"门框拉伸、猫牛式、胸椎旋转各2~3组，缓解胸闷叹息。"}, {title:"呼吸冥想",desc:"5分钟计数呼吸，吸4-停2-呼6-停2，安神解郁。"}], teas:[{title:"玫瑰佛手陈皮茶",desc:"玫瑰3朵+佛手3g+陈皮1片，理气解郁、和胃。"}, {title:"苏叶薄荷绿茶",desc:"紫苏叶2g+薄荷1g+绿茶3g，清新提振、助气机升发(饭后饮)。"}, {title:"合欢皮甘麦大枣饮(简化)",desc:"合欢皮3g+甘草1g+红枣2枚，焖泡10分钟，宁心安神。"}] },
  特禀质: { daily:["减少已知过敏原暴露，外出戴口罩与眼镜，回家及时清洗鼻腔。","卧室勤换洗、除螨与通风；梅雨时段注意除湿。","运动后及时擦汗换衣，避免冷热骤变刺激。"], mood:["面对过敏的不确定性，练习接纳式专注(ACT)以降低焦虑。","准备“发作应对卡片”：症状→自救步骤→就医指征。","建立规律运动与睡眠，提高免疫稳态。"], sports:[{title:"中等强度有氧",desc:"步行/骑行/游泳30分钟，选择低过敏环境，规律进行。"}, {title:"鼻-肺功能辅助",desc:"缩唇呼吸+鼻呼吸训练各5分钟，改善通气。"}, {title:"温和力量训练",desc:"每周2次，提高基础免疫稳态与体能储备。"}], teas:[{title:"玉屏风茶(简化)",desc:"黄芪8g+白术5g+防风3g 小火煮10分钟，固表益气(非急性期)。"}, {title:"桑菊薄荷茶",desc:"桑叶3g+菊花3g+薄荷1g，清宣肺卫、缓解喷嚏流涕。"}, {title:"紫苏陈皮姜饮",desc:"紫苏叶2g+陈皮1片+姜2片，散寒解表、和胃。"}] },
};

function transformScore(sum: number, count: number) {
  if (!count) return 0;
  return Math.round(((sum - count) / (count * 4)) * 1000) / 10;
}
function judgeOthers(score: number) {
  if (score >= 40) return "是";
  if (score >= 30) return "倾向是";
  return "否";
}
const RadioRow: React.FC<{ value: number; onChange: (n: number) => void }> = ({ value, onChange }) => (
  <div className="grid grid-cols-5 gap-2 text-center text-sm">
    {[1,2,3,4,5].map((n)=>(
      <button key={n} className={`border rounded p-2 hover:bg-gray-100 ${value===n?"bg-blue-50 border-blue-500":""}`} onClick={()=>onChange(n)}>
        {value===n?"●":""}
      </button>
    ))}
  </div>
);

export default function App() {
  const types = Object.keys(Q) as BodyType[];
  const [answers, setAnswers] = useState<Record<BodyType, number[]>>(
    Object.fromEntries(types.map((t) => [t, Array(Q[t].length).fill(1)])) as any
  );
  const [intro, setIntro] = useState(true);
  const { sums, transforms, summary } = useMemo(() => {
    const sums: Record<BodyType, number> = {} as any;
    const transforms: Record<BodyType, number> = {} as any;
    (Object.keys(Q) as BodyType[]).forEach((t) => {
      const arr = answers[t];
      const sum = arr.reduce((a, b) => a + b, 0);
      sums[t] = sum;
      transforms[t] = transformScore(sum, arr.length);
    });
    const othersAvg = (
      Object.entries(transforms)
        .filter(([k]) => k !== "平和质")
        .reduce((a, [, v]) => a + v, 0) / 8
    );
    let heping: "是" | "基本是" | "否" = "否";
    if (transforms["平和质"] >= 60 && othersAvg < 30) heping = "是";
    else if (transforms["平和质"] >= 60 && othersAvg < 40) heping = "基本是";
    const summary = Object.fromEntries(
      (Object.keys(Q) as BodyType[]).map((t) => [
        t,
        t === "平和质" ? heping : judgeOthers(transforms[t]),
      ])
    ) as Record<BodyType, string>;
    return { sums, transforms, summary };
  }, [answers]);

  const strongTypes = useMemo(() => {
    const list = (Object.keys(Q) as BodyType[])
      .filter((t) => t !== "平和质")
      .filter((t) => transforms[t] >= 40)
      .sort((a, b) => transforms[b] - transforms[a]);
    return list.slice(0, 2);
  }, [answers]);

  const generatingRef = useRef(false);
  async function generatePoster() {
    if (generatingRef.current) return; generatingRef.current = true;
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48; let y = margin;
      doc.setFontSize(20); doc.text("九型体质自测结果", margin, y); y += 28;
      doc.setFontSize(10); doc.text(new Date().toLocaleString(), margin, y); y += 18;
      const top = strongTypes.length ? strongTypes : (["平和质"] as BodyType[]);
      doc.setFontSize(14); doc.text("主要体质：", margin, y); y += 18;
      top.forEach((t, idx)=>{ doc.text(`${idx+1}. ${t}（${transforms[t]}%）`, margin+12, y); y += 16; });
      y += 8; doc.setFontSize(12); doc.text("核心建议：", margin, y); y += 16;
      const t = top[0];
      ["daily","mood"].forEach((k,i)=>{
        const arr = (Advice as any)[t][k].slice(0, i?1:2);
        arr.forEach((s:string)=>{ doc.text(`• ${s}`, margin+12, y, { maxWidth: 360 }); y += 16; });
      });
      const qrDataUrl = await QRCode.toDataURL(SITE_URL, { margin: 1, width: 180 });
      doc.setFontSize(10); doc.text("扫码进入网页测试：", 400, margin+12);
      doc.addImage(qrDataUrl, "PNG", 400, margin+24, 150, 150);
      doc.text(SITE_URL.replace(/^https?:\\/\\//, ""), 400, margin+186);
      doc.setFontSize(9); doc.text("* 本工具不替代临床诊疗；孕期、慢性病、服药者请先咨询医生/中医师。", margin, 812);
      doc.save("体质自测-结果海报.pdf");
    } finally { generatingRef.current = false; }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-1">九型体质自测与个性化建议</h1>
      <p className="text-gray-500 mb-4">每题 1~5 分：1=没有；2=很少；3=有时；4=经常；5=总是。</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-6">
          {(Object.keys(Q) as BodyType[]).map((t) => (
            <div key={t} className="bg-white border rounded-xl p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">{t}</h2>
                <div className="text-sm text-gray-500">转化分：{transformScore(sums[t], Q[t].length)}%</div>
              </div>
              <hr className="my-3" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Q[t].map((q, i) => (
                  <div key={i} className="space-y-2">
                    <label className="text-sm">{i + 1}. {q}</label>
                    <RadioRow
                      value={answers[t][i]}
                      onChange={(n) => setAnswers((prev)=>({ ...prev, [t]: prev[t].map((v,idx)=> idx===i? n: v) }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">体质判定</h3>
              <button className="text-sm border rounded px-3 py-1 hover:bg-gray-50" onClick={generatePoster}>生成PDF海报</button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(Q) as BodyType[]).map((t) => (
                <div key={t} className="p-2 border rounded">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{t}</div>
                    <div className="text-sm text-gray-500">{transforms[t]}%</div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded mt-2">
                    <div className="h-2 bg-blue-500 rounded" style={{ width: Math.min(100, Math.max(0, transforms[t])) + "%" }} />
                  </div>
                  <div className="text-xs mt-1">判定：{summary[t]}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-2">建议优先顺序</h3>
            <ol className="list-decimal list-inside space-y-1">
              {(strongTypes.length? strongTypes : (["平和质"] as BodyType[])).map((t) => (
                <li key={t}>{t}（{transforms[t]}%）</li>
              ))}
            </ol>
            <hr className="my-2"/>
            <div className="text-sm text-gray-500">
              <div className="font-medium mb-1">扫一扫继续测评</div>
              <img alt="qrcode" className="w-40 h-40"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(SITE_URL)}`}/>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-8">
        {(strongTypes.length ? strongTypes : (["平和质"] as BodyType[])).map((t) => (
          <div key={t} className="space-y-3">
            <h3 className="text-xl font-semibold">{t}：日常与情志建议</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="font-medium mb-1">日常起居</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {Advice[t].daily.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="font-medium mb-1">情志调摄</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {Advice[t].mood.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            <div>
              <div className="font-medium mb-2">运动建议</div>
              <div className="grid md:grid-cols-3 gap-4">
                {Advice[t].sports.map((sp, i) => (
                  <div key={i} className="bg-white border rounded-xl p-4 shadow-sm h-full">
                    <div className="font-semibold mb-1">{sp.title}</div>
                    <p className="text-sm text-gray-500">{sp.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="font-medium mb-2">茶饮建议</div>
              <div className="grid md:grid-cols-3 gap-4">
                {Advice[t].teas.map((te, i) => (
                  <div key={i} className="bg-white border rounded-xl p-4 shadow-sm h-full">
                    <div className="font-semibold mb-1">{te.title}</div>
                    <p className="text-sm text-gray-500">{te.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {intro && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 md:p-6 shadow-xl">
            <div className="text-lg font-semibold mb-2">使用前提示</div>
            <div className="space-y-2 text-sm leading-6">
              <p>本工具基于九型体质常见问卷与生活化建议，<b>仅用于健康管理与科普</b>，不作为临床诊断与治疗依据。</p>
              <ul className="list-disc list-inside">
                <li>孕期、哺乳期、慢性病或正在服药者，请先咨询医生/中医师。</li>
                <li>对某些药食同源或茶饮原料过敏者，请勿使用相关配方。</li>
                <li>外感发热、腹泻等急性期，请暂缓温补/辛散类饮品。</li>
              </ul>
              <p className="text-gray-500">点击“我已知晓，开始测评”即代表你同意以上说明。</p>
              <div className="flex justify-end gap-2 pt-2">
                <button className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={()=>setIntro(false)}>我已知晓，开始测评</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}