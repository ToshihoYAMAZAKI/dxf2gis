import { useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

export function App() {
  const [sourceText, setSourceText] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // 変換元の始点・終点
  const [srcStartX, setSrcStartX] = useState<string>('0');
  const [srcStartY, setSrcStartY] = useState<string>('0');
  const [srcEndX, setSrcEndX] = useState<string>('100');
  const [srcEndY, setSrcEndY] = useState<string>('0');

  // 変換先の始点・終点
  const [dstStartX, setDstStartX] = useState<string>('50');
  const [dstStartY, setDstStartY] = useState<string>('50');
  const [dstEndX, setDstEndX] = useState<string>('150');
  const [dstEndY, setDstEndY] = useState<string>('150');

  // 1. DXFファイルを開く
  const handleOpenDxf = async () => {
    try {
      const selectedPath = await open({
        multiple: false,
        filters: [{ name: 'DXF Files', extensions: ['dxf'] }],
      });

      if (!selectedPath || typeof selectedPath !== 'string') return;

      const content = await invoke<string>('read_dxf_text', {
        filePath: selectedPath,
      });
      setSourceText(content);
      setResultText('');
      setStatusMessage(`読み込み完了: ${selectedPath}`);

    } catch (error) {
      console.error('DXF読み込みエラー:', error);
    }
  };

  // 2. 変換を実行する
  const handleTransform = async () => {
    if (!sourceText) {
      setStatusMessage('先にDXFファイルを開いてください。');
      return;
    }

    const sourceLine = {
      start: { x: parseFloat(srcStartX), y: parseFloat(srcStartY) },
      end: { x: parseFloat(srcEndX), y: parseFloat(srcEndY) },
    };

    const targetLine = {
      start: { x: parseFloat(dstStartX), y: parseFloat(dstStartY) },
      end: { x: parseFloat(dstEndX), y: parseFloat(dstEndY) },
    };

    // 数値チェック
    if (
      [
        sourceLine.start.x,
        sourceLine.start.y,
        sourceLine.end.x,
        sourceLine.end.y,
        targetLine.start.x,
        targetLine.start.y,
        targetLine.end.x,
        targetLine.end.y,
      ].some(isNaN)
    ) {
      setStatusMessage('座標には有効な数値を入力してください。');
      return;
    }

    try {
      const transformed = await invoke<string>('transform_dxf_text', {
        dxfContent: sourceText,
        sourceLine,
        targetLine,
      });
      setResultText(transformed);
      setStatusMessage('変換が完了しました。');
    } catch (error) {
      console.error('バックエンド処理エラー:', error);
    }
  };

  // 3. 変換後のファイルを保存する
  const handleSaveDxf = async () => {
    if (!resultText) {
      setStatusMessage('保存する変換後データがありません。');
      return;
    }

    try {
      const savePath = await save({
        filters: [{ name: 'DXF Files', extensions: ['dxf'] }],
        defaultPath: 'transformed.dxf',
      });

      if (!savePath) return;

      const msg = await invoke<string>('save_dxf_text', {
        filePath: savePath,
        content: resultText,
      });
      setStatusMessage(`${msg}: ${savePath}`);

    } catch (error) {
      console.error('保存エラー:', error);
    }
  };

// 共通の読み取り専用ボックスのスタイル
  // const viewerStyle: React.CSSProperties = {
  //   width: '100%',
  //   height: '40vh',
  //   border: '1px solid #ccc',
  //   borderRadius: '4px',
  //   padding: '10px',
  //   overflow: 'auto',
  //   whiteSpace: 'pre-wrap',
  //   fontFamily: 'monospace',
  //   fontSize: '12px',
  //   wordBreak: 'break-all',
  //   backgroundColor: '#f9f9f9',
  //   boxSizing: 'border-box',
  // };

  // const inputStyle: React.CSSProperties = {
  //   width: '80px',
  //   marginLeft: '4px',
  //   marginRight: '12px',
  // };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>DXF 座標変換ツール</h2>

      {/* 上部操作ボタン */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button onClick={handleOpenDxf} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          DXFファイルを開く
        </button>
        <button onClick={handleTransform} style={{ padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}>
          変換を実行する
        </button>
        <button onClick={handleSaveDxf} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          変換後のファイルを保存する
        </button>
      </div>

      {/* ステータスメッセージ */}
      {statusMessage && (
        <div style={{ marginBottom: '16px', padding: '8px', backgroundColor: '#f0f4f8', borderRadius: '4px' }}>
          {statusMessage}
        </div>
      )}

      {/* 座標入力エリア */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* 変換元の座標 */}
        <fieldset style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <legend style={{ fontWeight: 'bold' }}>変換元の基準線</legend>
          <div style={{ marginBottom: '8px' }}>
            <label>始点 X: </label>
            <input type="number" value={srcStartX} onChange={(e) => setSrcStartX(e.target.value)} style={{ width: '80px', marginRight: '12px' }} />
            <label>始点 Y: </label>
            <input type="number" value={srcStartY} onChange={(e) => setSrcStartY(e.target.value)} style={{ width: '80px' }} />
          </div>
          <div>
            <label>終点 X: </label>
            <input type="number" value={srcEndX} onChange={(e) => setSrcEndX(e.target.value)} style={{ width: '80px', marginRight: '12px' }} />
            <label>終点 Y: </label>
            <input type="number" value={srcEndY} onChange={(e) => setSrcEndY(e.target.value)} style={{ width: '80px' }} />
          </div>
        </fieldset>

        {/* 変換先の座標 */}
        <fieldset style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}>
          <legend style={{ fontWeight: 'bold' }}>変換先の基準線</legend>
          <div style={{ marginBottom: '8px' }}>
            <label>始点 X: </label>
            <input type="number" value={dstStartX} onChange={(e) => setDstStartX(e.target.value)} style={{ width: '80px', marginRight: '12px' }} />
            <label>始点 Y: </label>
            <input type="number" value={dstStartY} onChange={(e) => setDstStartY(e.target.value)} style={{ width: '80px' }} />
          </div>
          <div>
            <label>終点 X: </label>
            <input type="number" value={dstEndX} onChange={(e) => setDstEndX(e.target.value)} style={{ width: '80px', marginRight: '12px' }} />
            <label>終点 Y: </label>
            <input type="number" value={dstEndY} onChange={(e) => setDstEndY(e.target.value)} style={{ width: '80px' }} />
          </div>
        </fieldset>
      </div>

      {/* DXFテキスト表示エリア（2列） */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
            読み込んだDXFファイル
          </label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={20}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
            placeholder="「DXFファイルを開く」を押すと内容が表示されます"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
            変換後のDXFファイル
          </label>
          <textarea
            value={resultText}
            onChange={(e) => setResultText(e.target.value)}
            rows={20}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
            placeholder="「変換を実行する」を押すと変換結果が表示されます"
          />
        </div>
      </div>
    </div>
  );
}

export default App;
