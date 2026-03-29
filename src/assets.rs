use rust_embed::RustEmbed;

/// Embeds all files from `template/dist/` at compile time.
#[derive(RustEmbed)]
#[folder = "template/dist/"]
pub struct FrontendAssets;
