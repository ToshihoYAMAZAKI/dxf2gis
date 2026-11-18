// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use dxf::entities::EntityType;
use dxf::{Drawing, Point};
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;
use std::fs;
use std::io::Cursor;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Point2D {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Line2D {
    pub start: Point2D,
    pub end: Point2D,
}

impl Line2D {
    pub fn length(&self) -> f64 {
        let dx = self.end.x - self.start.x;
        let dy = self.end.y - self.start.y;
        (dx * dx + dy * dy).sqrt()
    }

    pub fn angle(&self) -> f64 {
        let dx = self.end.x - self.start.x;
        let dy = self.end.y - self.start.y;
        dy.atan2(dx)
    }
}

pub struct SimilarityTransform {
    origin_from: Point2D,
    origin_to: Point2D,
    scale: f64,
    cos_theta: f64,
    sin_theta: f64,
    delta_deg: f64,
}

impl SimilarityTransform {
    pub fn from_lines(source: &Line2D, target: &Line2D) -> Result<Self, String> {
        let len_src = source.length();
        // let len_dst = target.length();

        if len_src == 0.0 {
            return Err("変換元の始点と終点が同じ座標（長さ0）のため変換できません".into());
        }

        // let scale = len_dst / len_src;
        let scale = 1.0 / 1000.0;
        let delta_theta = target.angle() - source.angle();

        Ok(Self {
            origin_from: source.start,
            origin_to: target.start,
            scale,
            cos_theta: delta_theta.cos(),
            sin_theta: delta_theta.sin(),
            delta_deg: delta_theta * 180.0 / PI,
        })
    }

    pub fn apply_to_xy(&self, x: f64, y: f64) -> (f64, f64) {
        let sx = x * self.scale;
        let sy = y * self.scale;

        let tx = sx - self.origin_from.x;
        let ty = sy - self.origin_from.y;

        let rx = tx * self.cos_theta - ty * self.sin_theta;
        let ry = tx * self.sin_theta + ty * self.cos_theta;

        (rx + self.origin_to.x, ry + self.origin_to.y)
    }

    pub fn apply_to_dxf_point(&self, p: &mut Point) {
        let (nx, ny) = self.apply_to_xy(p.x, p.y);
        p.x = nx;
        p.y = ny;
        p.z *= self.scale;
    }

    pub fn apply_to_angle_deg(&self, angle_deg: f64) -> f64 {
        (angle_deg + self.delta_deg).rem_euclid(360.0)
    }
}

#[derive(serde::Deserialize)]
pub struct AffineParams {
    pub scale_x: f64,
    pub scale_y: f64,
    pub angle_deg: f64, // 回転角（度）
    pub tx: f64,        // X平行移動
    pub ty: f64,        // Y平行移動
}

/// 1. DXFファイルをテキストとして読み込む
#[tauri::command]
fn read_dxf_text(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| format!("ファイル読込エラー: {}", e))
}
// async fn load_file_content(path: String) -> Result<String, String> {
//     fs::read_to_string(&path).map_err(|e| e.to_string())
// }

/// 2. DXFテキストを変換し、変換後のDXFテキストを返す
#[tauri::command]
fn transform_dxf_text(
    dxf_content: String,
    source_line: Line2D,
    target_line: Line2D,
) -> Result<String, String> {
    let mut cursor = Cursor::new(dxf_content.as_bytes());
    let mut drawing =
        Drawing::load(&mut cursor).map_err(|e| format!("DXFパースエラー: {}", e))?;

    let transform = SimilarityTransform::from_lines(&source_line, &target_line)?;

    for entity in drawing.entities_mut() {
        match entity.specific {
            EntityType::Line(ref mut line) => {
                transform.apply_to_dxf_point(&mut line.p1);
                transform.apply_to_dxf_point(&mut line.p2);
            }
            EntityType::LwPolyline(ref mut lwpoly) => {
                for vertex in &mut lwpoly.vertices {
                    let (nx, ny) = transform.apply_to_xy(vertex.x, vertex.y);
                    vertex.x = nx;
                    vertex.y = ny;
                }
            }
            EntityType::Polyline(ref mut poly) => {
                for vertex in poly.vertices_mut() {
                    transform.apply_to_dxf_point(&mut vertex.location);
                }
            }
            EntityType::Arc(ref mut arc) => {
                transform.apply_to_dxf_point(&mut arc.center);
                arc.radius *= transform.scale;
                arc.start_angle = transform.apply_to_angle_deg(arc.start_angle);
                arc.end_angle = transform.apply_to_angle_deg(arc.end_angle);
            }
            EntityType::Circle(ref mut circle) => {
                transform.apply_to_dxf_point(&mut circle.center);
                circle.radius *= transform.scale;
            }
            _ => {}
        }
    }

    // メモリ上のバッファにDXFを書き出して文字列に変換
    let mut out_buffer = Vec::new();
    drawing
        .save(&mut out_buffer)
        .map_err(|e| format!("DXF生成エラー: {}", e))?;

    String::from_utf8(out_buffer).map_err(|e| format!("UTF-8変換エラー: {}", e))
}

