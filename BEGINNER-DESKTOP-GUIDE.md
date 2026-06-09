# Start Cap Desktop

You do not need Render or another hosting service to record and edit videos for yourself.

## Browser Preview Versus Desktop App

The VS Code browser preview is useful for viewing the interface, Course Library, Google Drive settings, and How To pages.

It cannot record your actual screen, microphone, camera, or system audio. Those features use Cap's native Tauri and Rust code and must run as a desktop application.

GitHub Codespaces also cannot access your computer screen. Use a local macOS or Windows computer for real recording.

## Before You Begin

Install these applications on your computer:

### macOS

1. Install [VS Code](https://code.visualstudio.com/).
2. Install the current [Node.js LTS](https://nodejs.org/).
3. Install [Rust](https://rustup.rs/).
4. Install Xcode Command Line Tools by opening Terminal once and entering `xcode-select --install`.
5. Download this Cap repository to your Mac and open its folder in VS Code.


## One-Time Setup

1. Open the local Cap folder in VS Code.
2. Select **Terminal** from the top menu.
3. Select **Run Task**.
4. Select **Cap: Start Here Guided Helper** if you want VS Code to explain what it sees.
5. Select **Terminal > Run Task** again.
6. Select **Cap: 1. First-Time Desktop Setup**.
7. Wait until VS Code says setup is complete.

You do not need to type a command.

## Start Cap

1. Select **Terminal > Run Task**.
2. Select **Cap: 2. Start Native Desktop App**.
3. Keep the task running.
4. The window named **Cap - Development** will open.
5. Allow screen recording, microphone, and camera permissions when requested.

On macOS, restart Cap after granting Screen Recording permission if macOS asks you to do so.

## Make Your First Recording

1. In Cap, select **Studio** mode.
2. Select **Display** to record your entire screen.
3. Choose a microphone or camera if you want them included.
4. Start recording.
5. Stop recording when finished.
6. Cap opens the real editor automatically.
7. Trim or edit the video, then select **Export**.
8. Choose a Course Library folder before exporting if desired.

## Build An App You Can Open Normally

1. Select **Terminal > Run Task**.
2. Select **Cap: 3. Build Installable Desktop App**.
3. Wait for the build to complete.
4. Open the `target/release/bundle` folder.
5. Install the generated macOS or Windows package.

After installation, you can open Cap like another desktop application without starting it from VS Code.
