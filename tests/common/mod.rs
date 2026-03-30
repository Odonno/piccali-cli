use assert_cmd::Command;

/// Helper to build a Command for the piccali-cli binary.
pub fn piccali() -> Command {
    Command::cargo_bin("piccali-cli").expect("binary not found")
}
