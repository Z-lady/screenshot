use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Serialize)]
pub struct DisplayInfo {
    pub id: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
}

#[derive(Debug, Error)]
pub enum CaptureError {
    #[error("The platform backend is not implemented yet")]
    Unsupported,
}

impl CaptureError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Unsupported => "BACKEND_UNAVAILABLE",
        }
    }
}

pub trait CaptureBackend {
    fn name(&self) -> &'static str;

    fn list_displays(
        &self
    ) -> Result<Vec<DisplayInfo>, CaptureError>;
}

#[derive(Default)]
pub struct UnsupportedBackend;

impl CaptureBackend for UnsupportedBackend {
    fn name(&self) -> &'static str {
        "unsupported-skeleton"
    }

    fn list_displays(
        &self
    ) -> Result<Vec<DisplayInfo>, CaptureError> {
        Err(CaptureError::Unsupported)
    }
}
