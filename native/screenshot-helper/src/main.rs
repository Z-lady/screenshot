mod protocol;
mod backend;

use std::io::{self, BufRead, Write};

use backend::CaptureBackend;
use protocol::{Request, Response};

fn main() {
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    // This binary is the protocol skeleton for the final native helper.
    // The runnable Electron test project intentionally uses
    // ElectronDesktopCaptureProvider until platform backends are completed.
    let backend = backend::UnsupportedBackend::default();

    for line in stdin.lock().lines() {
        let response = match line {
            Ok(line) => {
                match serde_json::from_str::<Request>(&line) {
                    Ok(request) => handle(&backend, request),
                    Err(error) => Response::error(
                        None,
                        "INVALID_REQUEST",
                        error.to_string()
                    )
                }
            }
            Err(error) => Response::error(
                None,
                "STDIN_READ_FAILED",
                error.to_string()
            )
        };

        if let Ok(serialized) = serde_json::to_string(&response) {
            let _ = writeln!(stdout, "{serialized}");
            let _ = stdout.flush();
        }
    }
}

fn handle(
    backend: &dyn CaptureBackend,
    request: Request
) -> Response {
    match request.method.as_str() {
        "ping" => Response::success(
            Some(request.id),
            serde_json::json!({
                "pong": true,
                "backend": backend.name()
            })
        ),

        "listDisplays" => {
            match backend.list_displays() {
                Ok(displays) => Response::success(
                    Some(request.id),
                    serde_json::to_value(displays).unwrap()
                ),
                Err(error) => Response::error(
                    Some(request.id),
                    error.code(),
                    error.to_string()
                )
            }
        }

        _ => Response::error(
            Some(request.id),
            "METHOD_NOT_FOUND",
            format!(
                "Unknown method: {}",
                request.method
            )
        )
    }
}