/// 3. 変換後のDXFテキストをファイルに保存する
#[tauri::command]
fn save_dxf_text(file_path: String, content: String) -> Result<String, String> {
    fs::write(&file_path, content).map_err(|e| format!("ファイル保存エラー: {}", e))?;
    Ok("保存が完了しました".into())
}
// async fn save_file_content(path: String, content: String) -> Result<(), String> {
//     fs::write(&path, content).map_err(|e| e.to_string())
// }

// #[tauri::command]
// fn process_text(content: String) -> String {
//     // ここにやりたい処理を書く（例：行数カウント＋大文字変換）
//     let line_count = content.lines().count();
//     let upper = content.to_uppercase();
    
//     format!("【処理完了：全 {} 行】\n\n{}", line_count, upper)
// }

// #[tauri::command]
// fn process_dxf_affine(content: String, params: AffineParams) -> Result<String, String> {
//     // 文字列からDXFを読み込む
//     let mut cursor = Cursor::new(content.as_bytes());
//     let drawing = Drawing::load(&mut cursor).map_err(|e| format!("DXFパースエラー: {}", e))?;

//     let mut output_lines = Vec::new();
//     output_lines.push("EntityType,Original_X,Original_Y,Transformed_X,Transformed_Y".to_string());

//     // エンティティごとにXY座標を抽出して変換（例：Point と Line）
//     for entity in drawing.entities() {
//         match &entity.specific {
//             EntityType::ModelPoint(pt) => {
//                 let (nx, ny) = transform_xy(pt.location.x, pt.location.y, &params);
//                 output_lines.push(format!(
//                     "POINT,{:.4},{:.4},{:.4},{:.4}",
//                     pt.location.x, pt.location.y, nx, ny
//                 ));
//             }
//             EntityType::Line(line) => {
//                 let (nx1, ny1) = transform_xy(line.p1.x, line.p1.y, &params);
//                 let (nx2, ny2) = transform_xy(line.p2.x, line.p2.y, &params);
//                 output_lines.push(format!(
//                     "LINE_START,{:.4},{:.4},{:.4},{:.4}",
//                     line.p1.x, line.p1.y, nx1, ny1
//                 ));
//                 output_lines.push(format!(
//                     "LINE_END,{:.4},{:.4},{:.4},{:.4}",
//                     line.p2.x, line.p2.y, nx2, ny2
//                 ));
//             }
//             // 必要に応じて LwPolyline, Circle, Arc などを追加
//             _ => {}
//         }
//     }
//     Ok(output_lines.join("\n"))
// }

// アフィン変換の計算
// fn transform_xy(x: f64, y: f64, p: &AffineParams) -> (f64, f64) {
//     let rad = p.angle_deg.to_radians();
//     let cos_a = rad.cos();
//     let sin_a = rad.sin();
//     // スケーリング -> 回転 -> 平行移動
//     let sx = x * p.scale_x;
//     let sy = y * p.scale_y;

//     let nx = sx * cos_a - sy * sin_a + p.tx;
//     let ny = sx * sin_a + sy * cos_a + p.ty;
//     (nx, ny)
// }

// #[tauri::command]
// fn transform_dxf_lines(content: String, params: AffineParams) -> Result<String, String> {
//     // 1. 元のDXFを読み込む
//     let mut cursor = Cursor::new(content.as_bytes());
//     let mut drawing = Drawing::load(&mut cursor)
//         .map_err(|e| format!("DXF読み込みエラー: {}", e))?;

//     // 2. 線分（LINE）要素のみ座標を書き換える
//     for entity in drawing.entities_mut() {
//         if let EntityType::Line(ref mut line) = entity.specific {
//             let (nx1, ny1) = transform_xy(line.p1.x, line.p1.y, &params);
//             let (nx2, ny2) = transform_xy(line.p2.x, line.p2.y, &params);

//             line.p1.x = nx1;
//             line.p1.y = ny1;
//             line.p2.x = nx2;
//             line.p2.y = ny2;
//         }
//     }

//     // 3. 変換後のDXFデータをメモリ上のバッファに書き出す
//     let mut out_buffer = Vec::new();
//     drawing
//         .save(&mut out_buffer)
//         .map_err(|e| format!("DXF生成エラー: {}", e))?;

//     // 4. UTF-8文字列としてフロントエンドへ返す
//     String::from_utf8(out_buffer)
//         .map_err(|e| format!("文字列変換エラー: {}", e))
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_dxf_text,
            transform_dxf_text,
            save_dxf_text
        ])
        // .plugin(tauri_plugin_dialog::init())
        // .plugin(tauri_plugin_fs::init())
        // .invoke_handler(tauri::generate_handler![process_text, load_file_content, save_file_content, process_dxf_affine, transform_dxf_lines])
        .invoke_handler(tauri::generate_handler![read_dxf_text, save_dxf_text, transform_dxf_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
