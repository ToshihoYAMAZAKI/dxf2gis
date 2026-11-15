import { useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
// import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

export default function App() {
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

  // const [dxfContent, setDxfContent] = useState<string>("");
  // const [resultDxf, setResultDxf] = useState<string>("");

  // アフィン変換パラメータのState
  // const [scaleX, setScaleX] = useState<number>(1.0);
  // const [scaleY, setScaleY] = useState<number>(1.0);
  // const [angleDeg, setAngleDeg] = useState<number>(0.0);
  // const [tx, setTx] = useState<number>(0.0);
  // const [ty, setTy] = useState<number>(0.0);

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

      // if (typeof selectedPath === 'string') {
      //   // const content = await readTextFile(selectedPath);
      //   const content = await invoke<string>('load_file_content', { path: selectedPath });
      //   setDxfContent(content);
      //   setResultDxf('');
      // }
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

    // if (!dxfContent) return;
    // try {
    //   const output = await invoke<string>('transform_dxf_lines', {
    //     content: dxfContent,
    //     params: {
    //       scale_x: Number(scaleX),
    //       scale_y: Number(scaleY),
    //       angle_deg: Number(angleDeg),
    //       tx: Number(tx),
    //       ty: Number(ty),
    //     },
    //   });
    //   setResultDxf(output);

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

    // if (!resultDxf) return;
    // try {
    //   const savePath = await save({
    //     defaultPath: 'transformed.dxf',
    //     filters: [{ name: 'DXF Files', extensions: ['dxf'] }],
    //   });
    //   if (savePath) {
    //     // await writeTextFile(savePath, resultContent);
    //     await invoke("save_file_content", { path: savePath, content: resultDxf });
    //     alert('DXFファイルを保存しました');
    //   }

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

  // return (
  //   <main className="container">
  //     <h1>DXF file to GIS Coordinates</h1>
  //     <div style={{ padding: '20px' }}>
  //       {/* 操作ボタンエリア */}
  //       <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
  //         <button onClick={handleOpenDxf}>DXFファイルを開く</button>
  //         <button onClick={handleTransform} disabled={!dxfContent}>
  //           座標の変換を実行
  //         </button>
  //         <button onClick={handleSaveDxf} disabled={!resultDxf}>
  //           結果を別ファイルに保存
  //         </button>
  //       </div>

  //       {/* パラメータ入力エリア */}
  //       <div
  //         style={{
  //           marginBottom: '16px',
  //           padding: '12px',
  //           border: '1px solid #ddd',
  //           borderRadius: '4px',
  //           backgroundColor: '#fff',
  //         }}
  //       >
  //         <strong>変換パラメータ：</strong>
  //         <label>
  //           X倍率:
  //           <input
  //             type="number"
  //             step="0.1"
  //             value={scaleX}
  //             onChange={(e) => setScaleX(parseFloat(e.target.value) || 0)}
  //             style={inputStyle}
  //           />
  //         </label>
  //         <label>
  //           Y倍率:
  //           <input
  //             type="number"
  //             step="0.1"
  //             value={scaleY}
  //             onChange={(e) => setScaleY(parseFloat(e.target.value) || 0)}
  //             style={inputStyle}
  //           />
  //         </label>
  //         <label>
  //           回転角(度):
  //           <input
  //             type="number"
  //             step="1"
  //             value={angleDeg}
  //             onChange={(e) => setAngleDeg(parseFloat(e.target.value) || 0)}
  //             style={inputStyle}
  //           />
  //         </label>
  //         <label>
  //           X移動:
  //           <input
  //             type="number"
  //             step="1"
  //             value={tx}
  //             onChange={(e) => setTx(parseFloat(e.target.value) || 0)}
  //             style={inputStyle}
  //           />
  //         </label>
  //         <label>
  //           Y移動:
  //           <input
  //             type="number"
  //             step="1"
  //             value={ty}
  //             onChange={(e) => setTy(parseFloat(e.target.value) || 0)}
  //             style={inputStyle}
  //           />
  //         </label>
  //       </div>

  //       {/* 左右2画面の表示エリア */}
  //       <div style={{ display: 'flex', gap: '20px' }}>
  //         {/* 左側：読み込んだファイル（読み取り専用） */}
  //         <div style={{ flex: 1 }}>
  //           <h3>元のDXFデータ（読み取り専用）</h3>
  //           <pre style={viewerStyle}>
  //             {dxfContent || 'DXFファイルを選択してください'}
  //           </pre>
  //         </div>

  //         {/* 右側：バックエンドの処理結果（別エリア） */}
  //         <div style={{ flex: 1 }}>
  //           <h3>変換後のDXFデータ</h3>
  //           <pre style={viewerStyle}>
  //             {resultDxf || 'ここに変換結果が表示されます'}
  //           </pre>
  //         </div>
  //       </div>
  //     </div>
  //   </main>
  // );
}

// export default App;
