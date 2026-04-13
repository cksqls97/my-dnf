"use client";

import React, { useState, useEffect } from 'react';

const SERVER_LIST = [
  { id: "cain", name: "카인" },
  { id: "diregie", name: "디레지에" },
  { id: "siroco", name: "시로코" },
  { id: "prey", name: "프레이" },
  { id: "casillas", name: "카시야스" },
  { id: "hilder", name: "힐더" },
  { id: "anton", name: "안톤" },
  { id: "bakal", name: "바칼" }
];

export default function Home() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  const [characters, setCharacters] = useState([]);
  
  const [server, setServer] = useState('cain');
  const [charName, setCharName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiKey, setApiKeyState] = useState('');

  useEffect(() => {
    const key = localStorage.getItem("DNF_API_KEY") || "";
    setApiKeyState(key);
    if (!key) setShowSettings(true);
    setApiKeyInput(key);

    const saved = localStorage.getItem('DNF_CHARACTERS');
    if (saved) {
      try {
        setCharacters(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem("DNF_API_KEY", apiKeyInput);
    setApiKeyState(apiKeyInput);
    setShowSettings(false);
  };

  const fetchCharacterData = async (srv, name) => {
    const res = await fetch('/api/character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: srv, charName: name, apiKey: apiKey })
    });
    return res.json();
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!charName.trim()) return;
    if (!apiKey) {
      alert("API KEY를 먼저 설정해주세요.");
      setShowSettings(true);
      return;
    }

    setIsAdding(true);
    const data = await fetchCharacterData(server, charName.trim());
    setIsAdding(false);

    if (!data.success) {
      alert(data.error);
      return;
    }

    // Check duplicate
    if (characters.some(c => c.id === data.id)) {
      alert("이미 등록된 캐릭터입니다.");
      return;
    }

    const newList = [...characters, data];
    setCharacters(newList);
    localStorage.setItem('DNF_CHARACTERS', JSON.stringify(newList));
    setCharName('');
  };

  const handleRefreshAll = async () => {
    if (characters.length === 0) return;
    setIsRefreshing(true);
    const updatedList = await Promise.all(
      characters.map(c => fetchCharacterData(c.base.server, c.base.charName))
    );
    const finalList = updatedList.map((res, i) => res.success ? res : characters[i]);
    setCharacters(finalList);
    localStorage.setItem('DNF_CHARACTERS', JSON.stringify(finalList));
    setIsRefreshing(false);
  };

  const handleDelete = (id) => {
    const newList = characters.filter(c => c.id !== id);
    setCharacters(newList);
    localStorage.setItem('DNF_CHARACTERS', JSON.stringify(newList));
  };

  const formatNumber = (num) => {
    if(typeof num === 'number') {
      if(num >= 100000000) return (num / 100000000).toFixed(2) + "억";
      if(num >= 10000) return (num / 10000).toFixed(0) + "만";
    }
    return num;
  };

  const getTierClass = (rarity) => {
    if(rarity === '태초') return 'tier-태초';
    if(rarity === '에픽') return 'tier-에픽';
    if(rarity === '레전더리') return 'tier-레전더리';
    if(rarity === '유니크') return 'tier-유니크';
    if(rarity === '레어') return 'tier-레어';
    return '';
  };

  return (
    <div>
      <header className="app-header">
        <h1 className="title">DNF Info Manager</h1>
        <button onClick={() => setShowSettings(true)}>⚙️ API 설정</button>
      </header>

      <section className="glass-panel" style={{ marginBottom: '2rem' }}>
        <form className="add-form" onSubmit={handleAdd}>
          <select value={server} onChange={e => setServer(e.target.value)}>
            {SERVER_LIST.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input 
            type="text" 
            placeholder="캐릭터명 입력" 
            value={charName} 
            onChange={e => setCharName(e.target.value)} 
          />
          <button type="submit" disabled={isAdding}>
            {isAdding ? <div className="loader"/> : "캐릭터 추가"}
          </button>
          
          <div style={{ marginLeft: 'auto' }}>
             <button type="button" onClick={handleRefreshAll} disabled={isRefreshing || characters.length === 0} style={{ background: '#475569' }}>
               {isRefreshing ? <div className="loader"/> : "🔄 전체 갱신"}
             </button>
          </div>
        </form>
      </section>

      <section className="glass-panel table-wrapper">
        {characters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            상단의 폼을 이용해 관리할 캐릭터를 추가해주세요.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>서버</th>
                <th>직업</th>
                <th>캐릭터명</th>
                <th>모험단</th>
                <th>명성</th>
                <th>장비 (점수)</th>
                <th>서약 (점수)</th>
                <th>던담 링크</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {characters.map(c => (
                <tr key={c.id}>
                  <td>{SERVER_LIST.find(s => s.id === c.base.server)?.name || c.base.server}</td>
                  <td>{c.base.jobGrowName}</td>
                  <td style={{ fontWeight: 'bold' }}>{c.base.charName}</td>
                  <td>{c.base.adventureName}</td>
                  <td style={{ color: '#fbbf24', fontWeight: 'bold' }}>{c.base.fame.toLocaleString()}</td>
                  <td>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{c.equipment.setName}</div>
                    <div className={getTierClass(c.equipment.rarity)}>
                      {c.equipment.gradeDesc} ({c.equipment.points})
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{c.oath.setName}</div>
                    <div className={getTierClass(c.oath.rarity)}>
                      {c.oath.gradeDesc} ({c.oath.points})
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {c.charId ? (
                      <a 
                        href={`https://dundam.xyz/character?server=${c.base.server}&character=${c.charId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold' }}
                      >
                        조회 🔗
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td>
                    <button type="button" className="danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleDelete(c.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showSettings && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h2 style={{ marginTop: 0 }}>API 키 설정</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              네오플 오픈 API 키를 입력해주세요.<br/>이 키는 브라우저 저장소에만 남으며 매 조회 시 백엔드로 안전하게 전달됩니다.
            </p>
            <input 
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: '1.5rem' }}
              type="password" 
              placeholder="API KEY" 
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {apiKey && (
                <button type="button" onClick={() => setShowSettings(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)' }}>
                  취소
                </button>
              )}
              <button type="button" onClick={handleSaveSettings}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
