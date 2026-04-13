import { NextResponse } from 'next/server';

const BASE_URL = "https://api.neople.co.kr/df";

const OATH_NAME_MAP = {
  "그림자": "어둠에 잠긴 그림자 서약",
  "페어리": "태고의 페어리 서약",
  "황금": "이상이 담긴 황금 서약",
  "행운": "운명의 행운 서약",
  "자연": "근원에 닿은 자연 서약",
  "여우": "조화의 여우 서약",
  "마력": "경계의 마력 서약",
  "한계": "극복의 한계 서약",
  "무리": "결속된 무리 서약",
  "용투": "야망의 용투 서약",
  "발키리": "영전의 발키리 서약",
  "정화": "완전무결한 정화 서약"
};

function getGradeTier(pts) {
  if (pts >= 2550) return { rarity: "태초", tier: "" };
  const tiers = [
    { p: 2440, r: "에픽", t: "V" }, { p: 2355, r: "에픽", t: "IV" }, { p: 2270, r: "에픽", t: "III" }, { p: 2185, r: "에픽", t: "II" }, { p: 2100, r: "에픽", t: "I" },
    { p: 1990, r: "레전더리", t: "V" }, { p: 1905, r: "레전더리", t: "IV" }, { p: 1820, r: "레전더리", t: "III" }, { p: 1735, r: "레전더리", t: "II" }, { p: 1650, r: "레전더리", t: "I" },
    { p: 1540, r: "유니크", t: "V" }, { p: 1455, r: "유니크", t: "IV" }, { p: 1370, r: "유니크", t: "III" }, { p: 1285, r: "유니크", t: "II" }, { p: 1200, r: "유니크", t: "I" },
    { p: 1070, r: "레어", t: "V" }, { p: 990, r: "레어", t: "IV" }, { p: 910, r: "레어", t: "III" }, { p: 830, r: "레어", t: "II" }, { p: 750, r: "레어", t: "I" }
  ];
  for (let tier of tiers) { if (pts >= tier.p) return { rarity: tier.r, tier: tier.t }; }
  return { rarity: "등급 없음", tier: "" };
}

export async function POST(request) {
  try {
    const { server, charName, apiKey } = await request.json();
    if (!server || !charName || !apiKey) {
      return NextResponse.json({ success: false, error: "파라미터가 부족합니다." }, { status: 400 });
    }

    const dnfFetch = async (path) => {
      const url = `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}apikey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("네오플 API 연동 오류");
      return res.json();
    };

    // 1. Get Char ID
    const searchRes = await dnfFetch(`/servers/${server}/characters?characterName=${encodeURIComponent(charName)}`);
    if (!searchRes.rows || searchRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "캐릭터를 찾을 수 없습니다." });
    }
    const charId = searchRes.rows[0].characterId;

    // 2. Base Info
    const baseData = await dnfFetch(`/servers/${server}/characters/${charId}`);

    // 3. Equipment Info
    let rawSetPoints = 0, setName = "장비 세트명 없음";
    const equipData = await dnfFetch(`/servers/${server}/characters/${charId}/equip/equipment`);
    if (equipData && equipData.equipment) {
      equipData.equipment.forEach(item => {
        if (item.setItemName && setName === "장비 세트명 없음") setName = item.setItemName;
        if (item.setPoint) rawSetPoints += item.setPoint;
        if (item.tune) {
          let tunes = Array.isArray(item.tune) ? item.tune : [item.tune];
          tunes.forEach(t => { if (t.setPoint) rawSetPoints += t.setPoint; });
        }
      });
    }

    // 4. Oath Info
    let rawOathPoints = 0, oathSetName = "공용 서약";
    const oathData = await dnfFetch(`/servers/${server}/characters/${charId}/equip/oath`);
    if (oathData && oathData.oath) {
      const crystals = oathData.oath.crystal || [];
      let found = false;
      for (let c of crystals) {
        for (let k in OATH_NAME_MAP) { 
          if ((c.itemName || "").includes(k)) { 
            oathSetName = OATH_NAME_MAP[k]; found = true; break; 
          } 
        }
        if (found) break;
      }
      if (oathData.oath.info && oathData.oath.info.setPoint) rawOathPoints += oathData.oath.info.setPoint;
      crystals.forEach(c => {
        if (c.setPoint) rawOathPoints += c.setPoint;
        if (c.tune) {
          let tunes = Array.isArray(c.tune) ? c.tune : [c.tune];
          tunes.forEach(t => { if (t.setPoint) rawOathPoints += t.setPoint; });
        }
      });
    }

    // 5. Point Adjustment
    let finalSetPoints = rawSetPoints, finalOathPoints = rawOathPoints;
    if (rawSetPoints > 0 && rawSetPoints < 2550) {
      let needed = 2550 - rawSetPoints;
      if (rawOathPoints >= needed) { finalSetPoints += needed; finalOathPoints -= needed; }
      else { finalSetPoints += rawOathPoints; finalOathPoints = 0; }
    }
    const equipGradeTier = getGradeTier(finalSetPoints);
    const oathGradeTier = getGradeTier(finalOathPoints);
    const formatGrade = (g) => g.rarity === "등급 없음" ? "등급 없음" : (g.tier ? `${g.rarity} ${g.tier}` : g.rarity);

    // 던담 API는 차단되었으므로 외부 링크용 charId만 프론트로 넘깁니다.
    return NextResponse.json({
      success: true,
      id: `${server}_${charName}`,
      charId: charId,
      base: {
        server,
        jobGrowName: baseData.jobGrowName || "직업없음",
        level: baseData.level || 0,
        fame: baseData.fame || 0,
        adventureName: baseData.adventureName || "없음",
        charName: charName
      },
      equipment: {
        setName,
        points: finalSetPoints,
        gradeDesc: formatGrade(equipGradeTier),
        rarity: equipGradeTier.rarity
      },
      oath: {
        setName: oathSetName,
        points: finalOathPoints,
        gradeDesc: formatGrade(oathGradeTier),
        rarity: oathGradeTier.rarity
      }
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
