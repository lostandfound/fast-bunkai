fn main() {
    // napi-rs build configuration (only when node feature is enabled)
    #[cfg(feature = "node")]
    {
        napi_build::setup();
    }
    
    // PyO3 doesn't require build.rs configuration
    // maturin handles the Python extension build
}

